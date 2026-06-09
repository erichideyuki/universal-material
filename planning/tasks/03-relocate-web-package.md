# Task 03 — Position the web library as the workspace coordinator (stays at root)

> **Status:** ready to implement.
> **Architecture authority:** `planning/architecture/00-decision.md` §4 (web stays at root), §11.2 (dual-role root); `planning/architecture/01-package-layout.md` §1, §3.1, §7; `planning/architecture/02-build-and-release.md` §1, §2.2, §5.
> **One-line scope:** Make the **root** `package.json` a correct *dual-role* manifest — the `@universal-material/web` library **and** the npm-workspaces coordinator — by hardening the fan-out scripts (`build:all` / `test:all` / `lint:all`) so the root web package is run **exactly once** (never double-run by `-ws`) and every per-workspace leg is `--if-present`-guarded, while leaving the web build, `postinstall` patch, `skills/`+`.claude-plugin/` copy, and `dist/` publish root **byte-for-byte untouched**. The web library is **NOT** moved into `packages/web`.

---

## Scope (ONE unit only)

The repo deliberately keeps `@universal-material/web` at the **repo root** (it is both the
library *and* the workspace coordinator — `00-decision.md` §4/§11.2). Task 02
(`02-monorepo-scaffold.md`) already added the bare `"workspaces": ["packages/*"]` key and a
first cut of the orchestration scripts. **This unit owns the *coordinator correctness* of
that dual role**, specifically:

> **Ownership note (REVIEW P1-N1):** this task is the **SOLE owner** of the canonical ordered
> `build:all` root script:
> `npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present`
> (web first, then each wrapper **by name, in build order** with `--if-present`). `05-build-orchestration.md`
> **consumes** this script and must **not** redefine it (in particular it must not regress it to the
> unordered `-ws` fan-out, which has no angular-before-react order guarantee). `14-ci-pipeline.md`
> calls `build:all` by this exact shape.

1. **`package.json` orchestration scripts — make the fan-out correct.** Audit and (re)write
   `build:all` / `test:all` / `lint:all` so that:
   - the **root** web package runs its own `build` / `test` / `lint` **explicitly and exactly
     once** (because `npm … -ws` does **NOT** include the root — see §"npm `-ws` behavior");
   - **every** per-workspace leg carries `--if-present` so an **empty `packages/`** (or a
     member lacking that script) does **not** error (RESOLVE P2-3);
   - the root is therefore **never run twice** by the `-ws` fan-out (RESOLVE P1-3).
2. **Confirm + document the dual-role invariants are preserved** (this unit does **not**
   change them, it guards them): the web `build`/`copy`/`publish` scripts, the `postinstall`
   Angular-compiler patch, the `dist/` publish root, `skills/` + `.claude-plugin/` copy, and
   `remove-scripts-from-package.js` strip-before-publish all remain **verbatim**.
3. **A `coordinator` smoke step** — verify, with an empty `packages/`, that `build:all`,
   `test:all`, and `lint:all` reduce to the web-only build/test/lint and exit 0 without
   touching a non-existent workspace.

**Explicitly OUT of scope** (other task files — do not do their work here):

- Adding `"workspaces"` / `tsconfig.base.json` / `.changeset/config.json` for the **first**
  time — that is `02-monorepo-scaffold.md` (a hard precondition; this unit *refines* its
  output, it does not re-create it). If task 02 has **not** landed, see Preconditions.
- Folding Angular via `git subtree` into `packages/angular` — `04-relocate-angular-package.md`.
- Creating `packages/react` (`07-wrapper-react.md`) or the types-only Vue/Svelte/Solid
  packages (`08-wrapper-vue.md`, `09-wrapper-svelte.md`, `10-wrapper-solid.md`).
- `.github/workflows/{ci,release}.yml` — `14-ci-pipeline.md`.
- The web `3.9.0 → 3.10.0` bump, the first changesets, and any publish — `13-versioning-and-release.md`.
- Moving the docs app, editing the web build pipeline, SCSS, component source, or any
  published web contract. **Nothing under `src/`, `dist/`, `scss/`, `skills/`,
  `.claude-plugin/`, `gulp-tasks/`, or `docs/` is edited by this unit.**

---

## Preconditions & Dependencies

| Must land first | Task file | Why |
| --- | --- | --- |
| **Monorepo scaffold** | `02-monorepo-scaffold.md` | Adds the `"workspaces": ["packages/*"]` key, the empty `packages/` (+ `.gitkeep`), `@changesets/cli`, `.changeset/config.json`, and `tsconfig.base.json`. **This unit hardens the orchestration scripts task 02 introduced; it assumes that scaffold exists.** |

Direct dependency (canonical filename): **`02-monorepo-scaffold.md`**. This task is the
serial successor `03` (deps: 02). It is, in turn, a precondition for
`04-relocate-angular-package.md`, `05-build-orchestration.md`, `07-wrapper-react.md`, and
`11-docs-integration.md`.

**If task 02 has not landed yet:** do not start. This unit edits the very scripts task 02
creates; running it first would either duplicate or conflict with that work. Confirm the
precondition with the check in §Verification V0 before any edit.

Environment (re-confirm in §Verification): `node v24.0.2`, `npm 11.3.0` — native npm
workspaces, no package-manager switch (`00-decision.md` §3).

---

## Context (enough to execute COLD)

### The dual-role decision (why web is NOT moved)

`planning/architecture/00-decision.md` §4 and §11.2, and `01-package-layout.md` §1, are
explicit: the repo **root** `package.json` *is* `@universal-material/web` **and** the
workspace coordinator. The web library is **not** relocated into `packages/web`. The reason
(`01-web-library.md` §9, `02-build-and-release.md` §1): the web build is a bespoke
gulp→tsc→esbuild→cem pipeline with a path-fragile `postinstall` Angular-compiler patch, a
`dist/` publish root, and a `skills/`+`.claude-plugin/` copy step. Moving it would force
re-validating all of that for zero benefit. So the task title "Position the web library as
the workspace coordinator (stays at root)" means: **configure the root manifest's coordinator
role correctly — do not move files.**

`01-package-layout.md` §1 (target tree), top line, states it directly:
`universal-material-web/   # repo root == @universal-material/web package`, with
`package.json   # ← web manifest + workspace coordinator (§3.1)`.

### Exact current state of `D:/Projects/universal-material-web/package.json` (verified)

138 lines today (pre-task-02). The load-bearing facts this unit must preserve:

- `"name": "@universal-material/web"`, `"version": "3.9.0"`, `"type": "module"`.
- `"main": "index.js"`, `"module": "index.js"`, `"types": "index.d.ts"`,
  `"sass": "scss/universal-material.scss"`, `"customElements": "custom-elements.json"` — all
  relative to the `dist/` publish root. **Do not touch.**
- The web `"scripts"` block, the dual-role-critical members (verbatim today):
  - `"build": "run-s clean script:sass-to-ts build:esm build:bundle sass analyze copy && node remove-scripts-from-package.js"`
  - `"copy": "copyfiles package.json README.md custom-elements.json vscode.html-custom-data.json dist/ && copyfiles -u 1 scss/**/*.scss dist/scss && copyfiles \".claude-plugin/**/*\" dist/ && copyfiles \"skills/**/*\" dist/"`
  - `"lint": "npm run lint:lit-analyzer && npm run lint:eslint && npm run lint:prettier"`
  - `"lint:eslint": "eslint src/**/*.ts"` — **scoped to `src/`** (never lints `packages/`).
  - `"test": "wtr --config web-test-runner.config.js"`
  - `"publish": "npm run lint:eslint && cd dist && npm publish"` — **a script literally named
    `publish` already exists.** Do not collide with it.
  - `"postinstall": "node ./change-compiler-to-add-custom-elements.js"` — dev-only
    Angular-compiler patch (stripped from `dist/package.json` by
    `remove-scripts-from-package.js`). **Leave it.**

> The above is the **pre-task-02** state. **Task 02 already inserts** `"workspaces":
> ["packages/*"]` (after the `"sass"` line) and a **first cut** of the six new scripts
> (`build:all`, `test:all`, `lint:all`, `changeset`, `version`, `release`). This unit reads
> what task 02 left and **corrects** the three fan-out scripts to the canonical bodies in
> §Step-by-step. Re-read the live `package.json` before editing — do not assume task 02's
> exact bytes.

### npm `-ws` / `--workspaces` behavior (the crux of P1-3 — state it exactly)

This is the single fact the whole unit turns on:

- `npm run <script> --workspaces` (alias `-ws`) runs `<script>` in **each member listed in
  the root `"workspaces"` array** (i.e. each `packages/*` package). **It does NOT run the
  script in the root/coordinator project itself.** The root `@universal-material/web` is the
  *workspace root*, not a *workspace member* — `-ws` deliberately excludes it.
- Therefore, to run the root web package's own `build`/`test`/`lint`, you must invoke
  `npm run <script>` (no `-w`/`-ws`) **explicitly**. Combining `npm run <s>` (root, once) with
  `npm run <s> -ws --if-present` (members) runs the **root exactly once** and each member
  exactly once — **never the root twice.** This resolves review P1-3 ("web/root must not be
  run twice by the `-ws` fan-out").
- `--if-present` makes a leg a **no-op** (exit 0) when the targeted script is absent. With an
  **empty `packages/`**, `npm run <s> -ws --if-present` finds zero members and exits 0
  cleanly; with members that lack the script, those members are skipped. This resolves review
  P2-3 ("keep `--if-present` so an empty `packages/` does not error").
- `npm run build -w <name> --if-present` targets a **single** named workspace and no-ops if
  that workspace (or its `build` script) does not exist yet — used for the **ordered** web →
  angular → react build chain where order matters (`02-build-and-release.md` §2.2: web must
  build first because its `dist/` is what the wrappers consume).

**Why `build:all` is shaped differently from `test:all`/`lint:all`:** build has a hard
**order** (web first, then angular, then react — `02-build-and-release.md` §1 dependency
graph), so it lists the wrappers **by name** in sequence rather than fanning out with `-ws`
(which has no order guarantee). `test:all`/`lint:all` have **no inter-package order**, so they
use the root-once + `-ws --if-present` fan-out.

### What the coordinator role does NOT change (guard list)

From `01-package-layout.md` §7 ("What is explicitly NOT changing") and `02-build-and-release.md`
§5 — this unit must leave all of these **identical**:

- The web `build` script and its `run-s clean → sass-to-ts → build:esm → build:bundle → sass
  → analyze → copy` order; the `gulp scripts:sass-to-ts`-before-`tsc` invariant.
- The `copy` step (incl. `skills/**/*` and `.claude-plugin/**/*` into `dist/`).
- `remove-scripts-from-package.js` stripping `postinstall`+`publish` from `dist/package.json`.
- The `postinstall` patch (`change-compiler-to-add-custom-elements.js`) + `add-custom-elements-schemas.cjs`.
- The `dist/` publish root, `main`/`module`/`types`/`sass`/`customElements` fields, the
  no-`exports`-map flat subpath layout.
- `docs/` app wiring (`docs/tsconfig.app.json` path `@universal-material/web` → `../dist/index`).

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web`.
> All paths are absolute. Work on a feature branch off the task-02 HEAD; if on a
> default/protected branch, branch first: `git switch -c chore/web-coordinator`.

### Step 1 — Read the live `package.json` and confirm task 02 landed

Open `D:/Projects/universal-material-web/package.json`. Confirm it already has
`"workspaces": ["packages/*"]` and the six task-02 scripts. If it does **not**, STOP — task
02 (`02-monorepo-scaffold.md`) is an unmet precondition (see §Verification V0).

### Step 2 — Set the canonical `build:all` (ordered, named, `--if-present` on every leg)

Replace the `build:all` script body with **exactly** this (the wrappers are listed by name in
build order; web first; every wrapper leg `--if-present` so the empty/absent wrapper no-ops):

```jsonc
"build:all": "npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present",
```

- `npm run build` (no `-w`) = the **root web** build, run **once**, first.
- `-w @universal-material/angular --if-present` / `-w @universal-material/react --if-present`
  = the named wrappers, in order; each is a no-op until its package exists (so this is
  runnable **now**, web-only).
- Do **not** use `-ws` here — `-ws` gives no order guarantee and web must precede the wrappers.

### Step 3 — Set the canonical `test:all` (root once + `-ws --if-present`)

Replace the `test:all` script body with **exactly**:

```jsonc
"test:all": "npm test && npm test -ws --if-present",
```

- `npm test` = the **root web** tests (`wtr …`), run **once** (because `-ws` would skip the
  root).
- `npm test -ws --if-present` = fan out to **every** `packages/*` member that has a `test`
  script; **no-op on empty `packages/`**. The root is **not** included by `-ws`, so it is
  **never double-run** (P1-3).

### Step 4 — Set the canonical `lint:all` (root once + `-ws --if-present`)

Replace the `lint:all` script body with **exactly**:

```jsonc
"lint:all": "npm run lint && npm run lint -ws --if-present",
```

- `npm run lint` = the **root web** lint (`lit-analyzer` + `eslint src/**/*.ts` + `prettier
  . --check`), run **once**.
- `npm run lint -ws --if-present` = each `packages/*` member's own `lint`; root excluded by
  `-ws`, so **no double-run**. Root web lint stays `src/`-scoped — it never reaches into
  `packages/` (each package lints itself), confirming the dual role is clean.

> If task 02 already wrote these exact bodies, this unit's edit is a **no-op confirmation** —
> in that case the deliverable is the **verification** (Steps 6–7) that the dual-role
> behavior is correct, plus the documentation guard. Do not "improve" the bodies beyond the
> canonical forms above; the CI task (`14-ci-pipeline.md`) calls `build:all`/`test:all`/
> `lint:all` by these exact names and shapes.

### Step 5 — Confirm the dual-role guard list is untouched

Do **not** edit any of these — just confirm (a `git diff` should show **only** the three
fan-out script bodies changed, nothing else):

- `build`, `copy`, `publish`, `postinstall` scripts — verbatim.
- `main`/`module`/`types`/`sass`/`customElements`/`version` fields — verbatim
  (`"version": "3.9.0"` — the `3.10.0` bump is `13-versioning-and-release.md`, not here).
- `remove-scripts-from-package.js`, `change-compiler-to-add-custom-elements.js`,
  `add-custom-elements-schemas.cjs` — untouched.

### Step 6 — Coordinator smoke test with an empty `packages/`

From the repo root, prove the fan-out reduces to web-only and never errors on empty
`packages/`. (These run the **real** web build/test; if you only want the wiring signal, the
dry-run in §Verification V3 is faster.)

```powershell
# build:all reduces to the web build (wrappers no-op via --if-present)
npm run build:all
# lint:all reduces to the web lint, members skipped
npm run lint:all
```

Expect: web builds/lints; the `-w @universal-material/angular/react --if-present` and
`-ws --if-present` legs print an npm "no script/workspace" no-op (not an error) and exit 0.

### Step 7 — Confirm the root is run exactly once

There is no member to double-run yet, so the structural guarantee is what matters: `-ws` does
not include the root. Verify with the workspace listing and the dry-run in §Verification
(V2/V3). When `packages/angular` later lands (`04-relocate-angular-package.md`), `test:all`
must run the web tests **once** and Angular tests **once** — not the web tests twice. That is
guaranteed by Steps 3–4's shape and does not need re-editing later.

---

## Acceptance criteria

1. `D:/Projects/universal-material-web/package.json` `build:all` is **exactly**
   `npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present`
   — web first, wrappers named in order, **every** wrapper leg `--if-present`.
2. `test:all` is **exactly** `npm test && npm test -ws --if-present` — root web tests once,
   then `-ws --if-present` fan-out (root **not** double-run).
3. `lint:all` is **exactly** `npm run lint && npm run lint -ws --if-present` — root web lint
   once, then `-ws --if-present` fan-out (root **not** double-run).
4. With an **empty `packages/`**, `build:all` / `test:all` / `lint:all` each exit 0 and
   reduce to the web-only build/test/lint — **no error** from the empty fan-out (P2-3).
5. The root `@universal-material/web` is run **exactly once** by each `*:all` script — never
   twice (P1-3); guaranteed structurally because `npm … -ws` excludes the workspace root.
6. The dual-role guard list is **byte-for-byte unchanged**: `build`, `copy`, `publish`,
   `postinstall`, `main`/`module`/`types`/`sass`/`customElements`, `"version": "3.9.0"`,
   `remove-scripts-from-package.js`, `change-compiler-to-add-custom-elements.js`,
   `add-custom-elements-schemas.cjs`, and everything under `src/`, `dist/`, `scss/`,
   `skills/`, `.claude-plugin/`, `gulp-tasks/`, `docs/`.
7. `git diff package.json` shows **only** the three fan-out script bodies changed (and
   nothing else); `git status --porcelain src dist scss skills .claude-plugin gulp-tasks docs`
   is empty.
8. `npm run build` (the web pipeline) still produces a valid `dist/` with `dist/index.js`,
   `dist/index.d.ts`, `dist/skills/`, `dist/.claude-plugin/`, and a `dist/package.json` with
   `postinstall`/`publish` stripped — i.e. the published web contract is untouched.

---

## Verification commands

> PowerShell, run from `D:/Projects/universal-material-web`. The docs dev server
> (`npm run docs`, :4200) is usually already running — do **not** restart it.

**V0 — precondition (task 02 landed):**
```powershell
node -e "const p=require('./package.json'); const ok = Array.isArray(p.workspaces) && p.workspaces.includes('packages/*') && ['build:all','test:all','lint:all'].every(s=>s in p.scripts); console.log('task-02 scaffold present:', ok); if(!ok) process.exit(1)"
```
Expect `task-02 scaffold present: true`. If false, STOP and run `02-monorepo-scaffold.md` first.

**V1 — the three fan-out scripts have the canonical bodies:**
```powershell
node -e "const s=require('./package.json').scripts; console.log('build:all =>', s['build:all']); console.log('test:all  =>', s['test:all']); console.log('lint:all  =>', s['lint:all'])"
```
Expect:
```
build:all => npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present
test:all  => npm test && npm test -ws --if-present
lint:all  => npm run lint && npm run lint -ws --if-present
```

**V2 — `-ws` excludes the root (proves single-run of the coordinator):**
```powershell
# Lists ONLY workspace members (packages/*), never the root @universal-material/web.
npm query .workspace
# With an empty packages/, this is an empty array [] — so `-ws` fans out to nothing.
```
Expect `[]` (empty) while `packages/` is empty; the root web package is absent from the list
by design — that is the guarantee it is not double-run.

**V3 — fan-out is a clean no-op on empty `packages/` (fast, no real build):**
```powershell
# Dry-run each per-workspace leg; --if-present + empty members => exit 0, no error.
npm test -ws --if-present --dry-run ; "test:all member leg exit: $LASTEXITCODE"
npm run lint -ws --if-present --dry-run ; "lint:all member leg exit: $LASTEXITCODE"
npm run build -w @universal-material/angular --if-present --dry-run ; "build:all angular leg exit: $LASTEXITCODE"
```
Expect each `exit: 0` with no stack trace (the legs no-op because there are no members / the
named workspace does not exist yet).

**V4 — web build contract intact (slower, the real signal):**
```powershell
npm run build
node -e "const fs=require('fs'); ['dist/index.js','dist/index.d.ts','dist/skills','dist/.claude-plugin','dist/package.json'].forEach(f=>console.log(f, fs.existsSync(f)))"
node -e "const p=require('./dist/package.json'); console.log('dist postinstall stripped:', !('postinstall' in p)); console.log('dist publish stripped:', !('publish' in p))"
```
Expect every `dist/*` path `true`, and both `… stripped: true` (the `remove-scripts-from-package.js`
guarantee for consumers).

**V5 — only the three scripts changed; the guard list is clean:**
```powershell
git --no-pager diff -- package.json
git status --porcelain src dist scss skills .claude-plugin gulp-tasks docs
```
Expect the diff to touch **only** `build:all`/`test:all`/`lint:all` bodies, and the
`git status` line to print **nothing** (no source/asset/docs files changed).

**V6 — dual-role identity fields intact:**
```powershell
node -e "const p=require('./package.json'); console.log(p.name, p.version, p.main, p.module, p.types, p.sass, p.customElements); console.log('postinstall:', p.scripts.postinstall); console.log('publish:', p.scripts.publish)"
```
Expect `@universal-material/web 3.9.0 index.js index.js index.d.ts scss/universal-material.scss
custom-elements.json`, `postinstall: node ./change-compiler-to-add-custom-elements.js`,
`publish: npm run lint:eslint && cd dist && npm publish`.

---

## Rollback notes

- **Single-file, additive-only change.** The only edited file is
  `D:/Projects/universal-material-web/package.json`, and only the bodies of three scripts
  (`build:all` / `test:all` / `lint:all`). To revert: `git checkout -- package.json` (restores
  the task-02 versions of those three scripts; everything else in the manifest was never
  touched).
- **No build behavior is mutated.** The web `build`/`copy`/`publish`/`postinstall`, the
  `dist/` publish root, `skills/`+`.claude-plugin/` copy, and `remove-scripts-from-package.js`
  are all unchanged, so there is **no publish-time or runtime regression** for existing
  `@universal-material/web` consumers — the published package is identical.
- **No dependency / lockfile change.** This unit adds/removes no dependency, so
  `package-lock.json` is untouched (no `npm install` required to roll forward or back).
- **Safe to run alongside the dev loop.** Changing script *bodies* does not affect a running
  `npm run docs`; the docs :4200 site renders identically (no SCSS/component/docs change).
- If a later task (`04-relocate-angular-package.md`) reports the web tests running **twice**
  under `test:all`, the regression is a leg that mistakenly used `-ws` *and* a duplicate root
  invocation — re-apply the canonical Step 3 body to fix it.

---

## Parallelizable in worktree? **no** — why

This unit edits the **root `package.json`**, the single most-contended file in the migration.
Tasks 02 (scaffold — adds the `workspaces` key + first-cut scripts), 04 (Angular fold — edits
root config when the subtree lands), 13 (versioning — bumps `version`, may touch scripts), and
14 (CI — depends on the exact `build:all`/`test:all`/`lint:all` shapes) all read or write the
same file, and the architecture sequences them **serially** (`02 → 03 → 04 → 05`). Running 03
in a detached worktree concurrently with any of those would produce conflicting edits to
`package.json` that do not auto-merge cleanly (overlapping script-body lines). It is also a
**hard refinement of task 02's output**: it must observe exactly what 02 wrote and rewrite
those same script lines, which is only deterministic if 02 has already merged. Because the
change is tiny, isolated to one file, and order-critical, it belongs on the **serial trunk**
right after task 02 — not in a parallel worktree.
