use anyhow::Result;
use std::process::Command;

pub fn add_key_to_agent(key_path: &str) -> Result<()> {
    let status = Command::new("ssh-add").arg(key_path).status()?;
    if !status.success() {
        return Err(anyhow::anyhow!("ssh-add failed"));
    }
    Ok(())
}

pub fn list_agent_keys() -> Result<Vec<String>> {
    let output = Command::new("ssh-add").arg("-L").output()?;
    let keys = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(|l| l.to_string())
        .collect();
    Ok(keys)
}
