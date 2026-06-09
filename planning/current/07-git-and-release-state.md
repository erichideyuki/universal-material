# 07 — Git & Release State of Both Repos (Migration Baseline)

**Date captured:** 2026-06-08
**Purpose:** Document the exact git + release state of the **web** repo and the **Angular** repo before folding the Angular repo into a web-rooted monorepo. All branch/commit ids below are real and current as of capture.

---

## 1. Web repo — `D:/Projects/universal-material-web`

### Remote & package identity
- **Remote `origin`:** `https://github.com/universal-material/universal-material-web`
- **npm package:** `@universal-material/web` @ `3.9.0` (`package.json`)
- **homepage:** `https://universal-material.github.io` · **repository.url:** `git+https://github.com/universal-material/universal-material-web.git`

### Branch topology
| Branch | Tip | Notes |
| --- | --- | --- |
| `fix/round2-api-candidates` (current, HEAD) | `e804c22` | Checked-out branch |
| `main` | `e804c22` | **Identical to the fix branch** — `rev-list --left-right --count main...fix/round2-api-candidates` = `0  0` |
| `origin/main` | `e804c22` | In sync with local |
| `origin/fix/round2-api-candidates` | `e804c22` | In sync with local (nothing unpushed) |
| `fix/component-bugs-and-skills` | `2a26c9f` | Older local branch (an ancestor of the fix branch) |
| `worktree-bridge-cse_011vjAEyfFW4JETG1wxpJKqD` | `20eb94d` | Leftover Claude worktree branch, **locked** |
| `worktree-bridge-cse_01DDrfAhDPMSFEqrJKSRazoj` | `20eb94d` | Leftover Claude worktree branch, **locked** |

`HEAD` = `e804c22` "u-select: keep the selection across option re-renders (sticky value)".

> **Note:** `main` and `fix/round2-api-candidates` point at the **same commit** (`e804c22`), both locally and on `origin`. The "fix" branch is effectively already merged into `main`. Practically, the migration can treat `main @ e804c22` as the single source of truth for the web repo.

### Worktrees (`git worktree list`)
```
D:/Projects/universal-material-web                                                         e804c22  [fix/round2-api-candidates]
D:/Projects/universal-material-web/.claude/worktrees/bridge-cse_011vjAEyfFW4JETG1wxpJKqD   20eb94d  [worktree-bridge-...KqD]  locked
D:/Projects/universal-material-web/.claude/worktrees/bridge-cse_01DDrfAhDPMSFEqrJKSRazoj   20eb94d  [worktree-bridge-...zoj]  locked
```
The two `worktree-bridge-*` worktrees + branches are stale Claude-session artifacts pointing at an **unrelated** commit (`20eb94d` "Initial implementation of data grid…"). They are **locked**. Before/after the migration they should be pruned: `git worktree remove --force <path>` then `git branch -D worktree-bridge-…` (or `git worktree prune`). They are not part of `main`'s history and would otherwise pollute a subtree graft.

### Working tree — committed vs pending
- **Committed:** everything through `e804c22`. Clean history; nothing staged.
- **Pending (untracked only, no modifications, no staged):**
  - `.claude/` — local Claude session/config dir
  - `GRID.md`
  - `NEXT.md`
- There is also a `planning/` tree (`architecture/`, `current/`, `research/`, `tasks/`) on disk — this document lives at `planning/current/07-git-and-release-state.md`. (Confirm whether `planning/` is tracked or git-ignored before committing.)

### Release automation
- **No `.github/` directory at all** — no GitHub Actions, no CI, no release workflow.
- **No tags** (`git tag` empty).
- **No `.releaserc` / `release.config.*`** — no semantic-release / changesets config.
- **`CHANGELOG.md` is a leftover template** — it still reads `# @lit/lit-starter-ts` with Lit's own changelog entries. **Not** real release notes for this package.
- **Publish flow is a manual npm script** (`package.json`):
  ```jsonc
  "publish": "npm run lint:eslint && cd dist && npm publish"
  ```
  i.e. lint, then publish the **built `dist/` folder** (not the repo root). The `build` script (`run-s clean script:sass-to-ts build:esm build:bundle sass analyze copy && node remove-scripts-from-package.js`) assembles `dist/`; `copy` copies `package.json`, `README.md`, `custom-elements.json`, `scss/`, `.claude-plugin/` and `skills/` into `dist/`, and `remove-scripts-from-package.js` strips scripts from the published `package.json`. **Release is entirely human-driven; nothing is automated.**

---

## 2. Angular repo — `D:/Projects/universal-material-angular`

### Remote & package identity
- **Remote `origin`:** `https://github.com/universal-material/universal-material-angular`
- **Default remote branch:** `origin/HEAD -> origin/master`
- **npm package:** `universal-material-angular` @ `0.0.0`, **`"private": true`** (not published)

### Branch topology
| Branch | Tip | Notes |
| --- | --- | --- |
| `feature/m3` (current, HEAD) | `d5426a4` | The migration branch; **8 commits ahead of `master`, 0 behind** (`rev-list --left-right --count master...feature/m3` = `0  8`) |
| `master` | `498c084` | Remote default. **Is a direct ancestor of `feature/m3`** (merge-base = `498c084`); nothing on `master` is missing from `feature/m3` |
| `origin/feature/m3` | `d5426a4` | In sync — `feature/m3` is **fully pushed** (`origin/feature/m3...feature/m3` = `0  0`) |
| `origin/master` | (default) | |
| `origin/dependabot/*` (×11) | — | Stale dependabot branches; ignore for migration |

`HEAD` = `d5426a4` "Upgrade to angular 20". Root commit of this repo = `f9b9489`. Total 63 commits on `feature/m3`.

The 8 commits `feature/m3` carries on top of `master` (`git log master..feature/m3`):
```
d5426a4 Upgrade to angular 20
2b2104e Updating to use webcomponents
b161f40 - Removed tab bar component - Created value accessor to new select
0e4a85d Updating Angular to v16
d08bf39 Implemented value accessors to the new web components
92bdfb2 Small adjustments (will be overriden by new web components)
1930e9b Added outlined text-field clip-path support
c135e06 Upgrating to material3
```

### The web repo is vendored here as a **git submodule**
- `.gitmodules` (currently **staged-add**, `A`) declares:
  ```ini
  [submodule "universal-material-web"]
      path = universal-material-web
      url = https://github.com/universal-material/universal-material-web.git
      branch = main
  ```
- Submodule gitlink (`.git` file) → `gitdir: ../.git/modules/universal-material-web`.
- `git submodule status`: ` e804c22330a4ec72179deb7bd7c06c0d734938b1 universal-material-web (heads/main)` — pinned at the web repo's `e804c22` (= web `main`).
- In the index/working tree the submodule appears as a **new gitlink** (mode `160000`, not yet in HEAD) and is reported **`-dirty`** (`Subproject commit e804c22…-dirty`) because the *inner* web checkout has the untracked `.claude/ GRID.md NEXT.md`.
- `scripts/build-web.mjs` builds this submodule into its own `dist/` (sass→ts, then tsc) and the Angular workspace resolves `@universal-material/web` → `universal-material-web/dist/index` via a tsconfig path map. Wired as `prestart` / `prebuild` / `pretest`.

### Working tree — committed vs pending (the LARGE migration is uncommitted)
The migration sits **entirely in the working tree on top of `d5426a4`** — none of it is committed. `git status` summary (`121 files changed, 557 insertions, 4283 deletions` vs HEAD):

| Porcelain status | Count | Meaning |
| --- | --- | --- |
| `D` (deleted, unstaged) | 56 | Removed component sources |
| `M` (modified, unstaged) | 53 | Edited files |
| `D` (staged deletions) | 10 | |
| `??` (untracked) | 28 | New dirs/files |
| `A` (staged add) | 1 | `.gitmodules` |
| `AM` (staged add + modified) | 1 | `universal-material-web` submodule gitlink |

**Deleted component families** (collapse / expansion-panel / slider / datepicker, in both library `src/` and `demo/`):
- `src/collapse/**`, `src/expansion-panel/**`, `src/slider/**`, `src/datepicker/**` (whole datepicker module incl. adapters, content, input, models)
- `demo/src/app/components/dialog/**`, `demo/src/app/components/expansion-panel/**`
- `src/dialog/dialog.component.spec.ts`

**New untracked work:**
- New demo component dirs: `checkbox/`, `chip-field/`, `radio/`, `search/`, `select/`, `tab-bar/`, `text-field/`, `typeahead/`, plus `demo/src/app/docs/`
- New `src/value-accessors/**` CVAs + specs (check / chip-field / datepicker / default / radio / select / slider / typeahead control-value-accessors and their `.spec.ts`)
- New `.spec.ts` for several directives (dropdown, floating-action-behavior, label, ripple, tab-bar, text-input)
- `migration/` (with `migration/tasks/` task files: `delete-collapse.md`, `delete-datepicker.md`, `add-datepicker-cva.md`, `add-slider-cva.md`, `demo-remove-*.md`, etc.)
- `scripts/` (incl. `build-web.mjs`)
- `.claude/`

**Renames / reshaping:** many files show as paired `D` + `??` (e.g. components moved out of per-component folders, datepicker → value-accessor). Git records them as delete+add until committed; `git add -A` + `git status --find-renames` would surface them as renames at commit time.

### Release automation
- **No `.github/` directory** — no Actions, no CI, no release workflow.
- **No tags.**
- **No `CHANGELOG.md`.**
- `package.json` is `"private": true` with **no publish step** — only `ng build` targets (`build`, `build:demo`, `build:web`) and `ng test`. This repo was never published to npm; it's a consumer/demo workspace.

---

## 3. Key facts that constrain the merge

1. **No shared history.** Web root = `14adf24`, Angular root = `f9b9489`. The two repos are independent histories. Any history-preserving fold is a **graft of a foreign root**, not a fast-forward.
2. **Web side is trivial to position:** `main == fix/round2-api-candidates == origin/* == e804c22`, clean except 3 untracked files. The monorepo root is essentially today's web `main`.
3. **Angular side has an uncommitted migration** (121 files) that **must be committed first** (on `feature/m3`, on top of `d5426a4`) before any history-preserving import — otherwise subtree/read-tree will capture only `d5426a4`'s tree and lose the migration entirely.
4. **The submodule pointer is itself part of the uncommitted change** and is `-dirty`. When folding into a single monorepo the submodule must be **dissolved** (de-init + remove gitlink + delete `.gitmodules`), since the web tree will live as real files in the monorepo, not a subproject.
5. **No CI / release automation exists in either repo** to migrate or break. Release today = the web repo's manual `npm run publish` (lint → `cd dist && npm publish`). Post-merge, that script's `cd dist` path and `copy`/`remove-scripts` steps may need re-pointing if the web package no longer sits at the monorepo root.

---

## 4. OPTIONS — preserving Angular git history when folding into the web-rooted monorepo

Target shape: the existing **web repo** (`main @ e804c22`) is the monorepo root; the Angular repo's tree lands under a subdirectory (e.g. `angular/` or `packages/angular/`). Below, three import strategies, ordered by history fidelity. **Precondition for all three:** commit the pending Angular migration onto `feature/m3` first, and decide its final subdirectory.

### Option A — `git subtree add` (recommended for history + simplicity)
Import the Angular repo as a subtree under a prefix, keeping its commits in the monorepo's history graph.

```bash
# from the web monorepo root (on a fresh integration branch off main)
git remote add angular ../universal-material-angular        # or the GitHub URL
git fetch angular
git subtree add --prefix=angular angular feature/m3         # grafts all 63 Angular commits under angular/
```
- **Preserves:** full Angular commit history, authorship, dates, messages — all reachable, all paths rewritten under `angular/`.
- **Pros:** one command; no extra tooling; future pulls/pushes possible via `git subtree pull/push`; the merge commit clearly marks the graft point; works even with **no common ancestor** (subtree handles the foreign root).
- **Cons:** `git log` for an Angular file needs `--follow` / `-- angular/...`; the history is "spliced" via a merge commit (two roots in the DAG — cosmetically unusual but harmless); large single merge commit.
- **Caveat:** subtree replays/rewrites paths, so blame is preserved but commit SHAs change (expected for any import).

### Option B — `git read-tree` (place tree under a prefix, history attached via merge of an unrelated root)
Lower-level equivalent of subtree's mechanics; useful when you want explicit control.

```bash
git remote add angular ../universal-material-angular
git fetch angular
git merge -s ours --no-commit --allow-unrelated-histories angular/feature/m3
git read-tree --prefix=angular/ -u angular/feature/m3
git commit -m "Import Angular workspace under angular/ (history preserved)"
```
- **Preserves:** Angular history is reachable (the `-s ours` merge ties `angular/feature/m3` into the DAG); file contents land under `angular/`.
- **Pros:** explicit, scriptable; you control the merge message and the prefix; `--allow-unrelated-histories` is exactly the right knob given the two repos share no root.
- **Cons:** **paths inside the imported commits are NOT rewritten** — historical commits still reference top-level paths (`src/…`, `demo/…`), so `git log --follow angular/<file>` won't trace cleanly past the import point the way subtree's path-rewrite does. More moving parts than Option A.
- **When to pick:** you want history reachable for archival/`git log <sha>` purposes but don't need per-file `--follow` across the boundary.

### Option C — plain copy (loses history)
Copy the Angular working tree into `angular/` and commit it as one new commit; abandon the Angular repo's git history (it remains in the standalone repo / GitHub).

```bash
mkdir angular && cp -r ../universal-material-angular/{src,demo,scripts,...} angular/
git add angular && git commit -m "Add Angular workspace (history left in standalone repo)"
```
- **Preserves:** nothing of the Angular DAG — single squashed commit.
- **Pros:** dead simple; no foreign-root weirdness in the DAG; cleanest-looking `git log`; you can hand-curate exactly what lands (drop dependabot noise, build artifacts).
- **Cons:** `git blame` / `git log` for Angular files show only the import commit; authorship and the 8-commit M3 migration narrative are lost from the monorepo (recoverable only by visiting the old repo).
- **Mitigation:** tag the old repo (`git tag pre-monorepo-archive d5426a4 && git push --tags`) and link it in the monorepo README so history is one click away.

### Recommendation
- If Angular history matters in-repo → **Option A (`git subtree add`)**: best history fidelity with `--follow`-friendly path rewriting, single command, handles the unrelated roots automatically.
- If you only need history *reachable* (not `--follow`-clean) and want explicit control → **Option B (`read-tree` + `merge -s ours --allow-unrelated-histories`)**.
- If a clean linear monorepo log outweighs Angular blame → **Option C (plain copy)** + an archive tag/branch on the old repo.

**Common cleanup regardless of option (do before or as part of the import):**
1. Commit the pending Angular migration on `feature/m3` (121 files) so the import captures it.
2. **Dissolve the submodule:** `git submodule deinit -f universal-material-web && git rm -f universal-material-web && rm -f .gitmodules` (and remove `.git/modules/universal-material-web`). The web tree becomes real files at the monorepo root, so the submodule + `scripts/build-web.mjs` indirection should be replaced by a direct path map.
3. **Prune the web repo's stale worktree-bridge branches/worktrees** (`20eb94d`, both locked) so they don't enter the monorepo.
4. Replace the web repo's **leftover `@lit/lit-starter-ts` `CHANGELOG.md`** with real notes (or delete it).
5. Re-point the web `publish` script (`cd dist && npm publish`) if the web package no longer lives at the monorepo root.
