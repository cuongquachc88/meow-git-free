# Architecture

Meow Git is a Tauri v2 desktop app: a React/TypeScript frontend renders the UI, and a Rust backend does all actual Git work via [`git2`](https://docs.rs/git2) (libgit2 bindings). The two communicate over Tauri's IPC bridge (`invoke`).

## High-level layout

```
meow-git-free/
├── src/                  # React frontend
│   ├── components/       # UI components, grouped by domain (git, accounts, integrations, layout, ...)
│   ├── store/            # Zustand stores (app state)
│   ├── hooks/            # React hooks
│   ├── ipc/              # Typed wrappers around Tauri invoke() calls
│   ├── lib/              # Frontend utilities
│   ├── types/            # Shared TypeScript types
│   └── constants/        # Shared constants
├── src-tauri/            # Rust backend (Tauri)
│   ├── src/
│   │   ├── commands/     # #[tauri::command] entry points exposed to the frontend
│   │   ├── git/          # Git domain logic (branches, commits, diff, merge, remotes, tags, ...)
│   │   ├── accounts/     # Git host account/token management
│   │   ├── ssh/          # SSH key generation and agent integration
│   │   ├── fs/           # Filesystem helpers
│   │   └── lib.rs        # Tauri app builder, command registration
│   └── tauri.conf.json   # Tauri app configuration
└── .github/workflows/    # CI (release pipeline)
```

## IPC boundary

All Git operations happen in Rust. The frontend never touches the filesystem or shells out to `git` directly — it calls typed commands registered in `src-tauri/src/lib.rs` via `tauri::generate_handler!`, backed by implementations in `src-tauri/src/commands/*` and `src-tauri/src/git/*`.

Command groups (see `src-tauri/src/lib.rs` for the full list):

- **Repo**: `open_repo`, `init_repo`, `clone_repo`
- **Commits**: `get_log`, `get_commit`, `cherry_pick`, `revert_commit`
- **Branches**: `list_branches`, `create_branch`, `checkout_branch`, `delete_branch`, `rename_branch`
- **Staging/commit**: `get_status`, `stage_file`, `stage_all`, `unstage_file`, `create_commit`, stash operations
- **Diff**: `diff_workdir`, `diff_staged`, `diff_commit`
- **Remotes/sync**: `list_remotes`, `add_remote`, `fetch_remote`, `push_with_token`, `pull_with_token`, etc.
- **Merge/rebase/reset**: `merge_branch`, `get_conflicts`, `abort_merge`, `reset_to_ref`, `rebase_onto`
- **Tags**: `list_tags`, `create_tag`, `delete_tag`, remote tag sync
- **Submodules**, **blame/blob**, **accounts** (token storage via OS keychain through `keyring`), **ssh** (key generation/agent)

Frontend call sites live under `src/ipc/`, which wraps `@tauri-apps/api`'s `invoke()` with typed signatures matching the Rust commands.

## State management

- **Zustand** (`src/store/`) holds frontend app state (current repo, selected branch, UI state, etc.)
- Git state of record always lives on disk (the actual `.git` repository) — the frontend store is a cache/view over data fetched from Rust commands, refreshed after mutating operations (commit, push, checkout, etc.)

## Credentials & security

- Git host tokens (PATs) are stored via the [`keyring`](https://docs.rs/keyring) crate, which uses the OS-native credential store (Keychain on macOS, Credential Manager on Windows) — tokens are never written to plaintext app config.
- SSH key generation and agent interaction live in `src-tauri/src/ssh/`.

## Build system

- **Frontend**: Vite + React + TypeScript, Tailwind for styling, Monaco Editor for diff/code views.
- **Backend**: Cargo workspace rooted at `src-tauri/`, compiled as part of `tauri build`.
- **Packaging**: Tauri's bundler produces a `.dmg` on macOS and an NSIS `.exe` installer on Windows (see [BUILD.md](BUILD.md)).

## Testing

- Frontend: Vitest (`bun run test`, `bun run test:coverage`)
- Backend: `cargo test` via `bun run test:rust` (see `src-tauri/src/git/tests.rs` and inline module tests)
- `bun run test:all` runs both suites — this is the gate to run before tagging a release.
