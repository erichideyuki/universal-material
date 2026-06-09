# Task 04 — Fold the Angular wrapper into `packages/angular` & dissolve the submodule (HIGH RISK)

> **Status:** ready to implement — **HIGHEST RISK in the migration** (foreign-root git graft + submodule dissolution). Serial; do **not** run in a worktree.
> **Architecture authority:** `planning/architecture/00-decision.md` §2.4–§2.5, §6, §7, §8 (the fold + git-history + dependency-rewrite sections); `planning/current/05-angular-consumption-wiring.md` (the full "before" wiring); `planning/current/07-git-and-release-state.md` §2, §3, §4 (git baseline + foreign-root constraint).
> **One-line scope:** Graft the standalone Angular repo's pushed `feature/m3` branch into `packages/angular/` via **history-preserving `git subtree add`**, **dissolve** the inner `universal-material-web` git submodule, **delete** `scripts/build-web.mjs` + its `pre*` hooks + the tsconfig `@universal-material/web` path hack, and replace all three with a **real workspace dependency** on the root `@universal-material/web` package — deduping the 7 hand-mirrored runtime deps.

---

## Scope (ONE unit only)

This is the single, central, highest-risk unit of the monorepo migration: **moving the publishable Angular wrapper LIBRARY into the web-rooted monorepo while preserving its git history, and severing every one of the three submodule-era coupling mechanisms.** Concretely, in `D:/Projects/universal-material-web` (the monorepo root, already the `@universal-material/web` package):

> **What is kept under `packages/angular`:** ONLY the publishable Angular **library** — its library `src/`, `package.json`, `tsconfig.lib*.json` (and the root `tsconfig.json`), `ng-package.json`, the karma/test config, and the README. **The Angular demo app is RETIRED and is NOT a deliverable here** (locked decision). It is not folded, not built, and not kept under `packages/angular`. Its migrated example pages live on only as *source material* for the "Using with Angular" docs page authored in **`11-docs-integration.md`** (see the note in Step 4b below). The `git subtree add` graft mechanically brings the **whole** Angular repo tree (library + demo + any e2e), so the demo and other non-library top-level dirs are **removed in an explicit post-fold step** (Step 4b) and the removal committed, leaving `packages/angular` library-only.

1. **History-preserving graft.** `git subtree add --prefix=packages/angular` from the *pushed* `feature/m3` branch of `D:/Projects/universal-material-angular` (URL or local remote), so all Angular commits land reachable under `packages/angular/` with `git log`/`git blame` intact.
2. **Dissolve the inner submodule** that rides along inside the grafted tree: `universal-material-web/` (the web repo vendored as a git submodule inside the Angular repo). Remove `packages/angular/.gitmodules`, deindex the gitlink, delete the directory, and purge `.git/modules/...`.
3. **Strip the retired demo app (and any e2e) from the grafted tree** so `packages/angular` is library-only: `git rm -r packages/angular/demo` (+ any e2e dir), drop the `demo` (and any e2e) project entries from `packages/angular/angular.json`, remove demo-only configs, and commit. The demo's migrated example pages are preserved as source material for task 11 (see Step 4b note) — they are read from the standalone Angular repo / git history, not kept here.
4. **Delete the build-before-serve shim:** `packages/angular/scripts/build-web.mjs` plus the `prestart` / `prebuild` / `prebuild:demo` / `pretest` npm hooks in `packages/angular/package.json`.
5. **Remove the tsconfig path hack** (`@universal-material/web` → `universal-material-web/dist/index`) in `packages/angular/tsconfig.json` and replace it with a real workspace dependency `"@universal-material/web"` resolved through the npm-workspaces symlink at `node_modules/@universal-material/web`.
6. **Dedupe the 7 runtime deps** (`lit`, `@lit/context`, `@lit-labs/virtualizer`, `@material/material-color-utilities`, `@bart-krakowski/get-week-info-polyfill`, `dompurify`, `swiper`) — they hoist from the root web package; drop them from `packages/angular/package.json`.
7. **Set `@universal-material/web` as a `peerDependency`** of `packages/angular` (the published contract) AND wire the **dev-time** workspace link with a **concrete, verified publish-range strategy** (resolve REVIEW P1-4 below — do not leave "verify later").
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

- **`02-monorepo-scaffold.md`** — adds `"workspaces": ["packages/*"]` to the root `package.json`, creates the `packages/` directory, adds `.changeset/config.json` and `tsconfig.base.json`. Without `"workspaces"`, the grafted `packages/angular` is not a workspace member and `node_modules/@universal-material/web` is never symlinked. **The subtree graft in Step 2 below must target `packages/angular`, which only becomes a workspace member once 02 has added the glob.**
- **`03-relocate-web-package.md`** — configures the root `package.json` as the workspace **coordinator** while leaving web at root (the deliberate dual role from `00-decision.md` §4). This task assumes the root package name is `@universal-material/web` (it already is — `D:/Projects/universal-material-web/package.json` line 2) and that it is resolvable by name as a workspace dependency.

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

`@universal-material/web` is imported across `D:/Projects/universal-material-angular/src/**` — `src/index.ts` (re-exports e.g. `SnackbarDuration`), the `src/value-accessors/*` CVAs (+ specs), `src/tab-bar/tab-bar.directive.ts`, `src/dialog/confirm-dialog/*`, `src/snackbar/snackbar.service.ts`. All resolve today via the tsconfig path map; after the rewrite they resolve via the workspace symlink with **no source change** (bare specifier is identical).

### Versioning constraints (from `00-decision.md` §8, §9)

- **Angular baseline continues the `3.x` line → `3.7.0`** (NOT `4.0.0` — `4.0.0` would visually collide with the M3→M4 spec-major policy). The `3.6.2` in `src/package.json` continues to `3.7.0`. (The actual version bump is owned by `13-versioning-and-release.md`/Changesets; this task only ensures the manifest is structurally correct and the web peer range is right.)
- **Web `3.9.0` → `3.10.0`** is the web side, owned by 03/13; referenced here only because the Angular peer range targets it (`^3.10.0`).
- **M3-major policy preserved:** major == Material generation; in-library breaks bump the minor.

### npm-workspaces dependency mechanics (the replacement for all three couplings)

Under npm workspaces (chosen tool, `00-decision.md` §2.1), `npm install` at `D:/Projects/universal-material-web` symlinks `node_modules/@universal-material/web` → the root web package. The bare specifier `@universal-material/web` then resolves through normal Node resolution — the tsconfig `paths` alias is **deleted**, not repointed. The 7 runtime deps hoist from the root web package's `dependencies` to the shared root `node_modules`, so the Angular demo/app resolves a **single** copy of `lit` et al. (killing the two-`lit` divergence risk). The web library's published contract is **unchanged** — `@universal-material/web@3.10.0` from npm is byte-for-byte what it would have been pre-monorepo.

### RESOLVE — REVIEW P1-4: the internal web dependency version for publish (CONCRETE handling)

The Angular package needs `@universal-material/web` two ways: **dev-time** (the workspace symlink) and **publish-time** (a concrete semver range npm consumers can resolve from the registry). Resolution for this monorepo (npm workspaces, **not** pnpm — so there is no literal `workspace:*` protocol):

- **Primary (recommended):** declare `@universal-material/web` ONLY as a **`peerDependency`** with the concrete published range, and do **NOT** add a `dependencies` entry at all. The library is published by `ng-packagr` (which reads `src/package.json`), and `src/package.json` already lists `"peerDependencies": { "@universal-material/web": "^3.9.0" }` — bump it to **`"^3.10.0"`**. The dev-time link is provided by the **root** workspace install (the web package is hoisted into the shared `node_modules`, satisfying the peer during `ng build`/`ng test`). This is the cleanest path and matches the existing publish mechanism (peer + `allowedNonPeerDependencies`). **No `"*"` or `workspace:*` string ever reaches the published tarball**, because ng-packagr publishes `src/package.json`, whose peer range is an explicit `^3.10.0`.
- **VERIFIED FALLBACK (if a non-peer `dependencies` entry on the *workspace* `package.json` is needed for dev resolution — e.g. tooling that doesn't honor hoisted peers):** add `"@universal-material/web": "*"` to the **workspace** `packages/angular/package.json` `dependencies` (npm workspaces links it via the symlink at install; `"*"` is the npm-workspaces idiom, since `workspace:*` is a pnpm/yarn-berry literal that npm does **not** understand). Then guarantee the published artifact carries a **real** range, NOT `"*"`, by one of:
  1. **(preferred fallback)** Keep the published range in `src/package.json`'s `peerDependencies` as `^3.10.0` (ng-packagr publishes that file, not the workspace `package.json`), so the `"*"` on the workspace manifest never ships. The `"*"` exists only to satisfy dev resolution and is invisible to consumers. **This is the concrete answer: dev `"*"` on the workspace manifest, published `^3.10.0` peer on `src/package.json`.**
  2. **(belt-and-braces, only if the publish pipeline ever flips to publishing the workspace `package.json` directly)** add a `prepublishOnly`/`version` rewrite that replaces `"*"` with the resolved `^3.10.0` range before pack, OR rely on Changesets' publish-time substitution (`00-decision.md` §8: "the `"@universal-material/web": "*"` entry is dev-time-linked; on `changeset publish` Changesets rewrites it to the concrete published range"). **Do not ship a `"*"` web range to npm under any path.**

  **Decision for THIS task:** use the **Primary** (peer-only, range `^3.10.0`, no workspace `dependencies` entry for web). The fallback `"*" + src/package.json peer ^3.10.0` is documented and verified above so a later reviewer who hits a dev-resolution gap has a known-good path that still never ships `"*"`.

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

### Step 5 — Remove the tsconfig path hack

Edit `D:/Projects/universal-material-web/packages/angular/tsconfig.json` `compilerOptions.paths` (grafted from `D:/Projects/universal-material-angular/tsconfig.json` lines 17–33). **Delete only the two `@universal-material/web` entries**; KEEP the `@universal-material/angular`, `@universal-material/angular/*`, and `@docs/*` entries:
```jsonc
// REMOVE these two lines:
"@universal-material/web":   ["universal-material-web/dist/index"],
"@universal-material/web/*": ["universal-material-web/dist/*"],
```
Result (the surviving `paths`):
```jsonc
"paths": {
  "@universal-material/angular":   ["src"],
  "@universal-material/angular/*": ["src/*"],
  "@docs/*": ["demo/src/app/*"]
}
```
The bare `@universal-material/web` specifier now resolves via `node_modules/@universal-material/web` (the workspace symlink). No source import changes — the specifier string is identical in all 20 consuming files.

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

**6b. Add `@universal-material/web` as a `peerDependency`** of the **workspace** `packages/angular/package.json` (this mirrors the published `src/package.json` peer and documents the consumer contract at the workspace level):
```jsonc
// packages/angular/package.json
"peerDependencies": {
  "@universal-material/web": "^3.10.0"
}
```
Per the **Primary** resolution in P1-4 above: **do NOT add a `"@universal-material/web"` entry to `dependencies`.** The dev-time link is satisfied by the root workspace install hoisting the web package into the shared `node_modules`, which fulfills this peer during `ng build`/`ng test`.

> Fallback (only if dev resolution fails): add `"@universal-material/web": "*"` under `dependencies` of the **workspace** manifest — npm links it via the symlink — and rely on the published `src/package.json` peer (`^3.10.0`, Step 6c) so `"*"` never ships. See P1-4 fallback.

**6c. Bump the PUBLISHED peer range** in the library manifest `D:/Projects/universal-material-web/packages/angular/src/package.json` (grafted from Angular `src/package.json`): change `"@universal-material/web": "^3.9.0"` → `"^3.10.0"`. Leave `version` for `13-versioning-and-release.md`/Changesets to bump to `3.7.0`; leave `dependencies.animated-scroll-to` and `sideEffects` untouched. The `ng-package.json` `allowedNonPeerDependencies` (`["@universal-material/web", "animated-scroll-to"]`) stays as-is — it correctly whitelists the peer.

### Step 7 — Re-point the `angular.json` SCSS coupling

Edit `D:/Projects/universal-material-web/packages/angular/angular.json` (grafted; verified line 34). Replace the submodule working-tree SCSS path with the workspace package's SCSS (the web package exposes it — root `package.json` line 19 `"sass": "scss/universal-material.scss"`, and `copy` ships `scss/` into `dist/scss`):
```jsonc
// BEFORE:
"universal-material-web/scss/universal-material.scss",
// AFTER (resolved via the workspace symlink in the shared node_modules):
"node_modules/@universal-material/web/scss/universal-material.scss",
```

### Step 8 — Install, link, and stage everything

```powershell
# 8a. Re-run the workspace install at the ROOT so the symlink + hoist happen.
npm install
#   This creates node_modules/@universal-material/web -> the root web package (symlink),
#   and hoists lit/@lit/context/etc. into the shared node_modules.

# 8b. Stage the dissolution + edits (the subtree add already committed the graft; these are follow-ups).
git add -A
git commit -m @'
Dissolve Angular submodule; consume web as a workspace dependency

Replace the universal-material-web git submodule, scripts/build-web.mjs
build-before-serve shim, and the tsconfig @universal-material/web path hack
with a normal npm-workspaces dependency. Dedupe the 7 runtime deps (they hoist
from the root web package) and bump the published web peer to ^3.10.0.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

---

## Acceptance criteria

1. **History grafted, not squashed.** `packages/angular/` exists with the full Angular tree; `git log --oneline -- packages/angular/src/value-accessors/` lists the original Angular migration commits (authors/dates/messages preserved), and `git blame packages/angular/src/value-accessors/select-control-value-accessor.ts` attributes lines to their original commits (not a single import commit).
2. **Submodule fully dissolved.** No `packages/angular/.gitmodules`; no gitlink under `packages/angular` (`git ls-files -s packages/angular` shows no `160000` mode); no `.git/modules/packages/angular/...` directory; no `submodule.*` section in `.git/config`. `packages/angular/universal-material-web/` does not exist as a tracked path.
3. **Library-only fold (demo retired).** `packages/angular/demo/` does not exist (nor any `e2e/`); `packages/angular/angular.json` `projects` lists **only** `universal-material-angular` (no `demo`/`e2e`); the removal is its own commit; and the standalone Angular repo + `pre-monorepo-archive` tag remain intact so the demo's example pages stay recoverable for task 11.
4. **Shim deleted.** `packages/angular/scripts/build-web.mjs` is gone; `packages/angular/package.json` has **no** `build:web` / `prestart` / `prebuild` / `prebuild:demo` / `pretest` scripts, and **no** demo-only `start` / `build:demo` scripts (the `demo` project was removed).
4. **Path hack removed.** `packages/angular/tsconfig.json` `paths` has **no** `@universal-material/web` entries (only `@universal-material/angular`, `@universal-material/angular/*`, `@docs/*` survive).
5. **Deps deduped.** `packages/angular/package.json` `dependencies` no longer lists any of the 7 web runtime deps; `@universal-material/web` appears as a `peerDependency` at `^3.10.0`.
6. **Workspace link real.** After `npm install` at root, `node_modules/@universal-material/web` is a symlink to the root web package, and `npm ls @universal-material/web` shows it resolved from the workspace (not a registry download). A single hoisted `lit` is shared (no nested `packages/angular/node_modules/lit`).
7. **Published peer bumped.** `packages/angular/src/package.json` declares `"peerDependencies": { "@universal-material/web": "^3.10.0" }`; `ng-package.json` still whitelists it. **No `"*"` or `workspace:*` string is present in the published manifest** (`src/package.json`).
8. **SCSS repointed.** `packages/angular/angular.json` `styles[]` references `node_modules/@universal-material/web/scss/universal-material.scss` (not the old `universal-material-web/scss/...`).
9. **Angular builds against the workspace web package.** `packages/angular` type-checks/builds with web resolved via the symlink and no `build:web` pre-hook (full build-order verification is `05-build-orchestration.md`; at minimum the bare `@universal-material/web` imports in the 20 consuming files resolve).
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
node -e "const p=require('./packages/angular/tsconfig.json').compilerOptions.paths; console.log(Object.keys(p))"
# expect: ['@universal-material/angular','@universal-material/angular/*','@docs/*']  (NO @universal-material/web)
```

**V4 — deps deduped + peer set + no "*" shipped:**
```powershell
node -e "const d=require('./packages/angular/package.json').dependencies||{}; const dup=['@bart-krakowski/get-week-info-polyfill','@lit-labs/virtualizer','@lit/context','@material/material-color-utilities','dompurify','lit','swiper']; console.log('leaked dup deps:', dup.filter(k=>k in d))"
# expect: leaked dup deps: []
node -e "const p=require('./packages/angular/package.json'); console.log('ws peer:', (p.peerDependencies||{})['@universal-material/web'])"
# expect: ws peer: ^3.10.0
node -e "const s=require('./packages/angular/src/package.json'); console.log('published peer:', s.peerDependencies['@universal-material/web']); console.log('has dep:', '@universal-material/web' in (s.dependencies||{}))"
# expect: published peer: ^3.10.0 ; has dep: false  (no '*' web range in the published manifest)
```

**V5 — workspace symlink + single hoisted lit:**
```powershell
npm install
npm ls @universal-material/web        # shows it resolved from the workspace (deduped at root)
# Confirm the symlink and that there is NO nested copy inside packages/angular:
(Get-Item node_modules/@universal-material/web).LinkType   # expect: SymbolicLink (or Junction on Windows)
Test-Path packages/angular/node_modules/lit                # expect: False (hoisted to root)
```

**V6 — SCSS repointed:**
```powershell
node -e "const a=require('./packages/angular/angular.json'); const s=JSON.stringify(a); console.log('old path present:', s.includes('universal-material-web/scss')); console.log('new path present:', s.includes('@universal-material/web/scss'))"
# expect: old path present: false ; new path present: true
```

**V7 — web library untouched:**
```powershell
git status --porcelain src dist scss skills .claude-plugin gulpfile.js docs change-compiler-to-add-custom-elements.js
# expect: no output (nothing changed under web's own files)
```

**V8 — Angular consumes web via the symlink (smoke build).** With web already built into `dist/` (its `index.d.ts` present) so the symlink target resolves:
```powershell
cd packages/angular ; npx ng build --project universal-material-angular --configuration development
# expect: resolves '@universal-material/web' from node_modules (no build:web pre-hook), no "cannot find module" errors.
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

- **If `npm install` (Step 8) fails to symlink** `node_modules/@universal-material/web`: confirm 02 added `"workspaces": ["packages/*"]` (V via Step 0a) and that the root package name is `@universal-material/web`. Delete `node_modules` and the lockfile, re-run `npm install`. The symlink is created by the workspace resolver keying on the root package name matching the Angular `peerDependency`/`dependency` specifier.

- **Nuclear restart of the whole fold:** `git reset --hard pre-angular-fold`, `git remote remove angular`, `Remove-Item -Recurse -Force packages/angular` (if any stray files), then start again from Step 1. The standalone Angular repo and its mirror are untouched, so an unlimited number of restarts is safe.

---

## Parallelizable in worktree? **no** — why

This task is **serial and must NOT run in a worktree**, for three compounding reasons:

1. **It rewrites the monorepo's git history at the DAG level** — a `git subtree add` foreign-root graft plus a submodule dissolution that edits `.git/modules`, `.git/config`, and the index. Worktrees share the same `.git` object/ref store; running this in a worktree while other tasks operate on the same repo risks corrupting refs, the index, or the module store mid-graft. The operation is inherently single-writer to the repository's history.
2. **It is the trunk every downstream wrapper/build task forks from.** `05-build-orchestration.md` and `14-ci-pipeline.md` depend on `packages/angular` existing with the workspace dep wired; the React task (`07`) and others assume the `packages/` layout and the `node_modules/@universal-material/web` symlink that this task's `npm install` establishes. Parallelizing it would mean other worktrees branch off a moving, half-grafted target.
3. **It mutates shared root state** — the root lockfile and `node_modules` (via the Step 8 `npm install` that creates the symlink and hoists the 7 deps). Concurrent installs from sibling worktrees would race on the same `node_modules`/lockfile.

It depends on (canonical filenames): **02-monorepo-scaffold.md** and **03-relocate-web-package.md** (and, as a Wave-0 data precondition, **01-integrate-and-commit-angular.md** must have committed+pushed the Angular migration). Run it on the shared integration branch, serially, after those have landed.
