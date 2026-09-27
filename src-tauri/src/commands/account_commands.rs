use crate::accounts::{keychain, Account, AuthType, ProviderKind};

#[tauri::command]
pub fn store_account_token(account_id: String, token: String) -> Result<(), String> {
    keychain::store_token(&account_id, &token).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_account_token(account_id: String) -> Result<String, String> {
    keychain::get_token(&account_id).map_err(|e| e.to_string())
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
