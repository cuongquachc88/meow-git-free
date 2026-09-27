mod git;
mod accounts;
mod ssh;
mod fs;
mod commands;

use commands::{
    account_commands::*,
    git_commands::*,
    ssh_commands::*,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // repo
            open_repo,
            init_repo,
            clone_repo,
            // commits
            get_log,
            get_commit,
            cherry_pick,
            revert_commit,
            // branches
            list_branches,
            create_branch,
            checkout_branch,
            delete_branch,
            rename_branch,
            // staging & commits
            get_status,
            stage_file,
            stage_all,
            unstage_file,
            create_commit,
            save_stash,
            list_stashes,
            pop_stash,
            drop_stash,
            // diff
            diff_workdir,
            diff_staged,
            diff_commit,
            // remotes
            list_remotes,
            add_remote,
            remove_remote,
            fetch_remote,
            fetch_with_token,
            push_with_token,
            pull_branch,
            pull_with_token,
            // merge / rebase / reset
            merge_branch,
            get_conflicts,
            abort_merge,
            reset_to_ref,
            rebase_onto,
            // tags
            list_tags,
            create_tag,
            delete_tag,
            // submodules
            list_submodules,
            update_submodules,
            // blame & blob
            blame_file,
            read_blob_at,
            // accounts
            store_account_token,
            get_account_token,
            delete_account_token,
            create_account,
            // ssh
            generate_ssh_key,
            read_public_key,
            add_key_to_agent,
            list_agent_keys,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
