use crate::ssh::{agent, keygen};

#[tauri::command]
pub fn generate_ssh_key(key_path: String, comment: String) -> Result<String, String> {
    keygen::generate_ed25519(&key_path, &comment).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_public_key(key_path: String) -> Result<String, String> {
    keygen::read_public_key(&key_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_key_to_agent(key_path: String) -> Result<(), String> {
    agent::add_key_to_agent(&key_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_agent_keys() -> Result<Vec<String>, String> {
    agent::list_agent_keys().map_err(|e| e.to_string())
}
