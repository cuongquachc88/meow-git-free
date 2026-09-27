use anyhow::Result;
use git2::{Repository, RepositoryInitOptions};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    pub path: String,
    pub name: String,
    pub head_branch: Option<String>,
    pub is_bare: bool,
    pub state: String,
}

pub fn open_repo(path: &str) -> Result<RepoInfo> {
    let repo = Repository::open(path)?;
    Ok(repo_to_info(&repo, path))
}

pub fn init_repo(path: &str, bare: bool) -> Result<RepoInfo> {
    let mut opts = RepositoryInitOptions::new();
    opts.bare(bare);
    let repo = Repository::init_opts(path, &opts)?;
    Ok(repo_to_info(&repo, path))
}

pub fn clone_repo(url: &str, path: &str) -> Result<RepoInfo> {
    let repo = git2::build::RepoBuilder::new().clone(url, Path::new(path))?;
    Ok(repo_to_info(&repo, path))
}

fn repo_to_info(repo: &Repository, path: &str) -> RepoInfo {
    let name = Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let head_branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()));

    let state = format!("{:?}", repo.state());

    RepoInfo {
        path: path.to_string(),
        name,
        head_branch,
        is_bare: repo.is_bare(),
        state,
    }
}
