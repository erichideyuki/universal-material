# Task 01 — Integrate & commit the Angular migration work (clean source for the subtree fold)

> **Status:** ready to implement. **Wave 0 — serial — must run before everything else.**
> **Architecture authority:** `planning/architecture/00-decision.md` §7 (git-history preservation, the pre-fold prerequisite); `planning/current/07-git-and-release-state.md` §2 + §4 (the exact uncommitted state and the "commit first" rule).
> **One-line scope:** Commit the large, currently-uncommitted M3 migration sitting in the working tree of `D:/Projects/universal-material-angular` onto its `feature/m3` branch and push it, so that Task 04's `git subtree add` has a clean, fully-pushed source to graft. **No restructure, no submodule removal, no monorepo work happens here.**

---

## Scope (ONE unit only)

In the **separate Angular repo** at `D:/Projects/universal-material-angular` (branch `feature/m3`):

1. Stage the entire pending migration (121 files: +557/−4283 vs `HEAD = d5426a4`) — the
   deletions of `collapse` / `expansion-panel` / `slider` / `datepicker`, the
   directive/CVA edits, the new `src/value-accessors/**` CVAs + specs, the demo rewrite,
   and the new `migration/` + `scripts/` folders — **excluding only the local
   `.claude/` session dir** (see Step-by-step for the exact include/exclude list).
2. Make **one** clean, English, imperative commit on `feature/m3` describing the migration.
3. Push `feature/m3` to `origin` so `origin/feature/m3` carries the migration.
4. Verify the working tree is clean (apart from the deliberately-excluded `.claude/`) and
   that `origin/feature/m3` is in sync.

**This task does NOT (explicitly out of scope — deferred to Tasks 03/04):**

- It does **not** remove the `universal-material-web` git submodule, delete `.gitmodules`,
  or delete `scripts/build-web.mjs`. Those stay committed as part of the migration snapshot
  and are dissolved **later**, inside `packages/angular/` after the fold (Task 04, per
  `00-decision.md` §6).
- It does **not** touch the web monorepo (`D:/Projects/universal-material-web`) in any way —
  no `packages/`, no `workspaces`, no `git subtree add`. That is Tasks 02–04.
- It does **not** re-version the Angular package (the `3.6.2` → `3.7.0` re-baseline happens
  in Task 04 / Task 13, after the fold).
- It does **not** prune the web repo's stale `worktree-bridge-*` worktrees (that cleanup
  belongs to Task 04's fold prep).
- It does **not** rewrite history, rebase, or squash the existing 8 `feature/m3` commits —
  it only adds **one** new commit on top of `d5426a4`.

---

## Preconditions & Dependencies

- **Depends on:** *none.* This is the first task in Wave 0; nothing precedes it.
- **Blocks:** `04-relocate-angular-package.md` (the subtree fold) hard-depends on this —
  `git subtree add` folds **committed** history only, so any work left in the working tree
  here is silently lost by the graft. Transitively blocks every task that depends on 04
  (`05-build-orchestration.md`, `14-ci-pipeline.md`).
- **Tooling:** plain `git` (already on PATH; the repo is a normal git checkout). Push access
  to `https://github.com/universal-material/universal-material-angular` (the repo owner,
  `git config user.name = Hideyuki`, has it). No Node/npm/build step is required for this
  task — it is purely a git commit + push.

---

## Context (enough to execute COLD)

A fresh agent with zero chat memory can run this from the facts below. Everything was
verified by inspecting both repos on **2026-06-08**.

### The two repos

- **Web monorepo-to-be:** `D:/Projects/universal-material-web` — `@universal-material/web`,
  branch `fix/round2-api-candidates` @ `e804c22` (`== main == origin/main`). **You do not
  touch this repo in this task.** It is named only because the Angular repo vendors it as a
  submodule (see below) and because this task's whole purpose is to prepare the Angular
  source for Task 04's fold into `D:/Projects/universal-material-web/packages/angular`.
- **Angular repo (THE repo for this task):** `D:/Projects/universal-material-angular` —
  root `package.json` is `universal-material-angular@0.0.0`, `"private": true` (never
  published); the **published library manifest** is `src/package.json` =
  `@universal-material/angular@3.6.2`. Remote `origin` =
  `https://github.com/universal-material/universal-material-angular`.

### Branch + push state (verified)

- Current branch: **`feature/m3`**, `HEAD = d5426a4` "Upgrade to angular 20".
- `feature/m3` is **8 commits ahead of `master`, 0 behind** (`rev-list --left-right --count
  master...feature/m3` → `0  8`). `master` (`498c084`) is a direct ancestor — nothing on
  `master` is missing from `feature/m3`.
- `feature/m3` is **already fully pushed** to `origin/feature/m3`
  (`rev-list --left-right --count origin/feature/m3...feature/m3` → `0  0`). After this
  task there will be **one** new commit to push.

### The uncommitted migration (what you are committing) — verified `git status`

`git -C D:/Projects/universal-material-angular diff HEAD --stat` → **`121 files changed,
557 insertions(+), 4283 deletions(-)`**. Breakdown:

- **Already staged (12 files):** `.gitmodules` (new), the `universal-material-web`
  submodule gitlink (new), and 10 `src/typeahead/**` deletions. These are staged-add /
  staged-delete and will be part of the commit.
- **Unstaged modifications (`M`)** across `angular.json`, `tsconfig.json`,
  `package.json`/`package-lock.json`, the whole `demo/src/app/**` rewrite, `src/index.ts`,
  `src/package.json`, dialog/dropdown/form-field/ripple/tab-bar/text-input directives, and
  four `src/value-accessors/*.ts` CVAs.
- **Unstaged deletions (`D`)** of entire component families: `src/collapse/**`,
  `src/expansion-panel/**`, `src/slider/**`, `src/datepicker/**` (the whole datepicker
  module incl. adapters/content/input/models), plus several demo dialog/expansion-panel
  pages and `src/dialog/dialog.component.spec.ts`.
- **Untracked (`??`) new work to INCLUDE:**
  - New demo dirs: `demo/src/app/components/{checkbox,chip-field,radio,search,select,tab-bar,text-field,typeahead}/` and `demo/src/app/docs/`.
  - New CVAs + specs under `src/value-accessors/**`:
    `datepicker-control-value-accessor.ts`, `slider-control-value-accessor.ts`, and the
    `.spec.ts` files for check / chip-field / datepicker / default / radio / select /
    slider / typeahead.
  - New directive specs: `src/dropdown/dropdown.directive.spec.ts`,
    `src/floating-action-behavior/floating-action-behavior.directive.spec.ts`,
    `src/form-field/label.directive.spec.ts`, `src/ripple/ripple.directive.spec.ts`,
    `src/tab-bar/tab-bar.directive.spec.ts`, `src/text-field/text-input.directive.spec.ts`.
  - `migration/` — the migration plan: `migration/tasks/` holds `README.md` plus 15 task
    files (`add-datepicker-cva.md`, `add-slider-cva.md`, `delete-collapse.md`,
    `delete-datepicker.md`, `delete-expansion-panel.md`, `delete-slider.md`,
    `demo-remove-{datepicker,expansion-panel,slider}.md`,
    `fix-default-cva-buttonfield.md`, `rename-chipfield-typeahead-imports.md`,
    `rename-confirm-dialog-button-types.md`, `rename-snackbar-import.md`,
    `rename-tabbar-import.md`, `update-index-exports.md`). **Include it** — it is the
    written record of the migration and is useful provenance in the folded history.
  - `scripts/` — contains **`build-web.mjs`** (the submodule build wrapper). **Include it.**
    It is still referenced by the Angular build at this snapshot; Task 04 deletes it
    *after* the fold. Committing it now keeps `feature/m3` self-consistent (the build still
    works the old way until the monorepo replaces it).
  - **`.claude/` — the ONE thing to EXCLUDE.** It is a local Claude session/config dir, not
    project source. Verified **not** matched by the Angular repo's `.gitignore`
    (`git check-ignore .claude/` → no match, exit 1), so it would otherwise be swept in by
    `git add -A`. Leave it untracked.

### The submodule, and why we leave it alone here

- `.gitmodules` (currently staged-add) declares submodule `universal-material-web` →
  `https://github.com/universal-material/universal-material-web.git`, `branch = main`.
- `git submodule status` → `e804c22330a4ec72179deb7bd7c06c0d734938b1 universal-material-web
  (heads/main)` — pinned at the web repo's `e804c22` (= web `main`).
- The submodule shows as `modified content` in the parent status because the **inner** web
  checkout has a dirty file (`git -C universal-material-web status --porcelain` → `M
  package-lock.json`). **Do not** commit the inner checkout's changes — they are an install
  artifact, not migration work. You commit the parent's **gitlink** (already staged), which
  pins `e804c22`; you do **not** descend into the submodule to commit `package-lock.json`.
  (Task 04 dissolves the submodule entirely.)

### Why "commit first" is load-bearing (from `00-decision.md` §7 / `07-…state.md` §4)

`git subtree add --prefix=packages/angular <angular-url> feature/m3` (Task 04) grafts the
**committed tip** of `feature/m3`. If the migration stays in the working tree, the graft
captures only `d5426a4`'s tree and **loses the entire migration** (the new CVAs, the demo
rewrite, the deletions). Committing and **pushing** here makes `origin/feature/m3` the
authoritative, complete source Task 04 fetches.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for ALL commands:** `D:/Projects/universal-material-angular`
> (the Angular repo — NOT the web repo). All `git` invocations below use `-C
> D:/Projects/universal-material-angular` so they are CWD-independent. Commands are
> PowerShell-on-Windows; the here-string `@' … '@` form passes a multi-line commit message
> literally (the closing `'@` must sit at column 0).

### Step 1 — Confirm you are on `feature/m3` with the expected `HEAD`

```powershell
git -C D:/Projects/universal-material-angular rev-parse --abbrev-ref HEAD   # expect: feature/m3
git -C D:/Projects/universal-material-angular rev-parse --short HEAD        # expect: d5426a4
git -C D:/Projects/universal-material-angular diff HEAD --stat | Select-Object -Last 1
# expect: 121 files changed, 557 insertions(+), 4283 deletions(-)
```

If `HEAD` is not `d5426a4` or the branch is not `feature/m3`, **stop** — the working tree is
not the state this task was written against; re-read `planning/current/07-git-and-release-state.md`
§2 before proceeding.

### Step 2 — Stage everything EXCEPT `.claude/`

`git add -A` stages all modifications, deletions, and untracked files. Then explicitly
**unstage `.claude/`** (it is not gitignored, so it would otherwise be included):

```powershell
git -C D:/Projects/universal-material-angular add -A
git -C D:/Projects/universal-material-angular reset -- .claude
```

> Do **not** run `git add` inside the `universal-material-web` submodule. The submodule
> gitlink is already staged at `e804c22`; the inner `M package-lock.json` is an install
> artifact and must stay uncommitted. Staging happens only at the parent level.

### Step 3 — Sanity-check the staged set before committing

```powershell
# .claude must NOT appear; .gitmodules, the submodule gitlink, src/value-accessors/**,
# migration/**, scripts/build-web.mjs, and the demo rewrite MUST appear.
git -C D:/Projects/universal-material-angular status --short
git -C D:/Projects/universal-material-angular diff --cached --stat | Select-Object -Last 1
# expect ~121 files changed (the .claude exclusion removes only untracked session files,
# which were never part of the 121 figure — so the staged diffstat should still read 121).
```

Confirm with:

```powershell
# Should print NOTHING (no staged path under .claude/):
git -C D:/Projects/universal-material-angular diff --cached --name-only |
  Select-String -Pattern '^\.claude/'
```

### Step 4 — Commit (one commit, English, imperative — per `CLAUDE.md`)

```powershell
git -C D:/Projects/universal-material-angular commit -m @'
Migrate Angular wrapper to M3 web components

Replace the legacy collapse/expansion-panel/slider/datepicker components
with ControlValueAccessors over the @universal-material/web custom
elements. Add datepicker and slider CVAs, unit specs for the new CVAs and
directives, and rewrite the demo app around the new web components. Vendor
the web library as a git submodule and build it via scripts/build-web.mjs.

Pre-monorepo snapshot: this is the clean, complete source for folding
packages/angular into the web monorepo via git subtree.
'@
```

> Rationale for the message: imperative mood, references the affected area (Angular
> wrapper), the subject is under ~70 chars, and the body explains *why* (the CVA rewrite +
> the pre-fold purpose) rather than restating the diff. The "git submodule /
> build-web.mjs" line documents that the indirection is **intentionally still present** at
> this snapshot (Task 04 removes it).

### Step 5 — Push `feature/m3` to `origin`

```powershell
git -C D:/Projects/universal-material-angular push origin feature/m3
```

### Step 6 — (Recommended) Tag the pre-monorepo snapshot for archival safety

Per `07-…state.md` §4 mitigation — keep a one-click pointer to the standalone Angular
history before it is folded:

```powershell
git -C D:/Projects/universal-material-angular tag pre-monorepo-angular feature/m3
git -C D:/Projects/universal-material-angular push origin pre-monorepo-angular
```

(Optional but cheap insurance; the standalone repo remains as a backup mirror regardless.)

---

## Acceptance criteria

1. `feature/m3` has exactly **one new commit** on top of `d5426a4`; its tip is no longer
   `d5426a4`, and `git -C D:/Projects/universal-material-angular log --oneline -1` shows the
   "Migrate Angular wrapper to M3 web components" subject.
2. The commit contains the full migration: the `collapse`/`expansion-panel`/`slider`/
   `datepicker` deletions, the `src/value-accessors/**` additions (incl.
   `datepicker-control-value-accessor.ts`, `slider-control-value-accessor.ts`, and all new
   `*.spec.ts`), the demo rewrite under `demo/src/app/**`, `migration/**`, and
   `scripts/build-web.mjs`. The `.gitmodules` + submodule gitlink (`e804c22`) are committed.
3. **`.claude/` is NOT in the commit** and remains untracked.
4. The inner `universal-material-web` submodule was **not** committed into (its
   `M package-lock.json` stays a local, uncommitted artifact; the parent only pins the
   `e804c22` gitlink).
5. `feature/m3` is **fully pushed**: `rev-list --left-right --count
   origin/feature/m3...feature/m3` → `0  0`.
6. Working tree is clean apart from the deliberately-excluded `.claude/`:
   `git -C D:/Projects/universal-material-angular status --short` shows **only** `.claude/`
   (and, harmlessly, the submodule's `modified content` line for the inner
   `package-lock.json`).
7. The web repo `D:/Projects/universal-material-web` is **untouched** by this task
   (`git -C D:/Projects/universal-material-web status --short` is unchanged from its starting
   state: only the pre-existing untracked `.claude/`, `GRID.md`, `NEXT.md`, and `planning/`).

---

## Verification commands

> PowerShell, run from anywhere (paths are absolute).

**V1 — one new commit, expected subject:**
```powershell
git -C D:/Projects/universal-material-angular log --oneline -2
# expect line 1: <new-sha> Migrate Angular wrapper to M3 web components
# expect line 2: d5426a4 Upgrade to angular 20
git -C D:/Projects/universal-material-angular rev-list --count master..feature/m3
# expect: 9  (was 8 before this task)
```

**V2 — `.claude/` excluded, working tree otherwise clean:**
```powershell
git -C D:/Projects/universal-material-angular status --short
# expect ONLY:  ?? .claude/   (plus a submodule "modified content" line — harmless)
git -C D:/Projects/universal-material-angular show --stat HEAD |
  Select-String -Pattern '\.claude/'
# expect: NO output (nothing under .claude/ in the commit)
```

**V3 — the migration is actually in the commit (spot-check key paths):**
```powershell
git -C D:/Projects/universal-material-angular show --stat --oneline HEAD |
  Select-String -Pattern 'value-accessors/slider-control-value-accessor.ts|value-accessors/datepicker-control-value-accessor.ts|src/collapse/|src/datepicker/|migration/tasks/README.md|scripts/build-web.mjs|.gitmodules'
# expect: each of these patterns appears (additions for new CVAs/migration/scripts; deletions for collapse/datepicker)
git -C D:/Projects/universal-material-angular show --stat HEAD | Select-Object -Last 1
# expect a "NNN files changed, …" summary in the ~121-file range
```

**V4 — submodule gitlink pinned, inner checkout NOT committed:**
```powershell
git -C D:/Projects/universal-material-angular ls-tree HEAD universal-material-web
# expect a line with mode 160000 (gitlink) and commit e804c22330a4ec72179deb7bd7c06c0d734938b1
git -C D:/Projects/universal-material-angular/universal-material-web status --porcelain
# expect: ' M package-lock.json' STILL present (i.e. we did not commit it)
```

**V5 — pushed & in sync:**
```powershell
git -C D:/Projects/universal-material-angular fetch origin
git -C D:/Projects/universal-material-angular rev-list --left-right --count origin/feature/m3...feature/m3
# expect: 0  0
```

**V6 — web repo untouched:**
```powershell
git -C D:/Projects/universal-material-web status --short
# expect: only the pre-existing untracked entries (.claude/, GRID.md, NEXT.md, planning/) — no new changes
```

---

## Rollback notes

- This task adds **one commit** and (optionally) **one tag** to the Angular repo, and pushes
  them. Nothing is destructive: no rebase, no squash, no history rewrite, no submodule
  removal, no file deletion of source.
- **Undo the commit but keep all the work in the working tree** (back to the pre-task state):
  ```powershell
  git -C D:/Projects/universal-material-angular reset --soft HEAD~1   # un-commit, keep staged
  git -C D:/Projects/universal-material-angular reset                 # unstage (back to mixed working tree)
  ```
  Then `git add -A && git reset -- .claude` re-stages if you only want to redo Step 2.
- **If already pushed and you must un-push** (only if the commit was wrong — coordinate with
  the repo owner, this is a shared branch):
  ```powershell
  git -C D:/Projects/universal-material-angular reset --hard HEAD~1
  git -C D:/Projects/universal-material-angular push --force-with-lease origin feature/m3
  ```
  Prefer **not** to force-push a shared branch; instead, fix forward with an additional
  commit if the migration was committed but needs correction.
- **Remove the archival tag** if created in error:
  ```powershell
  git -C D:/Projects/universal-material-angular tag -d pre-monorepo-angular
  git -C D:/Projects/universal-material-angular push origin :refs/tags/pre-monorepo-angular
  ```
- No web-repo, monorepo, or published-package state changes here, so there is **zero**
  consumer-facing or release risk. The blast radius is one branch in one private/unpublished
  Angular repo.

---

## Parallelizable in worktree? **no** — why

This is **Wave 0, serial, and explicitly NOT worktree-parallelizable**:

- It operates on a **different repository** (`D:/Projects/universal-material-angular`), not
  the web monorepo where the worktree machinery and every other task lives. A web-repo
  worktree gives no isolation for an Angular-repo commit; the action is inherently
  single-threaded against one shared branch (`feature/m3`).
- It is a **hard gate** for the highest-risk task in the plan (`04-relocate-angular-package.md`,
  the subtree fold) and transitively for `02-monorepo-scaffold.md`'s downstream work — the
  fold cannot run until `origin/feature/m3` carries the committed migration. Running anything
  that depends on the Angular source before this completes would graft an incomplete tree.
- It is a **one-shot git commit + push** with a global side effect on a shared remote branch;
  there is no sub-unit to fan out and nothing for a parallel worktree to do concurrently.
  Sequence it first, alone, then proceed to Task 02.
