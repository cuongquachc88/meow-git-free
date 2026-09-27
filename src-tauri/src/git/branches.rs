use anyhow::{anyhow, Result};
use git2::{BranchType, Repository};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    pub name: String,
    pub is_head: bool,
    pub kind: String,
    pub upstream: Option<String>,
    pub tip_id: Option<String>,
}

pub fn list_branches(path: &str) -> Result<Vec<BranchInfo>> {
    let repo = Repository::open(path)?;
    let mut branches = Vec::new();

    for branch_result in repo.branches(None)? {
        let (branch, kind) = branch_result?;
        let name = branch.name()?.unwrap_or("").to_string();
        let is_head = branch.is_head();
        let upstream = branch
            .upstream()
            .ok()
            .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));
        let tip_id = branch
            .get()
            .peel_to_commit()
            .ok()
            .map(|c| c.id().to_string());

        branches.push(BranchInfo {
            name,
            is_head,
            kind: format!("{:?}", kind),
            upstream,
            tip_id,
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
