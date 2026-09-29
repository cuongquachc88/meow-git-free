use anyhow::Result;
use git2::Repository;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInfo {
    pub name: String,
    pub target_id: String,
    pub message: Option<String>,
    pub tagger_name: Option<String>,
    pub tagger_time: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagRefInfo {
    pub name: String,
    pub target_id: String,
    pub message: Option<String>,
    pub tagger_name: Option<String>,
    pub tagger_time: Option<i64>,
    pub local: bool,
    pub on_origin: bool,
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

fn peel_ref_to_commit_id(repo: &Repository, refname: &str) -> Option<String> {
    let reference = repo.find_reference(refname).ok()?;
    reference
        .peel_to_commit()
        .ok()
        .map(|c| c.id().to_string())
}

/// Local tags plus remote-tracking tags (`refs/remotes/{remote}/tags/*`) after fetch.
pub fn list_tag_refs(path: &str, remote_name: &str) -> Result<Vec<TagRefInfo>> {
    let repo = Repository::open(path)?;
    let mut by_name: HashMap<String, TagRefInfo> = HashMap::new();

    for info in list_tags(path)? {
        by_name.insert(
            info.name.clone(),
            TagRefInfo {
                name: info.name,
                target_id: info.target_id,
                message: info.message,
                tagger_name: info.tagger_name,
                tagger_time: info.tagger_time,
                local: true,
                on_origin: false,
            },
        );
    }

    let remote_prefix = format!("refs/remotes/{remote_name}/tags/");
    if repo.find_remote(remote_name).is_ok() {
        if let Ok(references) = repo.references() {
            for reference in references.flatten() {
                let Some(refname) = reference.name() else {
                    continue;
                };
                let Some(tag_name) = refname.strip_prefix(&remote_prefix) else {
                    continue;
                };
                if tag_name.is_empty() || tag_name.contains('/') {
                    continue;
                }
                let target_id = peel_ref_to_commit_id(&repo, refname)
                    .unwrap_or_else(|| reference.target().map(|t| t.to_string()).unwrap_or_default());

                by_name
                    .entry(tag_name.to_string())
                    .and_modify(|e| {
                        e.on_origin = true;
                        if e.target_id.is_empty() {
                            e.target_id = target_id.clone();
                        }
                    })
                    .or_insert(TagRefInfo {
                        name: tag_name.to_string(),
                        target_id,
                        message: None,
                        tagger_name: None,
                        tagger_time: None,
                        local: false,
                        on_origin: true,
                    });
            }
        }
    }

    let mut out: Vec<TagRefInfo> = by_name.into_values().collect();
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
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
