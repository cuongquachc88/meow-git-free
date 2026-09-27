use anyhow::Result;
use std::process::Command;

/// Generates an ed25519 SSH key pair at the given path. Returns the public key content.
pub fn generate_ed25519(key_path: &str, comment: &str) -> Result<String> {
    let status = Command::new("ssh-keygen")
        .args(["-t", "ed25519", "-C", comment, "-f", key_path, "-N", ""])
        .status()?;

    if !status.success() {
        return Err(anyhow::anyhow!("ssh-keygen failed"));
    }

    let pub_key = std::fs::read_to_string(format!("{}.pub", key_path))?;
    Ok(pub_key.trim().to_string())
}

pub fn read_public_key(key_path: &str) -> Result<String> {
    let pub_path = if key_path.ends_with(".pub") {
        key_path.to_string()
    } else {
        format!("{}.pub", key_path)
    };
    let content = std::fs::read_to_string(&pub_path)?;
    Ok(content.trim().to_string())
}
