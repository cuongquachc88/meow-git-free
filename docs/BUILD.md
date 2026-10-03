# Build & Release

This document covers building Meow Git locally on macOS and Windows, and how the CI release pipeline works.

## Prerequisites (all platforms)

- [Bun](https://bun.sh) ≥ 1.0 — JS/TS package manager and script runner
- [Rust](https://www.rust-lang.org/tools/install) stable toolchain (`rustup`)
- Node-compatible frontend tooling is bundled via Bun; no separate Node install required

Install JS dependencies once:

```bash
bun install
```

## macOS

### Requirements

- macOS 13+ (Ventura or later recommended)
- Xcode Command Line Tools: `xcode-select --install`
- Rust target for the architecture you're building:
  ```bash
  rustup target add aarch64-apple-darwin   # Apple Silicon
  rustup target add x86_64-apple-darwin    # Intel
  ```

### Dev mode

```bash
bun run tauri dev
```

### Production build (DMG)

```bash
bun run tauri build -- --target aarch64-apple-darwin --bundles dmg
```

Output: `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg`

### Code signing & notarization (optional)

Unsigned builds work for local testing but macOS Gatekeer will warn on distribution. To sign/notarize, set these environment variables before building (same ones used in CI):

| Variable | Purpose |
| --- | --- |
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` signing certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` |
| `APPLE_SIGNING_IDENTITY` | Signing identity string (e.g. `Developer ID Application: ...`) |
| `APPLE_ID` | Apple ID used for notarization |
| `APPLE_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

## Windows

### Requirements

- Windows 10/11
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++ workload)
- WebView2 runtime (preinstalled on most up-to-date Windows systems)
- Rust MSVC toolchain: `rustup default stable-msvc`

### Dev mode

```bash
bun run tauri dev
```

### Production build (NSIS installer)

```bash
bun run tauri build -- --bundles nsis
```

Output: `src-tauri/target/release/bundle/nsis/*-setup.exe`

### Code signing (optional)

| Variable | Purpose |
| --- | --- |
| `WINDOWS_CERTIFICATE` | Base64-encoded `.pfx` certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the `.pfx` |

## CI release pipeline

Release builds are fully automated by [`.github/workflows/release.yml`](../.github/workflows/release.yml).

**Trigger:** push a tag matching `release-vMAJOR.MINOR.PATCH`:

```bash
git tag release-v0.2.0
git push origin release-v0.2.0
```

**What it does:**

1. Validates the tag format and derives the version number.
2. Updates `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` to that version.
3. Builds in parallel on `macos-latest` (target `aarch64-apple-darwin`, `.dmg` bundle) and `windows-latest` (`.exe` NSIS installer).
4. Publishes a GitHub Release (not a draft, not a prerelease) with both installers attached.

**Optional signing secrets** (configure in the repo's GitHub Actions secrets if you want signed/notarized builds): `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`. Builds run fine without them — artifacts will simply be unsigned.

## Running tests before a release

```bash
bun run test:all   # frontend (Vitest) + Rust (cargo test)
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `error: failed to run custom build command for openssl-sys` (Windows) | Ensure MSVC build tools + Rust MSVC toolchain are installed, not the GNU toolchain |
| Blank window in dev mode | Confirm the Vite dev server is running on `http://localhost:1420` (see `tauri.conf.json` `devUrl`) |
| DMG build fails with codesign errors | Either unset the Apple signing env vars for an unsigned local build, or verify certificate/identity values |
| `git2`/libgit2 build errors | Make sure platform C build tools are installed (Xcode CLT on macOS, MSVC Build Tools on Windows) |
