use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthConfig {
    pub client_id: String,
    pub auth_url: String,
    pub token_url: String,
    pub scopes: Vec<String>,
    pub redirect_uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthToken {
    pub access_token: String,
    pub token_type: String,
    pub scope: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_in: Option<u64>,
}

/// Returns the authorization URL to open in the browser for PKCE flow
pub fn build_auth_url(config: &OAuthConfig, state: &str, code_challenge: &str) -> String {
    let scopes = config.scopes.join(" ");
    format!(
        "{}?client_id={}&redirect_uri={}&scope={}&state={}&response_type=code&code_challenge={}&code_challenge_method=S256",
        config.auth_url,
        urlencoded(&config.client_id),
        urlencoded(&config.redirect_uri),
        urlencoded(&scopes),
        urlencoded(state),
        urlencoded(code_challenge),
    )
}

/// Exchange authorization code for access token
pub async fn exchange_code(
    config: &OAuthConfig,
    code: &str,
    code_verifier: &str,
) -> Result<OAuthToken> {
    let client = reqwest::Client::new();
    let params = [
        ("client_id", config.client_id.as_str()),
        ("code", code),
        ("redirect_uri", config.redirect_uri.as_str()),
        ("grant_type", "authorization_code"),
        ("code_verifier", code_verifier),
    ];

    let resp = client
        .post(&config.token_url)
        .header("Accept", "application/json")
        .form(&params)
        .send()
        .await?
        .json::<OAuthToken>()
        .await?;

    Ok(resp)
}

fn urlencoded(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}
