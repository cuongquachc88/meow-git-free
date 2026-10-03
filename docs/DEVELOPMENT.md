# Development Guide

## Setup

```bash
bun install
bun run tauri dev
```

This starts the Vite dev server and launches the Tauri window pointed at it (`http://localhost:1420`, hot-reloading the React UI). Rust changes require restarting `tauri dev`.

## Project scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server only (frontend, no native window) |
| `bun run tauri dev` | Full app in dev mode |
| `bun run build` | `tsc` type-check + Vite production build of the frontend |
| `bun run tauri build` | Full production desktop bundle |
| `bun run test` | Vitest unit tests (frontend) |
| `bun run test:watch` | Vitest in watch mode |
| `bun run test:coverage` | Vitest with coverage report |
| `bun run test:rust` | `cargo test` against `src-tauri` |
| `bun run test:all` | Both frontend and Rust test suites |
| `bun run icon:app` | Regenerate app icons from `src-tauri/icons/icon.svg` |

## Code organization conventions

- **Frontend** (`src/`): components are grouped by domain under `src/components/<domain>/` (e.g. `git/`, `accounts/`, `integrations/`). Shared/reusable UI lives in `src/components/shared/`. Layout chrome lives in `src/components/layout/`.
- **IPC calls**: never call `@tauri-apps/api`'s `invoke()` directly from a component — add or reuse a typed wrapper in `src/ipc/`.
- **State**: use the existing Zustand stores in `src/store/` rather than introducing new global state mechanisms. Local component state is fine for UI-only concerns.
- **Backend** (`src-tauri/src/`): Git logic belongs in `src-tauri/src/git/<area>.rs`; the corresponding `#[tauri::command]` wrapper goes in `src-tauri/src/commands/`, then gets registered in the `generate_handler!` list in `lib.rs`.

## Adding a new Tauri command

1. Implement the logic in the appropriate `src-tauri/src/git/*.rs` (or `accounts/`, `ssh/`, `fs/`) module.
2. Expose it as a `#[tauri::command]` function in `src-tauri/src/commands/*.rs`.
3. Register it in the `tauri::generate_handler![...]` list in `src-tauri/src/lib.rs`.
4. Add a typed wrapper in `src/ipc/` and call it from the frontend.
5. Add a Rust test (and/or Vitest test for frontend logic) covering the new behavior.

## Testing

- Run `bun run test:all` before opening a PR.
- Rust tests for Git behavior are colocated in `src-tauri/src/git/` (see `tests.rs`); prefer adding to an existing module's test block over new top-level test files unless testing a new domain.
- Frontend tests use Vitest; colocate `*.test.ts(x)` next to the component or module under test.

## Style

- TypeScript: strict mode is enabled (`tsconfig.json`) — avoid `any`, prefer explicit types in `src/types/`.
- Rust: standard `rustfmt` formatting (`cargo fmt`) and `clippy` (`cargo clippy`) are expected to pass cleanly.
- Tailwind is used for styling; avoid inline style objects where a utility class exists.

## Debugging tips

- Use the WebView devtools (right-click → Inspect, or `Cmd+Option+I` / `F12` in dev builds) for frontend debugging.
- Rust-side logs print to the terminal running `tauri dev`.
- For Git operation bugs, reproduce against a throwaway local repo rather than a real project — several commands (reset, rebase, merge) are destructive.
