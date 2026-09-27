use anyhow::Result;
use serde::{Deserialize, Serialize};

const GITHUB_API: &str = "https://api.github.com";

#[derive(Debug, Serialize, Deserialize)]
pub struct GithubUser {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: String,
    pub email: Option<String>,
}

pub async fn get_user(token: &str, base_url: Option<&str>) -> Result<GithubUser> {
    let api_base = base_url.unwrap_or(GITHUB_API);
    let client = reqwest::Client::new();
    let user = client
        .get(format!("{}/user", api_base))
        .header("Authorization", format!("token {}", token))
        .header("User-Agent", "meow-git/0.1")
        .send()
        .await?
        .json::<GithubUser>()
        .await?;
    Ok(user)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GithubRepo {
    pub full_name: String,
    pub name: String,
    pub description: Option<String>,
    pub clone_url: String,
    pub ssh_url: String,
    pub private: bool,
    pub default_branch: String,
}

pub async fn create_repo(
    token: &str,
    name: &str,
    private: bool,
    base_url: Option<&str>,
) -> Result<GithubRepo> {
    let api_base = base_url.unwrap_or(GITHUB_API);
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/user/repos", api_base))
        .header("Authorization", format!("Bearer {}", token))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "meow-git/0.1")
        .json(&serde_json::json!({
            "name": name,
            "private": private,
            "auto_init": false,
        }))
        .send()
        .await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("GitHub API {}: {}", status, body);
    }
    Ok(resp.json::<GithubRepo>().await?)
}

pub async fn list_repos(token: &str, base_url: Option<&str>) -> Result<Vec<GithubRepo>> {
    let api_base = base_url.unwrap_or(GITHUB_API);
    let client = reqwest::Client::new();
    let repos = client
        .get(format!("{}/user/repos?per_page=100&sort=pushed", api_base))
        .header("Authorization", format!("token {}", token))
        .header("User-Agent", "meow-git/0.1")
        .send()
        .await?
        .json::<Vec<GithubRepo>>()
        .await?;
    Ok(repos)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PullRequest {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub html_url: String,
    pub body: Option<String>,
    pub head: PrRef,
    pub base: PrRef,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrRef {
    #[serde(rename = "ref")]
    pub ref_name: String,
    pub sha: String,
}

pub async fn list_prs(token: &str, owner: &str, repo: &str, base_url: Option<&str>) -> Result<Vec<PullRequest>> {
    let api_base = base_url.unwrap_or(GITHUB_API);
    let client = reqwest::Client::new();
    let prs = client
        .get(format!("{}/repos/{}/{}/pulls?state=open&per_page=100", api_base, owner, repo))
        .header("Authorization", format!("token {}", token))
        .header("User-Agent", "meow-git/0.1")
        .send()
        .await?
        .json::<Vec<PullRequest>>()
        .await?;
    Ok(prs)
}
