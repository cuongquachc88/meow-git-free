use anyhow::Result;
use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInfo {
    pub name: String,
    pub target_id: String,
    pub message: Option<String>,
    pub tagger_name: Option<String>,
    pub tagger_time: Option<i64>,
}

pub fn list_tags(path: &str) -> Result<Vec<TagInfo>> {
    let repo = Repository::open(path)?;
    let mut tags = Vec::new();

    repo.tag_foreach(|oid, name| {
        let name_str = std::str::from_utf8(name)
            .unwrap_or("")
            .trim_start_matches("refs/tags/")
            .to_string();

        let (message, tagger_name, tagger_time, target_id) =
            if let Ok(tag) = repo.find_tag(oid) {
                (
                    tag.message().map(|m| m.to_string()),
                    tag.tagger().and_then(|t| t.name().map(|n| n.to_string())),
                    tag.tagger().map(|t| t.when().seconds()),
                    tag.target_id().to_string(),
                )
            } else {
                (None, None, None, oid.to_string())
            };

        tags.push(TagInfo {
            name: name_str,
            target_id,
            message,
            tagger_name,
            tagger_time,
        });
        true
    })?;

    Ok(tags)
}

pub fn create_tag(path: &str, name: &str, target_ref: Option<&str>, message: Option<&str>) -> Result<()> {
    let repo = Repository::open(path)?;
    let obj = match target_ref {
        Some(r) => repo.revparse_single(r)?,
        None => repo.head()?.peel_to_commit()?.into_object(),
    };

    if let Some(msg) = message {
        let sig = repo.signature()?;
        repo.tag(name, &obj, &sig, msg, false)?;
    } else {
        repo.tag_lightweight(name, &obj, false)?;
    }

    Ok(())
}

pub fn delete_tag(path: &str, name: &str) -> Result<()> {
    let repo = Repository::open(path)?;
    repo.tag_delete(name)?;
    Ok(())
}
