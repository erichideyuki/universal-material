# Task 04 — Fold the Angular wrapper into `packages/angular` & dissolve the submodule (HIGH RISK)

> **Status:** ready to implement — **HIGHEST RISK in the migration** (foreign-root git graft + submodule dissolution). Serial; do **not** run in a worktree.
> **Architecture authority:** `planning/architecture/00-decision.md` §2.4–§2.5, §6, §7, §8 (the fold + git-history + dependency-rewrite sections); `planning/current/05-angular-consumption-wiring.md` (the full "before" wiring); `planning/current/07-git-and-release-state.md` §2, §3, §4 (git baseline + foreign-root constraint).
> **One-line scope:** Graft the standalone Angular repo's pushed `feature/m3` branch into `packages/angular/` via **history-preserving `git subtree add`**, **dissolve** the inner `universal-material-web` git submodule, **delete** `scripts/build-web.mjs` + its `pre*` hooks, **repoint** the tsconfig `@universal-material/web` path from the submodule's `universal-material-web/dist/index` to the monorepo root's `../../dist/index` (the docs-app pattern), and dedupe the 7 hand-mirrored runtime deps. The published web contract stays a `peerDependency` in `src/package.json` only.

---

## Scope (ONE unit only)

This is the single, central, highest-risk unit of the monorepo migration: **moving the publishable Angular wrapper LIBRARY into the web-rooted monorepo while preserving its git history, and severing every one of the three submodule-era coupling mechanisms.** Concretely, in `D:/Projects/universal-material-web` (the monorepo root, already the `@universal-material/web` package):

> **What is kept under `packages/angular`:** ONLY the publishable Angular **library** — its library `src/`, `package.json`, `tsconfig.lib*.json` (and the root `tsconfig.json`), `ng-package.json`, the karma/test config, and the README. **The Angular demo app is RETIRED and is NOT a deliverable here** (locked decision). It is not folded, not built, and not kept under `packages/angular`. Its migrated example pages live on only as *source material* for the "Using with Angular" docs page authored in **`11-docs-integration.md`** (see the note in Step 4b below). The `git subtree add` graft mechanically brings the **whole** Angular repo tree (library + demo + any e2e), so the demo and other non-library top-level dirs are **removed in an explicit post-fold step** (Step 4b) and the removal committed, leaving `packages/angular` library-only.

1. **History-preserving graft.** `git subtree add --prefix=packages/angular` from the *pushed* `feature/m3` branch of `D:/Projects/universal-material-angular` (URL or local remote), so all Angular commits land reachable under `packages/angular/` with `git log`/`git blame` intact.
2. **Dissolve the inner submodule** that rides along inside the grafted tree: `universal-material-web/` (the web repo vendored as a git submodule inside the Angular repo). Remove `packages/angular/.gitmodules`, deindex the gitlink, delete the directory, and purge `.git/modules/...`.
3. **Strip the retired demo app (and any e2e) from the grafted tree** so `packages/angular` is library-only: `git rm -r packages/angular/demo` (+ any e2e dir), drop the `demo` (and any e2e) project entries from `packages/angular/angular.json`, remove demo-only configs, and commit. The demo's migrated example pages are preserved as source material for task 11 (see Step 4b note) — they are read from the standalone Angular repo / git history, not kept here.
4. **Delete the build-before-serve shim:** `packages/angular/scripts/build-web.mjs` plus the `prestart` / `prebuild` / `prebuild:demo` / `pretest` npm hooks in `packages/angular/package.json`.
5. **Repoint the tsconfig path** in `packages/angular/tsconfig.json` — change `@universal-material/web` from the submodule's `universal-material-web/dist/index` to the monorepo root's `../../dist/index` (and `@universal-material/web/*` → `../../dist/*`). **Do NOT remove it.** npm does **not** create a `node_modules/@universal-material/web` symlink for the workspace-**root** package (npm only symlinks `packages/*` members), so the bare specifier cannot resolve via node_modules — it resolves via this tsconfig path to the built `dist/`, exactly as the web docs app already does (`docs/tsconfig.app.json` maps `@universal-material/web` → `../dist/index`).
6. **Dedupe the 7 runtime deps** (`lit`, `@lit/context`, `@lit-labs/virtualizer`, `@material/material-color-utilities`, `@bart-krakowski/get-week-info-polyfill`, `dompurify`, `swiper`) — they hoist from the root web package; drop them from `packages/angular/package.json`.
7. **Keep `@universal-material/web` as a `peerDependency`** in the PUBLISHED library manifest `src/package.json` only (the published contract, bumped to `^3.10.0`). **Do NOT add `@universal-material/web` to the workspace `packages/angular/package.json`** — neither as a `dependency` nor as a `peerDependency` (a workspace-manifest peer triggers an npm `ETARGET` against the registry, since the root web package is unpublished/local). Dev-time resolution is the tsconfig path from Step 5.
8. **Re-point the `angular.json` SCSS coupling** from `universal-material-web/scss/universal-material.scss` to the workspace package's SCSS.

**This task does NOT:**
- Move the web library off the repo root (web **stays at root** — `00-decision.md` §4). It does not touch web `src/`, `dist/`, `scss/`, `gulpfile.js`, `skills/`, `.claude-plugin/`, the postinstall patch, or the web `docs/` app.
- Add the root `"workspaces": ["packages/*"]` array, root orchestration scripts, `.changeset/`, or `tsconfig.base.json` — those land in **02-monorepo-scaffold.md** (precondition) and **03-relocate-web-package.md**.
- Build the cross-package task graph / build order (`build:web` before `build:angular`) — that is **05-build-orchestration.md**.
- Set up Changesets/CI/release — those are **13-versioning-and-release.md** and **14-ci-pipeline.md**.
- Touch any other wrapper package (`packages/react`, `vue`, `svelte`, `solid`).

---

## Preconditions & Dependencies

Hard dependencies, by canonical task **filename** (both must have landed on the integration branch before this task runs):

- **`02-monorepo-scaffold.md`** — adds `"workspaces": ["packages/*"]` to the root `package.json`, creates the `packages/` directory, adds `.changeset/config.json` and `tsconfig.base.json`. Without `"workspaces"`, the grafted `packages/angular` is not a workspace member and its own deps/devDeps do not install. (Note: npm symlinks `packages/*` *members* into `node_modules`, but never the workspace-**root** package, so `node_modules/@universal-material/web` is **not** created — `packages/angular` resolves web via a tsconfig path to `../../dist`, see Step 5.) **The subtree graft in Step 2 below must target `packages/angular`, which only becomes a workspace member once 02 has added the glob.**
- **`03-relocate-web-package.md`** — configures the root `package.json` as the workspace **coordinator** while leaving web at root (the deliberate dual role from `00-decision.md` §4). This task assumes the root package name is `@universal-material/web` (it already is — `D:/Projects/universal-material-web/package.json` line 2) and that its built `dist/` is the type/SCSS surface `packages/angular` consumes via relative tsconfig/build paths (npm does not expose the root package by name in `node_modules`).

Also required (verified baseline facts, from `planning/current/07-git-and-release-state.md`):

- **The Angular migration must already be committed AND pushed** on `feature/m3`. As captured, `feature/m3` (tip `d5426a4`, fully pushed to `origin/feature/m3`) still carries a **large uncommitted working-tree migration** (`121 files changed, +557/−4283`: the new `src/value-accessors/**` CVAs, demo pages, removed legacy `collapse`/`expansion-panel`/`slider`/`datepicker`). **`git subtree add` folds committed history only** — if that work is not committed and pushed first, the graft silently captures only `d5426a4`'s tree and loses the entire migration. Committing + pushing that work is the job of **`01-integrate-and-commit-angular.md`** (Wave 0). **Verify with V0 below before grafting.**
- **Tooling baseline:** npm 11 / Node 24 (workspaces native), per `00-decision.md` §3. Run `git --version` ≥ 2.x for `subtree`.

Downstream tasks that depend on THIS one: **05-build-orchestration.md** (needs `packages/angular` present + the workspace dep wired) and **14-ci-pipeline.md**.

---

## Context (enough to execute COLD)

A fresh agent with zero chat memory can execute this from the facts below. All paths are absolute. Two repos are involved:

- **Monorepo root (target):** `D:/Projects/universal-material-web` — already the `@universal-material/web@3.9.0` package (root `package.json` line 2–3), next publish `3.10.0`. After 02/03 it is also the workspace coordinator (`"workspaces": ["packages/*"]`).
- **Standalone Angular repo (source of the graft, KEEP AS BACKUP):** `D:/Projects/universal-material-angular` — `universal-material-angular@0.0.0`, `"private": true`. Its publishable **library** manifest is `D:/Projects/universal-material-angular/src/package.json` = `@universal-material/angular@3.6.2`. Remote: `https://github.com/universal-material/universal-material-angular`. Migration branch `feature/m3` (tip `d5426a4`, **fully pushed**, 8 commits ahead of `master`).

### The three coupling mechanisms being severed (verified "before" state)

All three are documented in `planning/current/05-angular-consumption-wiring.md` and confirmed against the live files:

1. **Git submodule** — `D:/Projects/universal-material-angular/.gitmodules` (verified contents):
   ```ini
   [submodule "universal-material-web"]
   	path = universal-material-web
   	url = https://github.com/universal-material/universal-material-web.git
   	branch = main
   ```
   The web repo is vendored at `D:/Projects/universal-material-angular/universal-material-web/` (a full source checkout: has both `src/index.ts` and a built `dist/`). Gitlink pinned at web `e804c22` (= web `main`). The submodule `.git` file points to `gitdir: ../.git/modules/universal-material-web`. Per `07-git-and-release-state.md` §2 the gitlink is reported **`-dirty`** because the inner web checkout has untracked `.claude/ GRID.md NEXT.md`. **After the subtree graft, this submodule rides along inside `packages/angular/` and must be dissolved.**

2. **Build-before-serve shim** — `D:/Projects/universal-material-angular/scripts/build-web.mjs` (verified, 61 lines). It: guards the submodule exists; skips if `dist/index.js` is present unless `FORCE_WEB_BUILD=1`; on first run does `npm install --ignore-scripts --no-audit --no-fund --legacy-peer-deps` **inside the submodule** (a second nested `node_modules`); runs `npm run script:sass-to-ts` then `npm run build:bundle` (tsc) inside the submodule; swallows tsc errors as benign nested-lit TS2742 warnings; fatal only if `dist/index.js` is missing. Wired in `D:/Projects/universal-material-angular/package.json` (verified lines 6–15) as:
   ```jsonc
   "build:web":     "node scripts/build-web.mjs",
   "prestart":      "npm run build:web",
   "prebuild":      "npm run build:web",
   "prebuild:demo": "npm run build:web",
   "pretest":       "npm run build:web",
   ```

3. **tsconfig path hack + duplicated deps + SCSS path** — `D:/Projects/universal-material-angular/tsconfig.json` `compilerOptions.paths` (verified lines 17–33):
   ```jsonc
   "@universal-material/web":   ["universal-material-web/dist/index"],
   "@universal-material/web/*": ["universal-material-web/dist/*"],
   ```
   (The same block self-aliases `"@universal-material/angular": ["src"]` and `"@docs/*": ["demo/src/app/*"]` — **keep those**, they are intra-package, not the hack.) Plus the **7 runtime deps hand-mirrored** into `D:/Projects/universal-material-angular/package.json` `dependencies` (verified lines 25–39): `@bart-krakowski/get-week-info-polyfill ^1.0.8`, `@lit-labs/virtualizer ^2.1.1`, `@lit/context ^1.1.5`, `@material/material-color-utilities ^0.3.0`, `dompurify ^3.4.5`, `lit ^3.2.1`, `swiper ^12.1.4` — each identical to the web library's `dependencies` (web `package.json` lines 60–66). Plus the SCSS coupling in `D:/Projects/universal-material-angular/angular.json` (verified line 34):
   ```jsonc
   "styles": [ /* … */ "universal-material-web/scss/universal-material.scss", "demo/src/styles.scss" ]
   ```

### The published contract that must SURVIVE the rewrite (verified)

- `D:/Projects/universal-material-angular/src/package.json` (the **library** manifest ng-packagr publishes) already declares web as a **peerDependency**:
  ```jsonc
  { "name": "@universal-material/angular", "version": "3.6.2",
    "dependencies": { "animated-scroll-to": "^2.3.0" },
    "peerDependencies": { "@universal-material/web": "^3.9.0" },
    "sideEffects": false }
  ```
- `D:/Projects/universal-material-angular/src/ng-package.json` whitelists it:
  ```jsonc
  { "dest": "../dist/@universal-material/angular", "lib": { "entryFile": "index.ts" },
    "allowedNonPeerDependencies": ["@universal-material/web", "animated-scroll-to"] }
  ```
  After the graft these become `packages/angular/src/package.json` and `packages/angular/src/ng-package.json`. **The published library's web dependency is and stays a peer** — bump `^3.9.0` → `^3.10.0` (matching the web next-publish per `00-decision.md` §8).

### What consumes `@universal-material/web` in the Angular source (verified — 20 files)

`@universal-material/web` is imported across `D:/Projects/universal-material-angular/src/**` — `src/index.ts` (re-exports e.g. `SnackbarDuration`), the `src/value-accessors/*` CVAs (+ specs), `src/tab-bar/tab-bar.directive.ts`, `src/dialog/confirm-dialog/*`, `src/snackbar/snackbar.service.ts`. All resolve today via the tsconfig path map; after the rewrite they still resolve via a tsconfig path — **repointed** from the submodule's `dist` to the monorepo root's `../../dist` (Step 5) — with **no source change** (bare specifier is identical).

### Versioning constraints (from `00-decision.md` §8, §9)

- **Angular baseline continues the `3.x` line → `3.7.0`** (NOT `4.0.0` — `4.0.0` would visually collide with the M3→M4 spec-major policy). The `3.6.2` in `src/package.json` continues to `3.7.0`. (The actual version bump is owned by `13-versioning-and-release.md`/Changesets; this task only ensures the manifest is structurally correct and the web peer range is right.)
- **Web `3.9.0` → `3.10.0`** is the web side, owned by 03/13; referenced here only because the Angular peer range targets it (`^3.10.0`).
- **M3-major policy preserved:** major == Material generation; in-library breaks bump the minor.

### Web-resolution mechanics (the replacement for all three couplings)

**Why (npm doesn't symlink the workspace root).** npm workspaces symlinks each `packages/*` *member* into `node_modules/<name>`, but it does **NOT** create a `node_modules/@universal-material/web` symlink for the workspace-**root** package. The root `package.json` *is* `@universal-material/web` (the deliberate dual role — `00-decision.md` §4); npm never self-symlinks the coordinator. So sibling packages under `packages/*` **cannot** resolve the bare `@universal-material/web` specifier through node_modules. This is the repo-proven reality verified during task 04 execution (commit `d6157ae`).

The correct, repo-proven pattern is the one the **web docs app already uses**: an internal monorepo consumer resolves web by mapping the bare specifier to the **built `dist/`** via a tsconfig `paths` entry (`docs/tsconfig.app.json` maps `@universal-material/web` → `../dist/index`). For `packages/angular`, the equivalent path is `../../dist/index` (relative to the consumer), with **web BUILT FIRST**. The 7 runtime deps still hoist from the root web package's `dependencies` to the shared root `node_modules`, so the Angular library resolves a **single** copy of `lit` et al. (killing the two-`lit` divergence risk). The web library's published contract is **unchanged** — `@universal-material/web@3.10.0` from npm is byte-for-byte what it would have been pre-monorepo.

> **Install note:** `npm install` at the monorepo root requires **`--legacy-peer-deps`** — the web repo's `@angular/elements@20.0.5` pins peer `@angular/core@20.0.5`, while `packages/angular` pulls `@angular/core@^20.3.0` (an Angular devDep version skew). Follow-up: align the web repo's `@angular/*` devDeps to `^20.3.x` so the flag can be dropped.

### RESOLVE — REVIEW P1-4: the internal web dependency version for publish (CONCRETE handling)

The Angular package needs `@universal-material/web` two ways: **dev-time** (build resolution) and **publish-time** (a concrete semver range npm consumers can resolve from the registry). Resolution for this monorepo (npm workspaces, **not** pnpm — so there is no literal `workspace:*` protocol), as actually implemented in commit `d6157ae`:

- **Dev-time resolution is the tsconfig path, NOT a node_modules symlink.** `packages/angular/tsconfig.json` `paths` maps `@universal-material/web` → `../../dist/index` and `@universal-material/web/*` → `../../dist/*` (the docs-app pattern). There is **no `node_modules/@universal-material/web` symlink** for a workspace-root package, so this path is what makes the bare specifier resolve under `ng build`. Web must be **built first** so `../../dist/index` exists.
- **Publish-time contract is a peer on `src/package.json` ONLY.** The library is published by `ng-packagr` (which reads `src/package.json`), and `src/package.json` already lists `"peerDependencies": { "@universal-material/web": "^3.9.0" }` — bump it to **`"^3.10.0"`**. `ng-package.json` `allowedNonPeerDependencies` still whitelists it.
- **Do NOT add `@universal-material/web` to the workspace `packages/angular/package.json`** — neither `dependencies` nor `peerDependencies`. A workspace-manifest peer (or dep) entry naming the unpublished root web package triggers an npm **`ETARGET`** at install time (npm tries to resolve the range against the registry and finds no matching published version). The workspace manifest stays web-free; dev resolution comes from the tsconfig path, the published peer lives only in `src/package.json`. **No `"*"` or `workspace:*` string ever reaches any manifest.**

  **Decision for THIS task (matches commit `d6157ae`):** tsconfig path → `../../dist`, no web entry on the workspace manifest, published `^3.10.0` peer on `src/package.json`. `ng build` is green with web built first.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web` unless noted. Windows / **PowerShell**. Do this on a dedicated integration branch (created by `02`); never on `main`. **This is destructive to git state — read the "Rollback notes" / "How to abort & reset" section BEFORE starting.**

### Step 0 — Backup & preconditions (do FIRST, non-negotiable)

```powershell
# 0a. Confirm 02 landed: packages/* is a workspace member.
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.workspaces))"
#   expect: ["packages/*"]   (if not, STOP — 02-monorepo-scaffold.md hasn't landed)

# 0b. Back up the standalone Angular checkout (KEEP until the monorepo build is verified green).
#     Mirror clone so HEAD/branches/reflog are all preserved off to the side.
git clone --mirror D:/Projects/universal-material-angular D:/Projects/_backup-universal-material-angular.git
#     (Also tag the source for archival, per 07-git-and-release-state.md §4 mitigation.)
git -C D:/Projects/universal-material-angular tag pre-monorepo-archive feature/m3
git -C D:/Projects/universal-material-angular push origin pre-monorepo-archive

# 0c. Snapshot the monorepo's current HEAD so the whole graft can be undone in one reset (see Rollback).
git rev-parse HEAD | Tee-Object -FilePath D:/Projects/_premerge-web-head.txt
git tag pre-angular-fold        # local safety tag; delete after success
```

**V0 precondition gate (MUST pass before Step 2):** confirm the Angular migration is committed AND pushed on `feature/m3` (else the graft loses 121 files of work):
```powershell
git -C D:/Projects/universal-material-angular status --porcelain        # expect: empty (clean tree)
git -C D:/Projects/universal-material-angular rev-list --left-right --count origin/feature/m3...feature/m3
#   expect: "0  0"  (fully pushed; nothing local-only)
```
If the tree is dirty or there are unpushed commits, **STOP** — finish `01-integrate-and-commit-angular.md` first.

### Step 1 — Prune stale web worktrees (so they don't pollute the graft)

Per `07-git-and-release-state.md` §1, the web repo has two **locked** stale Claude worktree branches at `20eb94d`. Remove them so they don't enter the monorepo DAG:
```powershell
git worktree list
git worktree remove --force D:/Projects/universal-material-web/.claude/worktrees/bridge-cse_011vjAEyfFW4JETG1wxpJKqD
git worktree remove --force D:/Projects/universal-material-web/.claude/worktrees/bridge-cse_01DDrfAhDPMSFEqrJKSRazoj
git worktree prune
git branch -D worktree-bridge-cse_011vjAEyfFW4JETG1wxpJKqD worktree-bridge-cse_01DDrfAhDPMSFEqrJKSRazoj
#   (these may already be gone if 02 pruned them — non-fatal if so)
```

### Step 2 — Graft the Angular history under `packages/angular/` (THE high-risk step)

`git subtree add` handles the **unrelated root** automatically (web root `14adf24`, Angular root `f9b9489` share no history — `07-git-and-release-state.md` §3.1). Use the **local repo** as the remote (fastest, offline-safe); the GitHub URL also works.

```powershell
# 2a. Add the Angular repo as a git remote and fetch its pushed migration branch.
git remote add angular D:/Projects/universal-material-angular
git fetch angular feature/m3

# 2b. Graft all Angular commits under packages/angular/, history preserved, NOT squashed
#     (non-squash keeps blame on the 8 CVA migration commits — 00-decision.md §7).
git subtree add --prefix=packages/angular angular feature/m3
```
This creates a merge commit splicing `feature/m3` into the DAG with every path rewritten under `packages/angular/`. After it: `git log -- packages/angular/src/value-accessors/` shows the original Angular commits; `git blame packages/angular/src/value-accessors/select-control-value-accessor.ts` works.

> **If `subtree add` errors** (e.g. "prefix 'packages/angular' already exists" because 02 created an empty dir): the prefix must NOT pre-exist with tracked content. Ensure `packages/angular` is absent/empty-and-untracked before grafting (`git rm -r --cached packages/angular` if 02 added a placeholder, or delete the empty dir). See "How to abort & reset".

### Step 3 — Dissolve the inner `universal-material-web` submodule (now under `packages/angular/`)

After the graft, the Angular repo's submodule lives at `D:/Projects/universal-material-web/packages/angular/universal-material-web` with its config at `packages/angular/.gitmodules`. It must become nothing (the real web tree is the monorepo root). The submodule's git metadata was recorded under the **Angular** repo's `.git/modules`, but the graft brings the **gitlink + `.gitmodules`** into the monorepo index; dissolve both:

```powershell
# 3a. De-init (best-effort; the module dir may not be materialized in the monorepo working tree).
git submodule deinit -f packages/angular/universal-material-web 2>$null

# 3b. Remove the gitlink from the index and working tree.
git rm -f packages/angular/universal-material-web

# 3c. Delete the submodule declaration file that came in with the graft.
git rm -f packages/angular/.gitmodules

# 3d. Purge any leftover module metadata the graft/checkout may have created.
if (Test-Path D:/Projects/universal-material-web/.git/modules/packages/angular/universal-material-web) {
  Remove-Item -Recurse -Force D:/Projects/universal-material-web/.git/modules/packages/angular/universal-material-web
}

# 3e. Strip the submodule section from .git/config if present.
git config --remove-section submodule.universal-material-web 2>$null
git config --remove-section "submodule.packages/angular/universal-material-web" 2>$null
```
Confirm no `gitlink` (mode `160000`) remains:
```powershell
git ls-files -s packages/angular | Select-String "^160000"   # expect: no output
```

### Step 3b — Strip the retired demo app (and any e2e) so `packages/angular` is library-only

`git subtree add` grafts the **whole** Angular repo tree — that includes the **retired demo app** (`demo/`) and any `e2e/` directory, neither of which is a deliverable (locked decision: only the publishable Angular **library** is folded). Remove them and commit so `packages/angular` contains only the library.

> **PRESERVE-BEFORE-REMOVE (source material for task 11).** The demo's migrated example pages at `D:/Projects/universal-material-angular/demo/src/app/components/*` (checkbox, chip-field, datepicker, radio, search, select, slider, tab-bar, text-field, typeahead) are the **SOURCE MATERIAL** for the "Using with Angular" docs page authored in **`11-docs-integration.md`** (task 11 pulls its `[(ngModel)]`/reactive-forms snippets from them). Before removing the demo from `packages/angular`, ensure those pages remain reachable for task 11 **either** in the untouched standalone repo at `D:/Projects/universal-material-angular/demo/src/app/components/*` (it is never modified by this task — see Rollback "Backup is guaranteed safe") **or** in the grafted git history under `packages/angular/demo/...` (recoverable via `git log`/`git show` after removal). Task 11 reads from one of those — do **not** delete the standalone repo, and keep the `pre-monorepo-archive` tag (Step 0b) pushed so the demo is always recoverable.

```powershell
# 3b-i. Remove the retired demo app (and any e2e harness) from the grafted tree.
git rm -r packages/angular/demo
if (Test-Path packages/angular/e2e) { git rm -r packages/angular/e2e }

# 3b-ii. Remove any demo-only configs that came in with the graft (e.g. a demo-scoped tsconfig).
#        Leave the library configs (tsconfig.json, tsconfig.lib*.json, ng-package.json) intact.
if (Test-Path packages/angular/tsconfig.demo.json) { git rm packages/angular/tsconfig.demo.json }
```
Then edit `D:/Projects/universal-material-web/packages/angular/angular.json` to **delete the `demo` project entry** (and any `e2e`/demo-only architect targets) from `projects`, leaving only the `universal-material-angular` **library** project. Also drop any demo-only `scripts` from `packages/angular/package.json` that survive (e.g. `"build:demo"`, `"start"` if it served `demo`) — those are re-pruned in Step 4 alongside the `pre*` hooks. Commit this removal:
```powershell
git add -A
git commit -m @'
Strip retired Angular demo app from packages/angular (library-only fold)

The subtree graft brought the whole Angular repo tree. The demo app is retired
(not a monorepo deliverable); only the publishable @universal-material/angular
library is kept. The demo's migrated example pages remain the source material
for the "Using with Angular" docs page (task 11), recoverable from the standalone
repo and from grafted git history.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```
Confirm only the library remains:
```powershell
Test-Path packages/angular/demo                                 # expect: False
node -e "const a=require('./packages/angular/angular.json'); console.log(Object.keys(a.projects))"
# expect: ['universal-material-angular']  (no 'demo' / 'e2e')
```

### Step 4 — Delete the build-before-serve shim and its hooks

```powershell
git rm -f packages/angular/scripts/build-web.mjs
#   (If packages/angular/scripts/ is now empty, leave it — harmless — or remove if empty.)
```
Then edit `D:/Projects/universal-material-web/packages/angular/package.json` scripts (these came from `D:/Projects/universal-material-angular/package.json` lines 4–16). **Remove** the four `pre*` hooks and the `build:web` script. Because the demo app was stripped in Step 3b, also **remove the demo-only scripts** (`"start"` served `demo`; `"build:demo"` built `demo`) — keep only the **library** scripts `build`/`watch`/`test`/`ng`:
```jsonc
// packages/angular/package.json  →  "scripts" becomes (library-only):
"scripts": {
  "ng": "ng",
  "build": "ng build --project universal-material-angular",
  "watch": "ng build --watch --configuration development",
  "test": "ng test universal-material-angular"
}
```
(Deleted: `"build:web"`, `"prestart"`, `"prebuild"`, `"prebuild:demo"`, `"pretest"`, plus the demo-only `"start"` and `"build:demo"` whose `demo` project no longer exists. Build order — web before angular — is enforced by the root orchestration script in `05-build-orchestration.md`, not these hooks.)

### Step 5 — Repoint the tsconfig path (NOT remove it)

Edit `D:/Projects/universal-material-web/packages/angular/tsconfig.json` `compilerOptions.paths` (grafted from `D:/Projects/universal-material-angular/tsconfig.json` lines 17–33). **Repoint the two `@universal-material/web` entries** from the submodule path to the monorepo root's built `dist/`; KEEP the `@universal-material/angular`, `@universal-material/angular/*`, and `@docs/*` entries:
```jsonc
// BEFORE (submodule-era):
"@universal-material/web":   ["universal-material-web/dist/index"],
"@universal-material/web/*": ["universal-material-web/dist/*"],
// AFTER (monorepo root dist, relative to packages/angular — the docs-app pattern):
"@universal-material/web":   ["../../dist/index"],
"@universal-material/web/*": ["../../dist/*"],
```
Result (the full `paths`):
```jsonc
"paths": {
  "@universal-material/web":       ["../../dist/index"],
  "@universal-material/web/*":     ["../../dist/*"],
  "@universal-material/angular":   ["src"],
  "@universal-material/angular/*": ["src/*"],
  "@docs/*": ["demo/src/app/*"]
}
```
**Do NOT delete these entries.** npm does not symlink the workspace-**root** package into `node_modules`, so there is no `node_modules/@universal-material/web` to resolve through — the bare specifier resolves via this tsconfig path to the built `../../dist/index` (the same mechanism the web docs app uses via `docs/tsconfig.app.json`). Web must be **built first**. No source import changes — the specifier string is identical in all 20 consuming files.

### Step 6 — Dedupe the 7 runtime deps + set the web peer (resolve P1-4)

Edit `D:/Projects/universal-material-web/packages/angular/package.json`:

**6a. Remove the 7 hand-mirrored web runtime deps** from `dependencies` (they hoist from the root web package). Delete these lines (verified present at `D:/Projects/universal-material-angular/package.json` lines 25–39):
```jsonc
"@bart-krakowski/get-week-info-polyfill": "^1.0.8",
"@lit-labs/virtualizer": "^2.1.1",
"@lit/context": "^1.1.5",
"@material/material-color-utilities": "^0.3.0",
"dompurify": "^3.4.5",
"lit": "^3.2.1",
"swiper": "^12.1.4",
```
**Keep** the Angular-only deps (`@angular/*`, `@universal-material/core`, `@mdi/font`, `@stackblitz/sdk`, `animated-scroll-to`, `highlight.js`, `ngx-highlight-js`, `rxjs`, `tslib`) and all `devDependencies`.

**6b. Do NOT add `@universal-material/web` to the workspace `packages/angular/package.json` at all** — neither `dependencies` nor `peerDependencies`. A workspace-manifest entry naming the unpublished root web package triggers an npm **`ETARGET`** at install (npm resolves the range against the registry and finds no published version that satisfies it). Dev-time resolution is provided by the **tsconfig path** (`../../dist`, Step 5), not a workspace-manifest entry. The consumer contract is documented by the **published** peer on `src/package.json` (Step 6c).

> This is the actual implemented state (commit `d6157ae`): the workspace `packages/angular/package.json` has **no** `@universal-material/web` entry; `ng build` is green because the tsconfig path resolves the specifier to the built `../../dist/index`.

**6c. Bump the PUBLISHED peer range** in the library manifest `D:/Projects/universal-material-web/packages/angular/src/package.json` (grafted from Angular `src/package.json`): change `"@universal-material/web": "^3.9.0"` → `"^3.10.0"`. This is the **only** place the web dependency is declared. Leave `version` for `13-versioning-and-release.md`/Changesets to bump to `3.7.0`; leave `dependencies.animated-scroll-to` and `sideEffects` untouched. The `ng-package.json` `allowedNonPeerDependencies` (`["@universal-material/web", "animated-scroll-to"]`) stays as-is — it correctly whitelists the peer.

### Step 7 — Re-point the `angular.json` SCSS coupling

Edit `D:/Projects/universal-material-web/packages/angular/angular.json` (grafted; verified line 34). Replace the submodule working-tree SCSS path with a path to the monorepo root's SCSS. **Because there is no `node_modules/@universal-material/web` symlink for the root package**, point at the root `scss/` via a relative path (the web package exposes it — root `package.json` line 19 `"sass": "scss/universal-material.scss"`):
```jsonc
// BEFORE (submodule working tree):
"universal-material-web/scss/universal-material.scss",
// AFTER (monorepo root scss, relative to packages/angular):
"../../scss/universal-material.scss",
```
> Do **not** use `node_modules/@universal-material/web/scss/...` here — that symlink does not exist for the workspace-root web package. The relative `../../scss/...` (mirroring the `../../dist` tsconfig path and the docs app's `../scss/...`) is the resolvable path.

### Step 8 — Install, link, and stage everything

```powershell
# 8a. Re-run the workspace install at the ROOT so the hoist happens.
#     --legacy-peer-deps is REQUIRED: web's @angular/elements@20.0.5 pins peer
#     @angular/core@20.0.5, while packages/angular pulls @angular/core@^20.3.0.
npm install --legacy-peer-deps
#   This hoists lit/@lit/context/etc. into the shared node_modules. It does NOT
#   create node_modules/@universal-material/web — npm does not symlink the
#   workspace-ROOT package. Web is resolved by the tsconfig path (../../dist), so
#   web must be BUILT FIRST for ng build to see ../../dist/index.

# 8b. Stage the dissolution + edits (the subtree add already committed the graft; these are follow-ups).
git add -A
git commit -m @'
Dissolve Angular submodule; resolve web via tsconfig path to the monorepo dist

Replace the universal-material-web git submodule and scripts/build-web.mjs
build-before-serve shim. Repoint the tsconfig @universal-material/web path from
the submodule's dist to the monorepo root's ../../dist (the web docs-app
pattern), since npm does not symlink the workspace-root web package. Dedupe the
7 runtime deps (they hoist from the root web package) and bump the published web
peer to ^3.10.0 in src/package.json (the only manifest that declares web).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

---

## Acceptance criteria

1. **History grafted, not squashed.** `packages/angular/` exists with the full Angular tree; `git log --oneline -- packages/angular/src/value-accessors/` lists the original Angular migration commits (authors/dates/messages preserved), and `git blame packages/angular/src/value-accessors/select-control-value-accessor.ts` attributes lines to their original commits (not a single import commit).
2. **Submodule fully dissolved.** No `packages/angular/.gitmodules`; no gitlink under `packages/angular` (`git ls-files -s packages/angular` shows no `160000` mode); no `.git/modules/packages/angular/...` directory; no `submodule.*` section in `.git/config`. `packages/angular/universal-material-web/` does not exist as a tracked path.
3. **Library-only fold (demo retired).** `packages/angular/demo/` does not exist (nor any `e2e/`); `packages/angular/angular.json` `projects` lists **only** `universal-material-angular` (no `demo`/`e2e`); the removal is its own commit; and the standalone Angular repo + `pre-monorepo-archive` tag remain intact so the demo's example pages stay recoverable for task 11.
4. **Shim deleted.** `packages/angular/scripts/build-web.mjs` is gone; `packages/angular/package.json` has **no** `build:web` / `prestart` / `prebuild` / `prebuild:demo` / `pretest` scripts, and **no** demo-only `start` / `build:demo` scripts (the `demo` project was removed).
4. **Path repointed (not removed).** `packages/angular/tsconfig.json` `paths` maps `@universal-material/web` → `../../dist/index` and `@universal-material/web/*` → `../../dist/*` (the monorepo root's built dist, the docs-app pattern); the `@universal-material/angular`, `@universal-material/angular/*`, `@docs/*` entries survive. The old submodule path `universal-material-web/dist/index` is gone.
5. **Deps deduped, no web entry on the workspace manifest.** `packages/angular/package.json` `dependencies` no longer lists any of the 7 web runtime deps, and `@universal-material/web` is **absent** from the workspace manifest entirely (neither `dependencies` nor `peerDependencies` — a workspace-manifest web entry triggers npm `ETARGET`).
6. **No workspace symlink for web (by design).** After `npm install --legacy-peer-deps` at root, `node_modules/@universal-material/web` does **not** exist (npm does not symlink the workspace-root package); web is resolved by the tsconfig path to `../../dist`. A single hoisted `lit` is shared (no nested `packages/angular/node_modules/lit`).
7. **Published peer bumped (the sole web declaration).** `packages/angular/src/package.json` declares `"peerDependencies": { "@universal-material/web": "^3.10.0" }`; `ng-package.json` still whitelists it. This is the only manifest naming web. **No `"*"` or `workspace:*` string is present anywhere.**
8. **SCSS repointed.** `packages/angular/angular.json` `styles[]` references `../../scss/universal-material.scss` (the monorepo root scss; not the old `universal-material-web/scss/...`, and not a non-existent `node_modules/@universal-material/web/scss/...`).
9. **Angular builds against the monorepo dist (web built first).** With web built into `../../dist/`, `packages/angular` type-checks/builds with web resolved via the tsconfig path and no `build:web` pre-hook — `ng build` is green (commit `d6157ae`). Full build-order verification is `05-build-orchestration.md`; at minimum the bare `@universal-material/web` imports in the 20 consuming files resolve.
10. **Web library untouched.** No changes under web `src/`, `dist/`, `scss/`, `skills/`, `.claude-plugin/`, `gulpfile.js`, the postinstall patch, or `docs/`.
11. **Standalone Angular backup preserved.** `D:/Projects/_backup-universal-material-angular.git` mirror exists and the `pre-monorepo-archive` tag is pushed to the Angular origin.

---

## Verification commands

> Run from `D:/Projects/universal-material-web` (PowerShell) unless noted.

**V0 — precondition (run BEFORE grafting; see Step 0):**
```powershell
git -C D:/Projects/universal-material-angular status --porcelain
git -C D:/Projects/universal-material-angular rev-list --left-right --count origin/feature/m3...feature/m3
# expect: empty porcelain, "0  0"
```

**V1 — history preserved & blame works:**
```powershell
git log --oneline -- packages/angular/src/value-accessors/ | Select-Object -First 10
git blame -L 1,5 packages/angular/src/value-accessors/select-control-value-accessor.ts
# expect: original Angular commit SHAs/authors, NOT a single squashed import commit
```

**V2 — submodule fully gone:**
```powershell
Test-Path packages/angular/.gitmodules                                  # expect: False
Test-Path packages/angular/universal-material-web                       # expect: False
Test-Path D:/Projects/universal-material-web/.git/modules/packages/angular/universal-material-web   # expect: False
git ls-files -s packages/angular | Select-String "^160000"             # expect: no output
git config --get-regexp "^submodule\." ; if ($LASTEXITCODE -ne 0) { "no submodule sections (ok)" }
```

**V2b — retired demo stripped, library-only:**
```powershell
Test-Path packages/angular/demo                                        # expect: False
Test-Path packages/angular/e2e                                         # expect: False
node -e "const a=require('./packages/angular/angular.json'); console.log(Object.keys(a.projects))"
# expect: ['universal-material-angular']   (no 'demo' / 'e2e')
# Source material for task 11 still reachable in the untouched standalone repo:
Test-Path D:/Projects/universal-material-angular/demo/src/app/components   # expect: True
```

**V3 — shim, hooks, path hack removed:**
```powershell
Test-Path packages/angular/scripts/build-web.mjs                        # expect: False
node -e "const s=require('./packages/angular/package.json').scripts; console.log(['build:web','prestart','prebuild','prebuild:demo','pretest','start','build:demo'].filter(k=>k in s))"
# expect: []   (none present — pre* hooks AND demo-only scripts removed)
node -e "const p=require('./packages/angular/tsconfig.json').compilerOptions.paths; console.log(p['@universal-material/web'])"
# expect: [ '../../dist/index' ]   (repointed to the monorepo root dist, NOT removed, NOT the submodule path)
```

**V4 — deps deduped + no web entry on the workspace manifest + published peer set:**
```powershell
node -e "const d=require('./packages/angular/package.json').dependencies||{}; const dup=['@bart-krakowski/get-week-info-polyfill','@lit-labs/virtualizer','@lit/context','@material/material-color-utilities','dompurify','lit','swiper']; console.log('leaked dup deps:', dup.filter(k=>k in d))"
# expect: leaked dup deps: []
node -e "const p=require('./packages/angular/package.json'); console.log('ws dep:', (p.dependencies||{})['@universal-material/web']); console.log('ws peer:', (p.peerDependencies||{})['@universal-material/web'])"
# expect: ws dep: undefined ; ws peer: undefined  (web is ABSENT from the workspace manifest — avoids npm ETARGET)
node -e "const s=require('./packages/angular/src/package.json'); console.log('published peer:', s.peerDependencies['@universal-material/web']); console.log('has dep:', '@universal-material/web' in (s.dependencies||{}))"
# expect: published peer: ^3.10.0 ; has dep: false  (no '*' web range in the published manifest)
```

**V5 — NO web symlink (by design) + single hoisted lit:**
```powershell
npm install --legacy-peer-deps   # --legacy-peer-deps required (web @angular/elements 20.0.5 vs angular @angular/core ^20.3.0)
Test-Path node_modules/@universal-material/web             # expect: False (npm does NOT symlink the workspace-root package)
Test-Path packages/angular/node_modules/lit                # expect: False (hoisted to root)
# Web resolves via the tsconfig path, not node_modules — confirm dist exists once web is built:
Test-Path dist/index.d.ts                                  # expect: True (after web build; the ../../dist tsconfig path target)
```

**V6 — SCSS repointed:**
```powershell
node -e "const a=require('./packages/angular/angular.json'); const s=JSON.stringify(a); console.log('old submodule path present:', s.includes('universal-material-web/scss')); console.log('new root path present:', s.includes('../../scss/universal-material.scss'))"
# expect: old submodule path present: false ; new root path present: true
```

**V7 — web library untouched:**
```powershell
git status --porcelain src dist scss skills .claude-plugin gulpfile.js docs change-compiler-to-add-custom-elements.js
# expect: no output (nothing changed under web's own files)
```

**V8 — Angular consumes web via the tsconfig path (smoke build).** With web already built into `dist/` (its `index.d.ts` present) so the `../../dist/index` tsconfig path resolves — web MUST be built first:
```powershell
cd packages/angular ; npx ng build --project universal-material-angular --configuration development
# expect: resolves '@universal-material/web' via the ../../dist tsconfig path (NOT node_modules — there is no
#         workspace-root symlink), no "cannot find module" errors. ng build is green (commit d6157ae).
# (Full cross-package build ordering — web before angular — is 05-build-orchestration.md.)
```

---

## Rollback notes

### Routine rollback (post-commit, want to undo cleanly)

The graft is one merge commit plus one follow-up commit. To unwind both and return to the exact pre-fold web HEAD captured in Step 0:
```powershell
git reset --hard (Get-Content D:/Projects/_premerge-web-head.txt)   # or: git reset --hard pre-angular-fold
git remote remove angular
git clean -fdx packages/angular 2>$null
```
No web build artifacts, no published contract, and no web `dist/` are touched by this task, so a reset fully restores the prior state. After a successful, verified-green migration, delete the safety tag and head file: `git tag -d pre-angular-fold ; Remove-Item D:/Projects/_premerge-web-head.txt`.

### How to abort & reset (mid-operation, the subtree+submodule dissolution went wrong)

This is the highest-risk unit; abort cleanly with these escalating options.

- **Backup is guaranteed safe.** The standalone Angular repo at `D:/Projects/universal-material-angular` is **never modified** by this task (we only *read* it as a git remote). The Step 0b mirror `D:/Projects/_backup-universal-material-angular.git` and the pushed `pre-monorepo-archive` tag are independent archives. Nothing here can lose Angular history.

- **If `git subtree add` fails or produces a wrong tree** (foreign-root merge gone bad, prefix conflict): the failed `subtree add` may leave a half-merge. Abort it:
  ```powershell
  git merge --abort 2>$null            # if a merge is in progress
  git reset --hard pre-angular-fold    # back to the pre-graft web HEAD
  git remote remove angular 2>$null
  ```
  Then fix the cause (most common: `packages/angular` pre-existed with tracked content from 02 — clear it with `git rm -r --cached packages/angular` and delete the empty dir, commit, then retry the graft) and re-run Step 2.

- **If the foreign-root merge committed but you want it GONE from history** (not just reset): because the graft introduces a **second root** into the DAG, a plain `git reset --hard pre-angular-fold` on the integration branch is sufficient *as long as nothing has been pushed*. The second root becomes unreachable and is pruned by GC. If the branch was already pushed, force-push the reset branch (`git push --force-with-lease`) — this is an **integration branch**, never `main`, so a force-push is acceptable here.

- **If the submodule dissolution (Step 3) left residue** but the graft is otherwise fine: re-run Step 3's purge commands (they are idempotent), then `git status` to confirm no `160000` gitlink and no `.gitmodules` remain. If `.git/modules/packages/angular/...` is stubborn, delete it manually with `Remove-Item -Recurse -Force`.

- **If `npm install` (Step 8) fails** with an `ETARGET` for `@universal-material/web`: confirm the workspace `packages/angular/package.json` does **not** name web in `dependencies` or `peerDependencies` (it must not — the root web package is unpublished, so npm cannot resolve a range against the registry). The web dependency is declared **only** as a peer in `src/package.json`, and dev resolution comes from the tsconfig `../../dist` path, not a node_modules symlink (npm never symlinks the workspace-root package). If install fails on the Angular devDep skew instead, use `npm install --legacy-peer-deps` (web's `@angular/elements@20.0.5` peer-pins `@angular/core@20.0.5` vs `packages/angular`'s `@angular/core@^20.3.0`). If `ng build` then can't find `@universal-material/web`, ensure web was **built first** so `dist/index.d.ts` (the `../../dist/index` path target) exists.

- **Nuclear restart of the whole fold:** `git reset --hard pre-angular-fold`, `git remote remove angular`, `Remove-Item -Recurse -Force packages/angular` (if any stray files), then start again from Step 1. The standalone Angular repo and its mirror are untouched, so an unlimited number of restarts is safe.

---

## Parallelizable in worktree? **no** — why

This task is **serial and must NOT run in a worktree**, for three compounding reasons:

1. **It rewrites the monorepo's git history at the DAG level** — a `git subtree add` foreign-root graft plus a submodule dissolution that edits `.git/modules`, `.git/config`, and the index. Worktrees share the same `.git` object/ref store; running this in a worktree while other tasks operate on the same repo risks corrupting refs, the index, or the module store mid-graft. The operation is inherently single-writer to the repository's history.
2. **It is the trunk every downstream wrapper/build task forks from.** `05-build-orchestration.md` and `14-ci-pipeline.md` depend on `packages/angular` existing with web-resolution wired; the React task (`07`) and others assume the `packages/` layout and that web is consumed from the built root `dist/` (via a relative tsconfig/build path, since npm does not symlink the workspace-root package). Parallelizing it would mean other worktrees branch off a moving, half-grafted target.
3. **It mutates shared root state** — the root lockfile and `node_modules` (via the Step 8 `npm install --legacy-peer-deps` that hoists the 7 deps). Concurrent installs from sibling worktrees would race on the same `node_modules`/lockfile.

It depends on (canonical filenames): **02-monorepo-scaffold.md** and **03-relocate-web-package.md** (and, as a Wave-0 data precondition, **01-integrate-and-commit-angular.md** must have committed+pushed the Angular migration). Run it on the shared integration branch, serially, after those have landed.
