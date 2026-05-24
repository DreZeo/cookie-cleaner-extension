<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` - development phases, when to create tasks, skill routing
- `.trellis/spec/` - package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` - per-developer journals and session traces
- `.trellis/tasks/` - active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g., `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` - reusable Trellis skills
- `.codex/agents/` - optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

# Repository Guidelines

## Project Structure & Module Organization

This is a Manifest V3 browser extension for cache and privacy cleanup. `manifest.json` defines permissions, popup metadata, icons, and the background service worker. `popup.html` is the extension UI shell. `background.js` handles background history and storage work. Frontend behavior lives in `scripts/`, split by feature, such as `cleanup.js`, `permissions.js`, `history.js`, `storage.js`, and shared helpers like `domain-utils.js` and `utils.js`. UI fragments are in `partials/`, CSS is in `styles/`, and extension icons are in `icons/`.

## Build, Test, and Development Commands

There is no package manager setup or build step in this repository. Load the project directly as an unpacked extension:

```powershell
# Edge/Chrome: Extensions page -> Developer mode -> Load unpacked
# Select: C:\Users\admin\Desktop\coding\pro
```

After edits, reload the extension from the browser extensions page and test the popup manually. Use `rg "term" scripts background.js` to search code quickly.

## Coding Style & Naming Conventions

Use modern plain JavaScript ES modules with two-space indentation, `const`/`let`, and small feature-focused functions. File names use lowercase kebab-case, for example `cleanup-actions.js` and `content-settings.js`. Keep shared constants near the top of modules or in `scripts/constants.js`. Preserve existing bilingual UI text where present, and avoid broad rewrites that mix formatting with behavior changes.

## Testing Guidelines

No automated test framework is currently configured. Validate changes manually in Chromium-based browsers, especially popup loading, permission prompts, cleanup actions, history filtering, whitelist behavior, and `chrome.storage.local` persistence. For risky logic changes, add focused manual test notes to the pull request and consider extracting pure helpers that can later be covered by unit tests.

## Commit & Pull Request Guidelines

This repository has no commit history yet, so use clear conventional-style subjects such as `fix: normalize whitelist domains` or `feat: add cleanup summary`. Pull requests should describe the user-facing change, list manual browser checks performed, mention permission or manifest changes, and include screenshots for popup UI changes.

## Security & Configuration Tips

Treat `manifest.json` permission changes as sensitive. Keep optional host access optional unless a feature requires broader access. Do not log cookies, browsing history contents, or storage values beyond what is necessary for debugging.
