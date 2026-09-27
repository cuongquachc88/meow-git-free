use crate::git::{blame, branches, commits, diff, merge, remotes, repo, staging, submodules, tags};
use serde_json::Value;

#[tauri::command]
pub fn open_repo(path: String) -> Result<repo::RepoInfo, String> {
    repo::open_repo(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn init_repo(path: String, bare: bool) -> Result<repo::RepoInfo, String> {
    repo::init_repo(&path, bare).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clone_repo(url: String, path: String) -> Result<repo::RepoInfo, String> {
    repo::clone_repo(&url, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_log(path: String, max: Option<usize>) -> Result<Vec<commits::CommitInfo>, String> {
    commits::get_log(&path, max).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_commit(path: String, id: String) -> Result<commits::CommitInfo, String> {
    commits::get_commit(&path, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cherry_pick(path: String, id: String) -> Result<(), String> {
    commits::cherry_pick(&path, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn revert_commit(path: String, id: String) -> Result<(), String> {
    commits::revert_commit(&path, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_branches(path: String) -> Result<Vec<branches::BranchInfo>, String> {
    branches::list_branches(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_branch(path: String, name: String, from_ref: Option<String>) -> Result<branches::BranchInfo, String> {
    branches::create_branch(&path, &name, from_ref.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn checkout_branch(path: String, name: String) -> Result<(), String> {
    branches::checkout_branch(&path, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_branch(path: String, name: String) -> Result<(), String> {
    branches::delete_branch(&path, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_branch(path: String, old_name: String, new_name: String) -> Result<(), String> {
    branches::rename_branch(&path, &old_name, &new_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_status(path: String) -> Result<Vec<staging::FileStatus>, String> {
    staging::get_status(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stage_file(path: String, file: String) -> Result<(), String> {
    staging::stage_file(&path, &file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stage_all(path: String) -> Result<(), String> {
    staging::stage_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unstage_file(path: String, file: String) -> Result<(), String> {
    staging::unstage_file(&path, &file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_commit(path: String, message: String, amend: Option<bool>) -> Result<String, String> {
    staging::create_commit(&path, &message, amend.unwrap_or(false)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_stash(path: String, message: Option<String>) -> Result<String, String> {
    staging::save_stash(&path, message.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_stashes(path: String) -> Result<Vec<Value>, String> {
    staging::list_stashes(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pop_stash(path: String, index: usize) -> Result<(), String> {
    staging::pop_stash(&path, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn drop_stash(path: String, index: usize) -> Result<(), String> {
    staging::drop_stash(&path, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn diff_workdir(path: String, file: Option<String>) -> Result<Vec<diff::FileDiff>, String> {
    diff::diff_workdir(&path, file.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn diff_staged(path: String, file: Option<String>) -> Result<Vec<diff::FileDiff>, String> {
    diff::diff_staged(&path, file.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn diff_commit(path: String, commit_id: String) -> Result<Vec<diff::FileDiff>, String> {
    diff::diff_commit(&path, &commit_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_remotes(path: String) -> Result<Vec<remotes::RemoteInfo>, String> {
    remotes::list_remotes(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_remote(path: String, name: String, url: String) -> Result<(), String> {
    remotes::add_remote(&path, &name, &url).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_remote(path: String, name: String, url: String) -> Result<(), String> {
    remotes::upsert_remote(&path, &name, &url).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_remote(path: String, name: String) -> Result<(), String> {
    remotes::remove_remote(&path, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fetch_remote(path: String, remote_name: String) -> Result<(), String> {
    remotes::fetch_remote(&path, &remote_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fetch_with_token(path: String, remote_name: String, username: String, token: String) -> Result<(), String> {
    remotes::fetch_with_token(&path, &remote_name, &username, &token).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn push_with_token(path: String, remote_name: String, branch: String, username: String, token: String) -> Result<(), String> {
    remotes::push_with_token(&path, &remote_name, &branch, &username, &token).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn push_branch(path: String, remote_name: String, branch: String) -> Result<(), String> {
    remotes::push_branch(&path, &remote_name, &branch).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pull_branch(path: String, remote_name: String, branch: String) -> Result<bool, String> {
    remotes::pull_branch(&path, &remote_name, &branch).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pull_with_token(
    path: String,
    remote_name: String,
    branch: String,
    username: String,
    token: String,
) -> Result<bool, String> {
    remotes::pull_with_token(&path, &remote_name, &branch, &username, &token).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn merge_branch(path: String, branch_name: String) -> Result<bool, String> {
    merge::merge_branch(&path, &branch_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_conflicts(path: String) -> Result<Vec<merge::ConflictFile>, String> {
    merge::get_conflicts(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn abort_merge(path: String) -> Result<(), String> {
    merge::abort_merge(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_to_ref(path: String, target_ref: String, mode: String) -> Result<(), String> {
    merge::reset_to_ref(&path, &target_ref, &mode).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rebase_onto(path: String, onto_branch: String) -> Result<(), String> {
    merge::rebase_onto(&path, &onto_branch).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_tags(path: String) -> Result<Vec<tags::TagInfo>, String> {
    tags::list_tags(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_tag(path: String, name: String, target_ref: Option<String>, message: Option<String>) -> Result<(), String> {
    tags::create_tag(&path, &name, target_ref.as_deref(), message.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_tag(path: String, name: String) -> Result<(), String> {
    tags::delete_tag(&path, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_submodules(path: String) -> Result<Vec<submodules::SubmoduleInfo>, String> {
    submodules::list_submodules(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_submodules(path: String) -> Result<(), String> {
    submodules::update_submodules(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn blame_file(path: String, file: String) -> Result<Vec<blame::BlameLine>, String> {
    blame::blame_file(&path, &file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_blob_at(path: String, file: String, commit_ref: String) -> Result<String, String> {
    blame::read_blob_at(&path, &file, &commit_ref).map_err(|e| e.to_string())
}
