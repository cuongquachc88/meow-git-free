use anyhow::Result;
use git2::{DiffOptions, Oid, Repository};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiff {
    pub old_path: Option<String>,
    pub new_path: Option<String>,
    pub hunks: Vec<DiffHunk>,
    pub is_binary: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffHunk {
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub origin: char,
    pub content: String,
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
}

/// Diff between working tree and index (unstaged changes for a file)
pub fn diff_workdir(path: &str, file: Option<&str>) -> Result<Vec<FileDiff>> {
    let repo = Repository::open(path)?;
    let mut opts = DiffOptions::new();
    if let Some(f) = file {
        opts.pathspec(f);
    }
    let diff = repo.diff_index_to_workdir(None, Some(&mut opts))?;
    parse_diff(diff)
}

/// Diff between HEAD and index (staged changes)
pub fn diff_staged(path: &str, file: Option<&str>) -> Result<Vec<FileDiff>> {
    let repo = Repository::open(path)?;
    let mut opts = DiffOptions::new();
    if let Some(f) = file {
        opts.pathspec(f);
    }
    let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    let diff = repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut opts))?;
    parse_diff(diff)
}

/// Diff for a specific commit vs its parent
pub fn diff_commit(path: &str, commit_id: &str) -> Result<Vec<FileDiff>> {
    let repo = Repository::open(path)?;
    let oid = Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let mut opts = DiffOptions::new();
    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))?;
    parse_diff(diff)
}

fn parse_diff(diff: git2::Diff) -> Result<Vec<FileDiff>> {
    let mut files: Vec<FileDiff> = Vec::new();

    diff.print(git2::DiffFormat::Patch, |delta, hunk, line| {
        let file_idx = delta.new_file().id().is_zero() as usize;
        let _ = file_idx;

        // Ensure we have an entry for this delta
        let old_path = delta
            .old_file()
            .path()
            .map(|p| p.to_string_lossy().to_string());
        let new_path = delta
            .new_file()
            .path()
            .map(|p| p.to_string_lossy().to_string());
        let is_binary = delta.new_file().is_binary();

        // Find or create FileDiff for this path
        let key = new_path.clone().or_else(|| old_path.clone()).unwrap_or_default();
        let file_diff = if let Some(f) = files.iter_mut().find(|f| {
            f.new_path.as_deref() == Some(&key) || f.old_path.as_deref() == Some(&key)
        }) {
            f
        } else {
            files.push(FileDiff {
                old_path,
                new_path,
                hunks: Vec::new(),
                is_binary,
            });
            files.last_mut().unwrap()
        };

        if let Some(h) = hunk {
            let header = String::from_utf8_lossy(h.header()).to_string();
            if file_diff.hunks.last().map(|hk| hk.header.as_str()) != Some(&header) {
                file_diff.hunks.push(DiffHunk {
                    header,
                    lines: Vec::new(),
                });
            }
        }

        let origin = line.origin();
        let content = String::from_utf8_lossy(line.content()).to_string();
        let old_lineno = line.old_lineno();
        let new_lineno = line.new_lineno();

        if let Some(hunk) = file_diff.hunks.last_mut() {
            hunk.lines.push(DiffLine {
                origin,
                content,
                old_lineno,
                new_lineno,
            });
        }

        true
    })?;

    Ok(files)
}
