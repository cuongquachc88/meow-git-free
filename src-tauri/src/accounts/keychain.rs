//! PAT storage: macOS Keychain and Windows Credential Manager (persistent, app-isolated).
//!
//! Isolation model:
//! - **macOS**: generic password in login keychain, `service` = app id (+ `.dev` in debug), `account` = account UUID.
//! - **Windows**: Credential Manager target `{app_id}/{account_id}` (see keyring windows backend).
//! - Legacy entries under service `meow-git` are migrated on read when possible.

use anyhow::{Context, Result};
use keyring::Entry;
use std::fs;
use std::path::PathBuf;

/// Matches `identifier` in tauri.conf.json.
const APP_ID: &str = "com.cuongquachc.meow-git";
const LEGACY_SERVICE: &str = "meow-git";

fn app_service_name() -> String {
    if cfg!(debug_assertions) {
        format!("{APP_ID}.dev")
    } else {
        APP_ID.to_string()
    }
}

/// Windows credential target name — unique per app install flavor and account.
#[cfg(target_os = "windows")]
fn windows_target(service: &str, account_id: &str) -> String {
    format!("{service}/{account_id}")
}

fn keyring_entry_for(service: &str, account_id: &str) -> Result<Entry> {
    #[cfg(target_os = "windows")]
    {
        let target = windows_target(service, account_id);
        return Entry::new_with_target(&target, service, account_id).context("keyring entry");
    }
    #[cfg(not(target_os = "windows"))]
    {
        Entry::new(service, account_id).context("keyring entry")
    }
}

fn keyring_entry(account_id: &str) -> Result<Entry> {
    keyring_entry_for(&app_service_name(), account_id)
}

fn legacy_keyring_entry(account_id: &str) -> Result<Entry> {
    keyring_entry_for(LEGACY_SERVICE, account_id)
}

fn keyring_get_from(entry: &Entry) -> Result<String> {
    entry.get_password().context("keyring get")
}

fn keyring_get(account_id: &str) -> Result<String> {
    keyring_get_from(&keyring_entry(account_id)?)
}

fn keyring_store(account_id: &str, token: &str) -> Result<()> {
    let entry = keyring_entry(account_id)?;
    entry.set_password(token).context("keyring set")
}

fn keyring_delete(account_id: &str) -> Result<()> {
    let _ = keyring_entry(account_id)?.delete_credential();
    let _ = legacy_keyring_entry(account_id)?.delete_credential();
    Ok(())
}

fn token_file_path(account_id: &str) -> Result<PathBuf> {
    let proj = directories::ProjectDirs::from("com", "cuongquachc", "meow-git")
        .context("home directory for token storage")?;
    let mut dir = proj.data_dir().to_path_buf();
    if cfg!(debug_assertions) {
        dir.push("dev");
    }
    dir.push("tokens");
    fs::create_dir_all(&dir).context("create token dir")?;
    Ok(dir.join(format!("{account_id}.token")))
}

fn file_get(account_id: &str) -> Result<String> {
    let path = token_file_path(account_id)?;
    fs::read_to_string(&path).context("read token file")
}

fn file_store(account_id: &str, token: &str) -> Result<()> {
    let path = token_file_path(account_id)?;
    fs::write(&path, token).context("write token file")?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
            .context("token file permissions")?;
    }
    Ok(())
}

fn file_delete(account_id: &str) -> Result<()> {
    let path = token_file_path(account_id)?;
    if path.exists() {
        fs::remove_file(&path).context("delete token file")?;
    }
    Ok(())
}

fn keyring_roundtrip_ok(account_id: &str, token: &str) -> bool {
    keyring_store(account_id, token).is_ok()
        && keyring_get(account_id)
            .map(|t| t == token)
            .unwrap_or(false)
}

fn migrate_legacy_keychain(account_id: &str) -> Result<()> {
    let legacy = legacy_keyring_entry(account_id)?;
    let token = keyring_get_from(&legacy)?;
    if token.trim().is_empty() {
        return Ok(());
    }
    if keyring_roundtrip_ok(account_id, &token) {
        let _ = legacy.delete_credential();
    }
    Ok(())
}

fn migrate_file_to_keychain(account_id: &str) -> Result<()> {
    let token = file_get(account_id)?;
    if keyring_roundtrip_ok(account_id, &token) {
        let _ = file_delete(account_id);
    }
    Ok(())
}

pub fn store_token(account_id: &str, token: &str) -> Result<()> {
    if keyring_roundtrip_ok(account_id, token) {
        let _ = file_delete(account_id);
        let _ = legacy_keyring_entry(account_id)?.delete_credential();
        return Ok(());
    }

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        anyhow::bail!(
            "could not store token in the OS credential store (Keychain on macOS, Credential Manager on Windows)"
        );
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        file_store(account_id, token)?;
        if file_get(account_id).map(|t| t == token).unwrap_or(false) {
            return Ok(());
        }
        anyhow::bail!("could not persist token")
    }
}

pub fn get_token(account_id: &str) -> Result<String> {
    if let Ok(token) = keyring_get(account_id) {
        if !token.trim().is_empty() {
            let _ = file_delete(account_id);
            return Ok(token);
        }
    }

    let _ = migrate_legacy_keychain(account_id);
    if let Ok(token) = keyring_get(account_id) {
        if !token.trim().is_empty() {
            return Ok(token);
        }
    }

    let _ = migrate_file_to_keychain(account_id);
    if let Ok(token) = keyring_get(account_id) {
        if !token.trim().is_empty() {
            return Ok(token);
        }
    }

    file_get(account_id)
}

pub fn delete_token(account_id: &str) -> Result<()> {
    keyring_delete(account_id)?;
    let _ = file_delete(account_id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn token_store_roundtrip() {
        let id = format!("test-{}", Uuid::new_v4());
        store_token(&id, "secret-token").expect("store");
        assert_eq!(get_token(&id).expect("get"), "secret-token");
        delete_token(&id).expect("delete");
    }
}
