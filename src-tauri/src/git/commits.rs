use anyhow::Result;
use git2::{Oid, Repository, Sort};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub id: String,
    pub short_id: String,
    pub message: String,
    pub summary: String,
    pub author_name: String,
    pub author_email: String,
    pub author_time: i64,
    pub committer_name: String,
    pub committer_email: String,
    pub committer_time: i64,
    pub parent_ids: Vec<String>,
}

/// Returns the commit graph as a list (newest-first). `max` limits output.
pub fn get_log(path: &str, max: Option<usize>) -> Result<Vec<CommitInfo>> {
    let repo = Repository::open(path)?;
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)?;

    let limit = max.unwrap_or(1000);
    let mut commits = Vec::with_capacity(limit);

    for oid in revwalk.take(limit) {
        let oid = oid?;
        let commit = repo.find_commit(oid)?;
        commits.push(commit_to_info(&commit));
    }

    Ok(commits)
}

pub fn get_commit(path: &str, id: &str) -> Result<CommitInfo> {
    let repo = Repository::open(path)?;
    let oid = Oid::from_str(id)?;
    let commit = repo.find_commit(oid)?;
    Ok(commit_to_info(&commit))
}

pub fn cherry_pick(path: &str, id: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let oid = Oid::from_str(id)?;
    let commit = repo.find_commit(oid)?;
    repo.cherrypick(&commit, None)?;
    Ok(())
}

pub fn revert_commit(path: &str, id: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let oid = Oid::from_str(id)?;
    let commit = repo.find_commit(oid)?;
    repo.revert(&commit, None)?;
    Ok(())
}

fn commit_to_info(commit: &git2::Commit) -> CommitInfo {
    let id = commit.id().to_string();
    let short_id = id[..8].to_string();
    let message = commit.message().unwrap_or("").to_string();
    let summary = commit.summary().unwrap_or("").to_string();
    let author = commit.author();
    let committer = commit.committer();
    let parent_ids = (0..commit.parent_count())
        .map(|i| commit.parent_id(i).map(|o| o.to_string()).unwrap_or_default())
        .collect();

    CommitInfo {
        id,
        short_id,
        message,
        summary,
        author_name: author.name().unwrap_or("").to_string(),
        author_email: author.email().unwrap_or("").to_string(),
        author_time: author.when().seconds(),
        committer_name: committer.name().unwrap_or("").to_string(),
        committer_email: committer.email().unwrap_or("").to_string(),
        committer_time: committer.when().seconds(),
        parent_ids,
    }
}
