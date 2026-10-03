# Contributing to Meow Git

Thanks for considering a contribution! This project is early-stage, so expect some rough edges and feel free to open issues for anything unclear.

## Getting set up

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for environment setup and project scripts, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the codebase is organized.

```bash
bun install
bun run tauri dev
```

## Workflow

1. Fork the repo and create a branch off `main`: `git checkout -b feat/short-description`
2. Make your change, following the conventions in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#code-organization-conventions)
3. Add or update tests for any behavior change
4. Run the full test suite: `bun run test:all`
5. Commit with a clear, present-tense message (e.g. `fix: handle empty stash list`)
6. Open a pull request against `main` describing **what** changed and **why**

## Pull request expectations

- Keep PRs focused — one logical change per PR is easier to review and revert if needed.
- Include tests for new commands, bug fixes, or Git logic changes.
- Update relevant docs (`README.md`, `docs/`) if behavior, commands, or setup steps change.
- CI must pass (frontend + Rust tests) before merge.

## Reporting bugs

Open an issue with:

- Steps to reproduce
- Expected vs. actual behavior
- OS and app version (`Meow Git` → version shown in the UI, or the tag/commit you built from)
- Relevant logs (devtools console for frontend, terminal output for Rust-side errors)

## Suggesting features

Open an issue describing the use case and problem you're trying to solve, not just the proposed solution — this makes it easier to discuss alternatives.

## Code of conduct

Be respectful and constructive. Disagreements about implementation are fine; personal attacks are not.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE) that covers this project.
