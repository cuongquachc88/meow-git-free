use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AzureProfile {
    pub display_name: String,
    pub public_alias: String,
    pub email_address: Option<String>,
}

pub async fn get_profile(token: &str, organization: &str) -> Result<AzureProfile> {
    let client = reqwest::Client::new();
    let profile = client
        .get(format!(
            "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1"
        ))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?
        .json::<AzureProfile>()
        .await?;
    Ok(profile)
}
