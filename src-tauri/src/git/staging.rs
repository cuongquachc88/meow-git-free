use anyhow::{anyhow, Result};
use git2::{IndexAddOption, Repository, Status, StatusOptions};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStatus {
    pub path: String,
    pub status: Vec<String>,
    pub is_staged: bool,
}

pub fn get_status(path: &str) -> Result<Vec<FileStatus>> {
    let repo = Repository::open(path)?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);

    let statuses = repo.statuses(Some(&mut opts))?;
    let mut result = Vec::new();

    for entry in statuses.iter() {
        let file_path = entry.path().unwrap_or("").to_string();
        let s = entry.status();
        let mut status_labels = Vec::new();
        let mut is_staged = false;

        if s.contains(Status::INDEX_NEW) {
            status_labels.push("added".to_string());
            is_staged = true;
        }
        if s.contains(Status::INDEX_MODIFIED) {
            status_labels.push("modified".to_string());
            is_staged = true;
        }
        if s.contains(Status::INDEX_DELETED) {
            status_labels.push("deleted".to_string());
            is_staged = true;
        }
        if s.contains(Status::INDEX_RENAMED) {
            status_labels.push("renamed".to_string());
            is_staged = true;
        }
        if s.contains(Status::WT_NEW) {
            status_labels.push("untracked".to_string());
        }
        if s.contains(Status::WT_MODIFIED) {
            status_labels.push("modified".to_string());
        }
        if s.contains(Status::WT_DELETED) {
            status_labels.push("deleted".to_string());
        }
        if s.contains(Status::CONFLICTED) {
            status_labels.push("conflicted".to_string());
        }

        result.push(FileStatus {
            path: file_path,
            status: status_labels,
            is_staged,
        });
    }

    Ok(result)
}

pub fn stage_file(path: &str, file: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut index = repo.index()?;
    index.add_path(std::path::Path::new(file))?;
    index.write()?;
    Ok(())
}

pub fn stage_all(path: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), IndexAddOption::DEFAULT, None)?;
    index.write()?;
    Ok(())
}

pub fn unstage_file(path: &str, file: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let head = repo.head()?.peel_to_commit()?;
    let head_tree = head.tree()?;
    // Reset index entry to HEAD state
    repo.reset_default(Some(head_tree.as_object()), [file].iter())?;
    Ok(())
}

pub fn create_commit(path: &str, message: &str, amend: bool) -> Result<String> {
    let repo = Repository::open(path)?;
    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let sig = repo.signature()?;

    let parents: Vec<git2::Commit> = if amend {
        let head = repo
            .head()
            .map_err(|_| anyhow!("Cannot amend: repository has no commits"))?
            .peel_to_commit()?;
        if head.parent_count() == 0 {
            return Err(anyhow!("Cannot amend the initial commit"));
        }
        head.parents().collect()
    } else {
        match repo.head() {
            Ok(head) => vec![head.peel_to_commit()?],
            Err(_) => vec![],
        }
    };

    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)?;
    Ok(oid.to_string())
}

pub fn save_stash(path: &str, message: Option<&str>) -> Result<String> {
    let mut repo = Repository::open(path)?;
    let sig = repo.signature()?;
    let msg = message.unwrap_or("WIP on stash");
    let oid = repo.stash_save(&sig, msg, None)?;
    Ok(oid.to_string())
}

pub fn list_stashes(path: &str) -> Result<Vec<serde_json::Value>> {
    let mut repo = Repository::open(path)?;
    let mut stashes = Vec::new();
    repo.stash_foreach(|index, message, oid| {
        stashes.push(serde_json::json!({
            "index": index,
            "message": message,
            "id": oid.to_string()
        }));
        true
    })?;
    Ok(stashes)
}

pub fn pop_stash(path: &str, index: usize) -> Result<()> {
    let mut repo = Repository::open(path)?;
    repo.stash_pop(index, None)?;
    Ok(())
}

pub fn drop_stash(path: &str, index: usize) -> Result<()> {
    let mut repo = Repository::open(path)?;
    repo.stash_drop(index)?;
    Ok(())
}
