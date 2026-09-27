use anyhow::Result;
use serde::{Deserialize, Serialize};

const BB_API: &str = "https://api.bitbucket.org/2.0";

#[derive(Debug, Serialize, Deserialize)]
pub struct BitbucketUser {
    pub uuid: String,
    pub username: String,
    pub display_name: String,
    pub account_id: String,
}

pub async fn get_user(token: &str) -> Result<BitbucketUser> {
    let client = reqwest::Client::new();
    let user = client
        .get(format!("{}/user", BB_API))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?
        .json::<BitbucketUser>()
        .await?;
    Ok(user)
}
