use anyhow::Result;
use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
    pub push_url: Option<String>,
}

pub fn list_remotes(path: &str) -> Result<Vec<RemoteInfo>> {
    let repo = Repository::open(path)?;
    let mut result = Vec::new();

    for name in repo.remotes()?.iter().flatten() {
        let remote = repo.find_remote(name)?;
        result.push(RemoteInfo {
            name: name.to_string(),
            url: remote.url().unwrap_or("").to_string(),
            push_url: remote.pushurl().map(|s| s.to_string()),
        });
    }

    Ok(result)
}

pub fn add_remote(path: &str, name: &str, url: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    repo.remote(name, url)?;
    Ok(())
}

pub fn remove_remote(path: &str, name: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    repo.remote_delete(name)?;
    Ok(())
}

pub fn rename_remote(path: &str, old_name: &str, new_name: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    repo.remote_rename(old_name, new_name)?;
    Ok(())
}

pub fn fetch_remote(path: &str, remote_name: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut remote = repo.find_remote(remote_name)?;
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(default_credentials);
    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);
    remote.fetch::<&str>(&[], Some(&mut fetch_opts), None)?;
    Ok(())
}

fn default_credentials(
    _url: &str,
    username_from_url: Option<&str>,
    _allowed_types: git2::CredentialType,
) -> Result<git2::Cred, git2::Error> {
    // Try SSH agent first, then default credentials
    if let Some(username) = username_from_url {
        if let Ok(cred) = git2::Cred::ssh_key_from_agent(username) {
            return Ok(cred);
        }
    }
    git2::Cred::default()
}
