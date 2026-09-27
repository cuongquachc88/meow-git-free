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

pub fn merge_branch(path: &str, branch_name: &str) -> Result<bool> {
    let repo = Repository::open(path)?;
    let branch_ref = repo.find_branch(branch_name, git2::BranchType::Local)?;
    let annotated = repo.reference_to_annotated_commit(branch_ref.get())?;

    let (analysis, _) = repo.merge_analysis(&[&annotated])?;

    if analysis.is_up_to_date() {
        return Ok(true);
    }

    if analysis.is_fast_forward() {
        let refname = format!("refs/heads/{}", branch_name);
        let mut reference = repo.find_reference(&refname)?;
        reference.set_target(annotated.id(), "fast-forward")?;
        repo.set_head(&refname)?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
        return Ok(true);
    }

    let mut opts = MergeOptions::new();
    repo.merge(&[&annotated], Some(&mut opts), None)?;

    // Check for conflicts
    let index = repo.index()?;
    if index.has_conflicts() {
        return Ok(false); // false = has conflicts
    }

    // Auto-commit if no conflicts
    let tree_id = repo.index()?.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    let sig = repo.signature()?;
    let head_commit = repo.head()?.peel_to_commit()?;
    let merge_commit = repo.find_commit(annotated.id())?;
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &format!("Merge branch '{}'", branch_name),
        &tree,
        &[&head_commit, &merge_commit],
    )?;

    repo.cleanup_state()?;
    Ok(true)
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
