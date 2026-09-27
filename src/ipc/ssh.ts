import { invoke } from "@tauri-apps/api/core";

export const ssh = {
  generateKey: (keyPath: string, comment: string) =>
    invoke<string>("generate_ssh_key", { keyPath, comment }),
  readPublicKey: (keyPath: string) => invoke<string>("read_public_key", { keyPath }),
  addToAgent: (keyPath: string) => invoke<void>("add_key_to_agent", { keyPath }),
  listAgentKeys: () => invoke<string[]>("list_agent_keys"),
};
