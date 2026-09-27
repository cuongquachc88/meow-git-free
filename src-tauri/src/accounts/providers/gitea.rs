use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GiteaUser {
    pub id: u64,
    pub login: String,
    pub full_name: String,
    pub avatar_url: String,
    pub email: String,
}

pub async fn get_user(token: &str, base_url: &str) -> Result<GiteaUser> {
    let client = reqwest::Client::new();
    let user = client
        .get(format!("{}/api/v1/user", base_url.trim_end_matches('/')))
        .header("Authorization", format!("token {}", token))
        .send()
        .await?
        .json::<GiteaUser>()
        .await?;
    Ok(user)
}
