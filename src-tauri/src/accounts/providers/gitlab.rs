use anyhow::Result;
use serde::{Deserialize, Serialize};

const GITLAB_API: &str = "https://gitlab.com/api/v4";

#[derive(Debug, Serialize, Deserialize)]
pub struct GitlabUser {
    pub id: u64,
    pub username: String,
    pub name: String,
    pub avatar_url: String,
    pub email: Option<String>,
}

pub async fn get_user(token: &str, base_url: Option<&str>) -> Result<GitlabUser> {
    let api_base = base_url.map(|u| format!("{}/api/v4", u.trim_end_matches('/')))
        .unwrap_or_else(|| GITLAB_API.to_string());
    let client = reqwest::Client::new();
    let user = client
        .get(format!("{}/user", api_base))
        .header("PRIVATE-TOKEN", token)
        .send()
        .await?
        .json::<GitlabUser>()
        .await?;
    Ok(user)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitlabProject {
    pub id: u64,
    pub path_with_namespace: String,
    pub name: String,
    pub description: Option<String>,
    pub http_url_to_repo: String,
    pub ssh_url_to_repo: String,
    pub visibility: String,
    pub default_branch: Option<String>,
}

pub async fn list_projects(token: &str, base_url: Option<&str>) -> Result<Vec<GitlabProject>> {
    let api_base = base_url.map(|u| format!("{}/api/v4", u.trim_end_matches('/')))
        .unwrap_or_else(|| GITLAB_API.to_string());
    let client = reqwest::Client::new();
    let projects = client
        .get(format!("{}/projects?membership=true&per_page=100&order_by=last_activity_at", api_base))
        .header("PRIVATE-TOKEN", token)
        .send()
        .await?
        .json::<Vec<GitlabProject>>()
        .await?;
    Ok(projects)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MergeRequest {
    pub iid: u64,
    pub title: String,
    pub state: String,
    pub web_url: String,
    pub description: Option<String>,
    pub source_branch: String,
    pub target_branch: String,
}

pub async fn list_mrs(token: &str, project_id: u64, base_url: Option<&str>) -> Result<Vec<MergeRequest>> {
    let api_base = base_url.map(|u| format!("{}/api/v4", u.trim_end_matches('/')))
        .unwrap_or_else(|| GITLAB_API.to_string());
    let client = reqwest::Client::new();
    let mrs = client
        .get(format!("{}/projects/{}/merge_requests?state=opened&per_page=100", api_base, project_id))
        .header("PRIVATE-TOKEN", token)
        .send()
        .await?
        .json::<Vec<MergeRequest>>()
        .await?;
    Ok(mrs)
}
