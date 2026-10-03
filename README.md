# Meow Git

A fast, native Git GUI desktop app built with **Tauri v2**, **React**, and **Rust (git2)**.

![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-informational)
![license](https://img.shields.io/badge/license-MIT-green)

> Status: early-stage / pre-1.0. Core Git workflows work end to end; expect rough edges.

## Features

- **Repository management** — open, init, or clone a repo
- **Commit graph & history** — browse log, inspect commits, cherry-pick, revert
- **Branches** — create, checkout, rename, delete
- **Staging & commits** — stage/unstage files or all changes, commit, stash (save/list/pop/drop)
- **Diffs** — working directory, staged, and per-commit diffs with a Monaco-powered viewer
- **Remotes & sync** — add/edit/remove remotes, fetch, push, pull, with PAT (personal access token) and SSH auth
- **Tags** — list, create, delete, and push tags (including remote tag sync)
- **Merge / rebase / reset** — merge branches, resolve conflicts, abort merge, reset to ref, rebase onto
- **Submodules** — list and update
- **Blame & file history** — view blame and historical blob contents
- **Accounts** — store and manage Git host (GitHub/GitLab, etc.) account tokens, create repos from the app
- **SSH keys** — generate keys, read public keys, add to agent

## Tech stack

| Layer | Technology |
| --- | --- |
| Shell | [Tauri v2](https://tauri.app) |
| UI | React 19, TypeScript, Tailwind CSS, Zustand |
| Editor/diff view | Monaco Editor |
| Backend | Rust, [git2](https://docs.rs/git2) (libgit2 bindings) |
| Package manager | [Bun](https://bun.sh) |

## Getting started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Platform build tools — see [docs/BUILD.md](docs/BUILD.md) for macOS/Windows specifics

### Install & run

```bash
bun install
bun run tauri dev
```

### Build a production bundle

```bash
bun run tauri build
```

See **[docs/BUILD.md](docs/BUILD.md)** for full platform-specific build and packaging instructions (DMG for macOS, NSIS installer for Windows).

## Documentation

Full documentation lives in [`docs/`](docs/):

- [Architecture](docs/ARCHITECTURE.md) — project layout, IPC boundary, data flow
- [Build & Release](docs/BUILD.md) — local builds and CI release pipeline
- [Development guide](docs/DEVELOPMENT.md) — scripts, testing, project conventions

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Vite dev server (frontend only) |
| `bun run tauri dev` | Run the full desktop app in dev mode |
| `bun run build` | Type-check and build the frontend |
| `bun run tauri build` | Build the production desktop bundle |
| `bun run test` | Run frontend unit tests (Vitest) |
| `bun run test:coverage` | Run frontend tests with coverage |
| `bun run test:rust` | Run Rust test suite (`cargo test`) |
| `bun run test:all` | Run both frontend and Rust test suites |

## Releasing

Pushing a tag matching `release-v*.*.*` triggers [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds macOS (DMG, Apple Silicon) and Windows (NSIS) installers and attaches them to a GitHub Release.

```bash
git tag release-v0.2.0
git push origin release-v0.2.0
```

See [docs/BUILD.md](docs/BUILD.md#ci-release-pipeline) for details, including optional code-signing secrets.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, and the PR process.

## License

[MIT](LICENSE)
