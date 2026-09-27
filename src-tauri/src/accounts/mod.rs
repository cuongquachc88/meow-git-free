pub mod keychain;
pub mod oauth;
pub mod providers;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub provider: ProviderKind,
    pub base_url: Option<String>,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub auth_type: AuthType,
}

impl Account {
    pub fn new(provider: ProviderKind, username: String, auth_type: AuthType) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            provider,
            base_url: None,
            username,
            display_name: String::new(),
            avatar_url: None,
            auth_type,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    Github,
    Gitlab,
    Bitbucket,
    Azure,
    Gitea,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuthType {
    OAuth,
    Pat,
    Ssh,
}
