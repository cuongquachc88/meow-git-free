use crate::accounts::{keychain, Account, AuthType, ProviderKind};
use crate::accounts::providers::{github, gitlab};

#[tauri::command]
pub fn store_account_token(account_id: String, token: String) -> Result<(), String> {
    let token = token.trim();
    if token.is_empty() {
        return Err("Token is empty".into());
    }
    keychain::store_token(&account_id, token).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_account_token(account_id: String) -> Result<String, String> {
    let token = keychain::get_token(&account_id).map_err(|e| e.to_string())?;
    let token = token.trim();
    if token.is_empty() {
        return Err("Token is empty in keychain".into());
    }
    Ok(token.to_string())
}

#[tauri::command]
pub fn delete_account_token(account_id: String) -> Result<(), String> {
    keychain::delete_token(&account_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_account(
    provider: String,
    username: String,
    auth_type: String,
    base_url: Option<String>,
) -> Result<Account, String> {
    let provider_kind = match provider.as_str() {
        "github" => ProviderKind::Github,
        "gitlab" => ProviderKind::Gitlab,
        "bitbucket" => ProviderKind::Bitbucket,
        "azure" => ProviderKind::Azure,
        "gitea" => ProviderKind::Gitea,
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    let at = match auth_type.as_str() {
        "oauth" => AuthType::OAuth,
        "pat" => AuthType::Pat,
        "ssh" => AuthType::Ssh,
        _ => return Err(format!("Unknown auth type: {}", auth_type)),
    };

    let mut account = Account::new(provider_kind, username, at);
    account.base_url = base_url;
    Ok(account)
}

/// Create an empty repository on the host; returns HTTPS clone URL.
#[tauri::command]
pub async fn create_host_repository(
    provider: String,
    token: String,
    repo_name: String,
    base_url: Option<String>,
    private_repo: bool,
) -> Result<String, String> {
    let name = repo_name.trim();
    if name.is_empty() {
        return Err("Repository name is required".into());
    }
    match provider.as_str() {
        "github" => {
            let repo = github::create_repo(&token, name, private_repo, base_url.as_deref())
                .await
                .map_err(|e| e.to_string())?;
            Ok(repo.clone_url)
        }
        "gitlab" => {
            let project = gitlab::create_project(&token, name, private_repo, base_url.as_deref())
                .await
                .map_err(|e| e.to_string())?;
            Ok(project.http_url_to_repo)
        }
        other => Err(format!(
            "Creating repos on {other} is not supported yet. Create the repo on the website, then try again."
        )),
    }
}
