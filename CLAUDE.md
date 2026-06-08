# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SecManager (`secman`) is a Tauri 2 desktop app for browsing, editing, and automating AWS Secrets Manager secrets. The frontend is React 19 + Vite + Tailwind 4 / DaisyUI 5, with CodeMirror 6 as the editor and Zustand for state. The native backend is Rust using the AWS SDK for Rust (Secrets Manager + STS). Ships on macOS (aarch64), Windows (x86_64), and Linux (x86_64).

Bun is the package manager **and** task runner — use `bun`/`bunx`, not npm/node. The repo ships a `bun.lock`.

## Commands

```bash
bun install              # install deps

bun run dev              # Vite web preview only (no native shell), port 1420
bun run dev:mac          # full Tauri app (also :windows / :linux)

bun run build            # frontend type-check + build → dist/ (tsc && vite build)
bun run build:mac        # Tauri bundle (also :windows / :linux)

bun run bump:patch       # version bump (also :minor / :major); see Versioning below
bun run generate:icon    # regenerate app icons from src-tauri/original-icon.png
```

There is **no test runner and no separate lint script** on the JS side. `bun run build` (which runs `tsc`) is the type-check gate. Rust quality gates run only in CI (`cargo fmt`, `cargo clippy`, `cargo test`, `cargo check --release`) — run these manually from `src-tauri/` when touching Rust.

A **Husky pre-commit hook** runs `bunx tsc --noEmit` then `bun run build` and blocks the commit on failure. Commits are slow; expect the full build to run.

Per-OS dev/build scripts pass `--config src-tauri/tauri.<os>.conf.json` on top of the base `tauri.conf.json`.

## Architecture

### IPC boundary (the key seam)
All native functionality crosses a single typed boundary:
- **Rust side:** `#[tauri::command]` functions in `src-tauri/src/commands/{aws,config,window}.rs`, all registered in the `invoke_handler!` in `src-tauri/src/lib.rs`. Adding a command means editing both the command file *and* the handler list in `lib.rs`.
- **JS side:** `src/modules/services/tauriApi.ts` is the single wrapper around `invoke(...)`. Every command has a typed entry here; UI/stores call `api.*`, never `invoke` directly (except `show_main_window` in `App.tsx`). Keep argument names in sync — Tauri maps JS camelCase args to Rust snake_case params automatically (e.g. `secretId` → `secret_id`).

### Async event channel (not just request/response)
Two flows return immediately and push results later via Tauri events that the frontend listens for:
- **`fetch_secret_async`** → emits `secret_fetch_ok` / `secret_fetch_error`. Secret content loads are async; the editor store subscribes to these events rather than awaiting the call.
- **`trigger_sso_login`** → spawns `aws sso login --profile <name>`, then polls STS until valid, emitting `sso_login_ok` / `sso_login_timeout`.

When changing secret-loading or SSO behavior, both the emit (Rust) and the listener (frontend hook/store) must change together.

### AWS access model
The Rust backend talks to AWS two ways:
1. **AWS SDK for Rust** (`aws_config::defaults`, `aws_sdk_secretsmanager`, STS) for list/fetch/create/update/delete/restore/SSO-check. Profile selection is via `loader.profile_name(p)`; list operations paginate with `next_token`.
2. **Shelling out to the `aws` CLI** for `sso login`. The CLI is located via `helper/aws_helper.rs::find_aws_cli_path()`, which checks `which` plus hardcoded per-OS install paths — required because the app's PATH may not include the CLI.

`load_profiles` does **not** use the SDK — it hand-parses `~/.aws/config` and `~/.aws/credentials` for `[profile x]` / `[x]` headers.

### Local persistence (`commands/config.rs`)
All app state lives under the OS config dir (`dirs::config_dir()/secmanager/`): `settings.json` (theme, default profile, open_count for the update-defer counter), `secrets_<profile>.json` (name cache), `secrets_meta_<profile>.json` (JSON/binary metadata cache), `bookmarks_<profile>.json`, and `recent_secrets.json`. Caches make app startup instant; "Force reload" deletes the name/metadata caches before re-fetching. Bookmarks are per-profile; recent secrets are global (max 20).

### Frontend structure
Single route (`DashboardPage`) under `MainLayout`; React Router is essentially a shell. State is split across Zustand stores in `src/modules/store/`:
- `useEditorStore` (~500 lines, the core) — multi-tab editor, secret content, save/clone/delete, binary import, async-fetch event handling.
- `useProfileStore` — profiles, default profile, SSO status. `useSecretsListStore` — secret tree/list + caches. `useBookmarksStore`, `useLogsStore` (500-line ring buffer), `useUiStore` (panel sizes/visibility), `useUpdaterStore` (plugin-updater flow with open-count-based defer).

Feature UI lives under `src/modules/shared/` (`editor/`, `sidebar/`, top-level panels), reusable primitives in `shared/components/`, pure logic in `shared/utils/` and `shared/hooks/`. Secret names are split on `/` to build the browser tree (`secretDisplayUtils`, `tabDisplayUtils`). ArgoCD External Secret templates are generated in `shared/utils/argocdTemplateUtils.ts`.

## Versioning & release

Never hand-edit version strings. `scripts/sync-version.mjs` (run via `bun run bump:*`) is the single source of truth — it propagates the version to `package.json`, `src-tauri/Cargo.toml` (`[package]` only), `src-tauri/tauri.conf.json`, **and the download links + version line in `README.md`** (via regex matching the existing markdown). After bumping, regenerate `Cargo.lock` and commit yourself.

Release is tag-driven: pushing a `v*` tag (or `workflow_dispatch`) triggers `ci.yml` (frontend + Rust gates) and `build.yml` (multi-platform build, binary signing, `latest.json` generation for the updater, upload to Cloudflare R2 via `CF_R2_*` secrets). The app auto-updates via `tauri-plugin-updater`.

## Conventions

- UI strings and code comments are frequently in **Vietnamese** — match the surrounding language when editing a file.
- No path aliases configured; imports are relative.
