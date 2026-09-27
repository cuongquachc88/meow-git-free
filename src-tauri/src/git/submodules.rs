use anyhow::Result;
use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmoduleInfo {
    pub name: String,
    pub path: String,
    pub url: Option<String>,
    pub head_id: Option<String>,
}

pub fn list_submodules(path: &str) -> Result<Vec<SubmoduleInfo>> {
    let repo = Repository::open(path)?;
    let mut result = Vec::new();

    for name in repo.submodules()? {
        result.push(SubmoduleInfo {
            name: name.name().unwrap_or("").to_string(),
            path: name.path().to_string_lossy().to_string(),
            url: name.url().map(|u| u.to_string()),
            head_id: name.head_id().map(|o| o.to_string()),
        });
    }

    Ok(result)
}

pub fn update_submodules(path: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    let mut submodules = repo.submodules()?;

    for sub in &mut submodules {
        let mut opts = git2::SubmoduleUpdateOptions::new();
        sub.update(true, Some(&mut opts))?;
    }

    Ok(())
}
