use anyhow::Result;
use keyring::Entry;

const SERVICE: &str = "meow-git";

pub fn store_token(account_id: &str, token: &str) -> Result<()> {
    let entry = Entry::new(SERVICE, account_id)?;
    entry.set_password(token)?;
    Ok(())
}

pub fn get_token(account_id: &str) -> Result<String> {
    let entry = Entry::new(SERVICE, account_id)?;
    let token = entry.get_password()?;
    Ok(token)
}

pub fn delete_token(account_id: &str) -> Result<()> {
    let entry = Entry::new(SERVICE, account_id)?;
    entry.delete_credential()?;
    Ok(())
}
