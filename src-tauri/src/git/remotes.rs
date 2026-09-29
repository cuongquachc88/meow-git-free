use anyhow::Result;
use git2::{BranchType, Oid, Repository};
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::rc::Rc;

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

/// Create remote or replace its fetch/push URL (e.g. after creating repo on GitHub).
pub fn upsert_remote(path: &str, name: &str, url: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    if repo.find_remote(name).is_ok() {
        repo.remote_set_url(name, url)?;
        repo.remote_set_pushurl(name, Some(url))?;
    } else {
        repo.remote(name, url)?;
    }
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

/// HTTPS PAT auth for GitHub/GitLab — avoids libgit2 "authentication replays" when creds are wrong.
fn pat_https_username(remote_url: &str, username_from_url: Option<&str>, fallback: &str) -> String {
    let url = remote_url.to_ascii_lowercase();
    if url.contains("github.com") {
        return "x-access-token".to_string();
    }
    if url.contains("gitlab.com") || url.contains("gitlab.") {
        return "oauth2".to_string();
    }
    username_from_url
        .filter(|u| !u.is_empty())
        .unwrap_or(fallback)
        .to_string()
}

fn pat_credentials(
    remote_url: String,
    username: String,
    token: String,
) -> impl FnMut(&str, Option<&str>, git2::CredentialType) -> Result<git2::Cred, git2::Error> {
    use std::cell::Cell;
    let attempts = Cell::new(0u32);
    move |url, username_from_url, allowed| {
        let n = attempts.get();
        attempts.set(n + 1);
        if n > 0 {
            return Err(git2::Error::from_str(
                "HTTP authentication failed — check PAT (repo scope, not revoked/expired)",
            ));
        }
        if allowed.is_user_pass_plaintext() || allowed.is_default() {
            let user = pat_https_username(
                if url.is_empty() { &remote_url } else { url },
                username_from_url,
                &username,
            );
            git2::Cred::userpass_plaintext(&user, &token)
        } else if allowed.is_username() {
            git2::Cred::username(username_from_url.unwrap_or(&username))
        } else {
            Err(git2::Error::from_str("no supported HTTPS credential type"))
        }
    }
}

fn default_credentials(
    url: &str,
    username_from_url: Option<&str>,
    allowed_types: git2::CredentialType,
) -> Result<git2::Cred, git2::Error> {
    if allowed_types.is_ssh_key() || allowed_types.is_username() {
        if let Some(username) = username_from_url {
            if let Ok(cred) = git2::Cred::ssh_key_from_agent(username) {
                return Ok(cred);
            }
        }
    }
    if allowed_types.is_default() || allowed_types.is_user_pass_plaintext() {
        if let Ok(cred) = git2::Cred::default() {
            return Ok(cred);
        }
    }
    if allowed_types.is_user_pass_plaintext() {
        if let Some(username) = username_from_url {
            return git2::Cred::username(username);
        }
    }
    Err(git2::Error::from_str(&format!(
        "no credentials available for {url}"
    )))
}

/// Fetch using an explicit username + PAT token (for multiple-account support)
pub fn fetch_with_token(path: &str, remote_name: &str, username: &str, token: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut remote = repo.find_remote(remote_name)?;
    let remote_url = remote.url().unwrap_or("").to_string();
    let user = username.trim().to_string();
    let tok = token.trim().to_string();
    if tok.is_empty() {
        anyhow::bail!("token is empty");
    }
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(pat_credentials(remote_url, user, tok));
    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);
    remote.fetch::<&str>(&[], Some(&mut fetch_opts), None)?;
    Ok(())
}

fn track_push_rejection(callbacks: &mut git2::RemoteCallbacks<'_>) -> Rc<RefCell<Option<String>>> {
    let rejection = Rc::new(RefCell::new(None::<String>));
    let capture = rejection.clone();
    callbacks.push_update_reference(move |refname, status| {
        if let Some(msg) = status {
            if !msg.is_empty() {
                *capture.borrow_mut() = Some(format!("{refname} rejected: {msg}"));
            }
        }
        Ok(())
    });
    rejection
}

fn bail_if_push_rejected(rejection: Rc<RefCell<Option<String>>>) -> Result<()> {
    if let Some(msg) = rejection.borrow_mut().take() {
        anyhow::bail!(msg);
    }
    Ok(())
}

fn local_branch_oid(repo: &Repository, branch: &str) -> Result<Oid> {
    Ok(repo
        .find_branch(branch, BranchType::Local)?
        .get()
        .peel_to_commit()?
        .id())
}

/// After push, fetch from remote and ensure remote-tracking ref matches local HEAD.
fn verify_push_on_remote(path: &str, remote_name: &str, branch: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let local_oid = local_branch_oid(&repo, branch)?;
    let remote_ref = format!("refs/remotes/{remote_name}/{branch}");
    let remote_oid = repo
        .find_reference(&remote_ref)
        .ok()
        .and_then(|r| r.peel_to_commit().ok())
        .map(|c| c.id());
    match remote_oid {
        Some(oid) if oid == local_oid => Ok(()),
        Some(oid) => anyhow::bail!(
            "PUSH_NOT_ACCEPTED: local {branch} is at {local_oid} but {remote_name}/{branch} is still at {oid}"
        ),
        None => anyhow::bail!(
            "PUSH_NOT_ACCEPTED: remote branch {remote_name}/{branch} missing after push (auth, permissions, or network)"
        ),
    }
}

fn set_upstream_after_push(repo: &Repository, remote_name: &str, branch_name: &str) -> Result<()> {
    let upstream = format!("{remote_name}/{branch_name}");
    let mut local = repo.find_branch(branch_name, BranchType::Local)?;
    if local.upstream().is_err() {
        let _ = local.set_upstream(Some(upstream.as_str()));
    }
    Ok(())
}

fn finish_push(path: &str, remote_name: &str, branch: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    set_upstream_after_push(&repo, remote_name, branch)?;
    Ok(())
}

/// Push current branch using explicit username + PAT token
pub fn push_with_token(path: &str, remote_name: &str, branch: &str, username: &str, token: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut remote = repo.find_remote(remote_name)?;
    let remote_url = remote.url().unwrap_or("").to_string();
    let user = username.trim().to_string();
    let tok = token.trim().to_string();
    if tok.is_empty() {
        anyhow::bail!("token is empty");
    }
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(pat_credentials(remote_url, user, tok));
    let rejection = track_push_rejection(&mut callbacks);
    let mut push_opts = git2::PushOptions::new();
    push_opts.remote_callbacks(callbacks);
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    remote.push(&[&refspec], Some(&mut push_opts))?;
    bail_if_push_rejected(rejection)?;
    drop(remote);
    drop(repo);
    fetch_with_token(path, remote_name, username, token)?;
    verify_push_on_remote(path, remote_name, branch)?;
    finish_push(path, remote_name, branch)?;
    Ok(())
}

/// Push a single annotated or lightweight tag ref to the remote.
pub fn push_tag(path: &str, remote_name: &str, tag_name: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut remote = repo.find_remote(remote_name)?;
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(default_credentials);
    let rejection = track_push_rejection(&mut callbacks);
    let mut push_opts = git2::PushOptions::new();
    push_opts.remote_callbacks(callbacks);
    let refspec = format!("refs/tags/{tag_name}:refs/tags/{tag_name}");
    remote.push(&[&refspec], Some(&mut push_opts))?;
    bail_if_push_rejected(rejection)?;
    Ok(())
}

pub fn push_tag_with_token(
    path: &str,
    remote_name: &str,
    tag_name: &str,
    username: &str,
    token: &str,
) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut remote = repo.find_remote(remote_name)?;
    let remote_url = remote.url().unwrap_or("").to_string();
    let user = username.trim().to_string();
    let tok = token.trim().to_string();
    if tok.is_empty() {
        anyhow::bail!("token is empty");
    }
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(pat_credentials(remote_url, user, tok));
    let rejection = track_push_rejection(&mut callbacks);
    let mut push_opts = git2::PushOptions::new();
    push_opts.remote_callbacks(callbacks);
    let refspec = format!("refs/tags/{tag_name}:refs/tags/{tag_name}");
    remote.push(&[&refspec], Some(&mut push_opts))?;
    bail_if_push_rejected(rejection)?;
    Ok(())
}

/// Push using SSH agent / system credential helper (same as fetch).
pub fn push_branch(path: &str, remote_name: &str, branch: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut remote = repo.find_remote(remote_name)?;
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(default_credentials);
    let rejection = track_push_rejection(&mut callbacks);
    let mut push_opts = git2::PushOptions::new();
    push_opts.remote_callbacks(callbacks);
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    remote.push(&[&refspec], Some(&mut push_opts))?;
    bail_if_push_rejected(rejection)?;
    drop(remote);
    drop(repo);
    fetch_remote(path, remote_name)?;
    verify_push_on_remote(path, remote_name, branch)?;
    finish_push(path, remote_name, branch)?;
    Ok(())
}

/// Checkout branch, fetch remote, merge remote-tracking ref into the branch.
pub fn pull_branch(path: &str, remote_name: &str, branch: &str) -> Result<bool> {
    crate::git::branches::checkout_branch(path, branch)?;
    fetch_remote(path, remote_name)?;
    let remote_ref = format!("{}/{}", remote_name, branch);
    crate::git::merge::merge_ref(path, &remote_ref)
}

pub fn pull_with_token(
    path: &str,
    remote_name: &str,
    branch: &str,
    username: &str,
    token: &str,
) -> Result<bool> {
    crate::git::branches::checkout_branch(path, branch)?;
    fetch_with_token(path, remote_name, username, token)?;
    let remote_ref = format!("{}/{}", remote_name, branch);
    crate::git::merge::merge_ref(path, &remote_ref)
}
