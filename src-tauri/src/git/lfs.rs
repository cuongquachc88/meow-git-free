use anyhow::Result;
use std::process::Command;

/// Git LFS operations via CLI subprocess (libgit2 has no LFS support)

pub fn lfs_track(repo_path: &str, pattern: &str) -> Result<()> {
    run_git_lfs(repo_path, &["track", pattern])
}

pub fn lfs_untrack(repo_path: &str, pattern: &str) -> Result<()> {
    run_git_lfs(repo_path, &["untrack", pattern])
}

pub fn lfs_push(repo_path: &str, remote: &str) -> Result<()> {
    run_git_lfs(repo_path, &["push", remote])
}

pub fn lfs_pull(repo_path: &str) -> Result<()> {
    run_git_lfs(repo_path, &["pull"])
}

pub fn lfs_status(repo_path: &str) -> Result<String> {
    let output = Command::new("git")
        .args(["lfs", "status"])
        .current_dir(repo_path)
        .output()?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn run_git_lfs(repo_path: &str, args: &[&str]) -> Result<()> {
    let status = Command::new("git")
        .arg("lfs")
        .args(args)
        .current_dir(repo_path)
        .status()?;

    if status.success() {
        Ok(())
    } else {
        Err(anyhow::anyhow!("git lfs {:?} failed with status: {}", args, status))
    }
}
