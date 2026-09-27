use anyhow::{anyhow, Result};
use git2::{MergeOptions, Repository};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictFile {
    pub path: String,
    pub ancestor: Option<String>,
    pub ours: Option<String>,
    pub theirs: Option<String>,
}

fn merge_annotated(repo: &Repository, annotated: git2::AnnotatedCommit, merge_label: &str) -> Result<bool> {
    let (analysis, _) = repo.merge_analysis(&[&annotated])?;

    if analysis.is_up_to_date() {
        return Ok(true);
    }

    if analysis.is_fast_forward() {
        let head = repo.head()?;
        let refname = head
            .name()
            .ok_or_else(|| anyhow!("Cannot fast-forward: detached HEAD"))?;
        let mut reference = repo.find_reference(refname)?;
        reference.set_target(annotated.id(), "fast-forward")?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
        return Ok(true);
    }

    let mut opts = MergeOptions::new();
    repo.merge(&[&annotated], Some(&mut opts), None)?;

    let index = repo.index()?;
    if index.has_conflicts() {
        return Ok(false);
    }

    let tree_id = repo.index()?.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    let sig = repo.signature()?;
    let head_commit = repo.head()?.peel_to_commit()?;
    let merge_commit = repo.find_commit(annotated.id())?;
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &format!("Merge branch '{}'", merge_label),
        &tree,
        &[&head_commit, &merge_commit],
    )?;

    repo.cleanup_state()?;
    Ok(true)
}

pub fn merge_branch(path: &str, branch_name: &str) -> Result<bool> {
    let repo = Repository::open(path)?;
    let branch_ref = repo.find_branch(branch_name, git2::BranchType::Local)?;
    let annotated = repo.reference_to_annotated_commit(branch_ref.get())?;
    merge_annotated(&repo, annotated, branch_name)
}

pub fn merge_ref(path: &str, ref_name: &str) -> Result<bool> {
    let repo = Repository::open(path)?;
    let obj = repo.revparse_single(ref_name)?;
    let commit = obj.peel_to_commit()?;
    let annotated = repo.find_annotated_commit(commit.id())?;
    merge_annotated(&repo, annotated, ref_name)
}

pub fn get_conflicts(path: &str) -> Result<Vec<ConflictFile>> {
    let repo = Repository::open(path)?;
    let index = repo.index()?;

    if !index.has_conflicts() {
        return Ok(vec![]);
    }

    let mut conflicts = Vec::new();
    for conflict in index.conflicts()? {
        let conflict = conflict?;
        let path = conflict
            .our
            .as_ref()
            .or(conflict.their.as_ref())
            .or(conflict.ancestor.as_ref())
            .and_then(|e| std::str::from_utf8(&e.path).ok().map(|s| s.to_string()))
            .unwrap_or_default();

        conflicts.push(ConflictFile {
            path,
            ancestor: None,
            ours: None,
            theirs: None,
        });
    }

    Ok(conflicts)
}

pub fn abort_merge(path: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    if repo.state() == git2::RepositoryState::Merge {
        repo.cleanup_state()?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
        Ok(())
    } else {
        Err(anyhow!("No merge in progress"))
    }
}

/// Reset HEAD to a ref. mode: "soft" | "mixed" | "hard"
pub fn reset_to_ref(path: &str, target_ref: &str, mode: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let obj = repo.revparse_single(target_ref)?;
    let reset_type = match mode {
        "soft" => git2::ResetType::Soft,
        "hard" => git2::ResetType::Hard,
        _ => git2::ResetType::Mixed,
    };
    repo.reset(&obj, reset_type, None)?;
    Ok(())
}

/// Rebase current branch onto target branch using git CLI (libgit2 rebase is limited)
pub fn rebase_onto(path: &str, onto_branch: &str) -> Result<()> {
    let output = std::process::Command::new("git")
        .args(["rebase", onto_branch])
        .current_dir(path)
        .output()?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(anyhow!("Rebase failed: {}", stderr.trim()))
    }
}
