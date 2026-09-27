use anyhow::Result;
use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlameLine {
    pub line_no: usize,
    pub commit_id: String,
    pub short_id: String,
    pub author: String,
    pub author_email: String,
    pub timestamp: i64,
    pub summary: String,
    pub content: String,
}

pub fn blame_file(path: &str, file: &str) -> Result<Vec<BlameLine>> {
    let repo = Repository::open(path)?;
    let blame = repo.blame_file(std::path::Path::new(file), None)?;

    // Read the actual file content to get line text
    let full_path = std::path::Path::new(path).join(file);
    let content = std::fs::read_to_string(&full_path).unwrap_or_default();
    let file_lines: Vec<&str> = content.lines().collect();

    let mut result = Vec::new();
    for hunk in blame.iter() {
        let sig = hunk.final_signature();
        let commit_id = hunk.final_commit_id();
        let short_id = format!("{:.7}", commit_id);

        let summary = repo
            .find_commit(commit_id)
            .ok()
            .and_then(|c| c.summary().map(|s| s.to_string()))
            .unwrap_or_default();

        let start = hunk.final_start_line(); // 1-based
        let lines_in_hunk = hunk.lines_in_hunk();

        for i in 0..lines_in_hunk {
            let line_no = start + i;
            let content = file_lines
                .get(line_no.saturating_sub(1))
                .copied()
                .unwrap_or("")
                .to_string();

            result.push(BlameLine {
                line_no,
                commit_id: commit_id.to_string(),
                short_id: short_id.clone(),
                author: sig.name().unwrap_or("").to_string(),
                author_email: sig.email().unwrap_or("").to_string(),
                timestamp: sig.when().seconds(),
                summary: summary.clone(),
                content,
            });
        }
    }

    result.sort_by_key(|l| l.line_no);
    Ok(result)
}

/// Read raw file content at a specific commit (for merge editor ours/theirs/ancestor)
pub fn read_blob_at(path: &str, file: &str, commit_ref: &str) -> Result<String> {
    let repo = Repository::open(path)?;
    let obj = repo.revparse_single(&format!("{}:{}", commit_ref, file))?;
    let blob = obj.peel_to_blob()?;
    Ok(String::from_utf8_lossy(blob.content()).to_string())
}
