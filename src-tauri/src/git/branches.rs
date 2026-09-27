use anyhow::{anyhow, Result};
use git2::{BranchType, Oid, Repository};
use serde::{Deserialize, Serialize};

fn branch_kind(kind: BranchType) -> &'static str {
    match kind {
        BranchType::Local => "Local",
        BranchType::Remote => "Remote",
    }
}

/// Compare local branch to upstream tracking, else to origin/branch or origin/main.
fn ahead_behind_vs_sync_ref(
    repo: &Repository,
    local_oid: Oid,
    branch_name: &str,
    upstream_branch: Option<&git2::Branch>,
) -> (Option<usize>, Option<usize>, Option<String>) {
    if let Some(upstream_b) = upstream_branch {
        if let Ok(upstream_id) = upstream_b.get().peel_to_commit().map(|c| c.id()) {
            if let Ok((a, b)) = repo.graph_ahead_behind(local_oid, upstream_id) {
                let name = upstream_b
                    .name()
                    .ok()
                    .flatten()
                    .map(|s| s.to_string());
                return (Some(a), Some(b), name);
            }
        }
    }

    let mut candidates: Vec<(String, String)> = vec![(
        format!("refs/remotes/origin/{branch_name}"),
        format!("origin/{branch_name}"),
    )];
    if branch_name != "main" && branch_name != "master" {
        candidates.push(("refs/remotes/origin/main".into(), "origin/main".into()));
        candidates.push(("refs/remotes/origin/master".into(), "origin/master".into()));
    }
    candidates.push(("refs/heads/main".into(), "main".into()));
    candidates.push(("refs/heads/master".into(), "master".into()));

    for (cref, label) in candidates {
        if let Ok(reference) = repo.find_reference(&cref) {
            if let Ok(upstream_id) = reference.peel_to_commit().map(|c| c.id()) {
                if upstream_id == local_oid {
                    continue;
                }
                if let Ok((a, b)) = repo.graph_ahead_behind(local_oid, upstream_id) {
                    return (Some(a), Some(b), Some(label));
                }
            }
        }
    }

    (None, None, None)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    pub name: String,
    pub is_head: bool,
    pub kind: String,
    pub upstream: Option<String>,
    pub tip_id: Option<String>,
    pub ahead: Option<usize>,
    pub behind: Option<usize>,
}

pub fn list_branches(path: &str) -> Result<Vec<BranchInfo>> {
    let repo = Repository::open(path)?;
    let mut branches = Vec::new();

    for branch_result in repo.branches(None)? {
        let (branch, kind) = branch_result?;
        let name = branch.name()?.unwrap_or("").to_string();
        let is_head = branch.is_head();
        let upstream_branch = branch.upstream().ok();
        let tip_id = branch
            .get()
            .peel_to_commit()
            .ok()
            .map(|c| c.id().to_string());

        let (ahead, behind, upstream) = if kind == BranchType::Local {
            if let Ok(local_id) = branch.get().peel_to_commit().map(|c| c.id()) {
                ahead_behind_vs_sync_ref(
                    &repo,
                    local_id,
                    &name,
                    upstream_branch.as_ref(),
                )
            } else {
                (None, None, None)
            }
        } else {
            (
                None,
                None,
                upstream_branch
                    .as_ref()
                    .and_then(|u| u.name().ok().flatten().map(|s| s.to_string())),
            )
        };

        branches.push(BranchInfo {
            name,
            is_head,
            kind: branch_kind(kind).to_string(),
            upstream,
            tip_id,
            ahead,
            behind,
        });
    }

    Ok(branches)
}

pub fn create_branch(path: &str, name: &str, from_ref: Option<&str>) -> Result<BranchInfo> {
    let repo = Repository::open(path)?;
    let commit = match from_ref {
        Some(r) => {
            let obj = repo.revparse_single(r)?;
            obj.peel_to_commit()?
        }
        None => {
            let head = repo.head()?;
            head.peel_to_commit()?
        }
    };
    let branch = repo.branch(name, &commit, false)?;
    let tip_id = branch
        .get()
        .peel_to_commit()
        .ok()
        .map(|c| c.id().to_string());

    Ok(BranchInfo {
        name: name.to_string(),
        is_head: false,
        kind: "Local".to_string(),
        upstream: None,
        tip_id,
        ahead: None,
        behind: None,
    })
}

pub fn checkout_branch(path: &str, name: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let (obj, reference) = repo.revparse_ext(name)?;
    repo.checkout_tree(&obj, None)?;
    match reference {
        Some(gref) => repo.set_head(gref.name().unwrap())?,
        None => repo.set_head_detached(obj.id())?,
    }
    Ok(())
}

pub fn delete_branch(path: &str, name: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut branch = repo
        .find_branch(name, BranchType::Local)
        .map_err(|_| anyhow!("Branch '{}' not found", name))?;
    branch.delete()?;
    Ok(())
}

pub fn rename_branch(path: &str, old_name: &str, new_name: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut branch = repo
        .find_branch(old_name, BranchType::Local)
        .map_err(|_| anyhow!("Branch '{}' not found", old_name))?;
    branch.rename(new_name, false)?;
    Ok(())
}
