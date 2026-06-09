# Execution plan — ordered runbook

The dependency DAG between the **14 canonical task files**, a **SERIAL vs
WORKTREE-PARALLELIZABLE** verdict per task, and the ordered **execution waves** for the
web-rooted-monorepo migration.

Read `README.md` first for the harness layout. The authority for every decision below is
`architecture/00-decision.md` (the ADR), with the buildable specs in
`architecture/01-package-layout.md` and `architecture/02-build-and-release.md`.

There are **no alias task names** — tasks reference each other only by the canonical filenames
`01`..`14` listed here.

---

## 1. The 14 task files and their dependencies

| # | File | Deps | Verdict |
| --- | --- | --- | --- |
| 01 | `01-integrate-and-commit-angular.md` | none | **SERIAL** (Wave 0, blocking) |
| 02 | `02-monorepo-scaffold.md` | 01 | **SERIAL** (Wave 1) |
| 03 | `03-relocate-web-package.md` | 02 | **SERIAL** (Wave 1) |
| 04 | `04-relocate-angular-package.md` | 02, 03 | **SERIAL** (Wave 1 — HIGHEST RISK, the subtree fold) |
| 05 | `05-build-orchestration.md` | 03, 04 | **SERIAL** (Wave 1) |
| 06 | `06-shared-contracts-reference.md` | 02 | **WORKTREE-PARALLELIZABLE** (alongside Wave 1) |
| 07 | `07-wrapper-react.md` | 02, 03 | **WORKTREE-PARALLELIZABLE** (Wave 2) |
| 08 | `08-wrapper-vue.md` | 02 | **WORKTREE-PARALLELIZABLE** (Wave 2) |
| 09 | `09-wrapper-svelte.md` | 02 | **WORKTREE-PARALLELIZABLE** (Wave 2) |
| 10 | `10-wrapper-solid.md` | 02 | **WORKTREE-PARALLELIZABLE** (Wave 2, stretch) |
| 11 | `11-docs-integration.md` | 03 | **SERIAL-ish** (Wave 3 — shared docs-wiring fan-in) |
| 12 | `12-stackblitz-examples.md` | 11 | **WORKTREE-PARALLELIZABLE** (Wave 3) |
| 13 | `13-versioning-and-release.md` | 02, **03** | **SERIAL** (strictly after 03; lands at first release) |
| 14 | `14-ci-pipeline.md` | 02, 04, 07 | **WORKTREE-PARALLELIZABLE to author / SERIAL to land green** (Wave 4) |

---

## 2. Dependency DAG

```
  Wave 0  SERIAL (in the Angular repo)
        ┌──────────────────────────────────────────────┐
        │ 01 integrate-and-commit-angular              │  commit the uncommitted 121-file
        │    (commit feature/m3 + push)                │  migration + push — subtree prereq
        └───────────────────────┬──────────────────────┘
                                │
  Wave 1  SERIAL spine          ▼
        ┌──────────────────────────────┐
        │ 02 monorepo-scaffold         │  workspaces, root scripts, @changesets/cli,
        │    (root pkg + tsconfig.base │  .changeset/config.json, tsconfig.base.json,
        │     + .changeset)            │  packages/ skeleton, .gitignore
        └───────┬──────────────────────┘
                │
                ├───────────────► 06 shared-contracts-reference  (needs 02; worktree, alongside)
                ▼
        ┌──────────────────────────────┐
        │ 03 relocate-web-package       │  root pkg = web manifest AND coordinator
        │    (web STAYS at root)        │  (dual role; OWNS the ordered build:all)
        └───────┬──────────────────────┘
                │
                ├───────────────► 13 versioning-and-release  (needs 02+03; strictly AFTER 03 —
                │                                              references build:all; lands at release)
                ▼
        ┌──────────────────────────────┐
        │ 04 relocate-angular-package   │  git subtree add --prefix=packages/angular
        │    HIGHEST RISK (the fold)    │  then delete submodule/.gitmodules/build-web.mjs/
        │                               │  path-hack/7 dup deps; rewire to workspace dep
        └───────┬──────────────────────┘
                │
                ▼
        ┌──────────────────────────────┐
        │ 05 build-orchestration        │  root build:all builds web first, then wrappers;
        │                               │  watch loops; deferred Turbo/Nx seam (no-op)
        └───────┬──────────────────────┘
                │  (post-Wave-1 main: build:all + test:all green)
                │
  Wave 2  PARALLEL (each in its own git worktree off post-Wave-1 main)
   ┌────────────┼──────────────┬──────────────┬──────────────┐
   ▼            ▼              ▼              ▼              ▼
 07 react    08 vue        09 svelte      10 solid       (06 may also land here
 (packages/  (docs page +  (docs page +   (stretch:       if not done alongside W1)
  react,      opt types     opt types      docs page +
  @lit/react  pkg)          pkg)           opt types)
  from CEM,
  tsup)
   │            │              │              │
   └────────────┴──────┬───────┴──────────────┘
                       │  (all framework surfaces present)
                       ▼
  Wave 3  SERIAL-ish (shared docs wiring)
        ┌──────────────────────────────┐
        │ 11 docs-integration           │  wire React wrapper + framework pages into the
        │    (app.routes.ts + nav)      │  docs app; coordinate the "Frameworks" headline
        └───────┬──────────────────────┘
                │
                ▼
        ┌──────────────────────────────┐
        │ 12 stackblitz-examples        │  embed runnable per-framework examples via
        │    (worktree-parallelizable)  │  @stackblitz/sdk; consumes task-11 pages
        └───────┬──────────────────────┘
                │
  Wave 4  CI (author anytime; lands green now)
        ┌──────────────────────────────┐
        │ 14 ci-pipeline                │  ci.yml (matrix [web, angular, react] + docs
        │    (.github/** + script)      │  sanity + version-lockstep + changeset gate),
        │                               │  release.yml, scripts/check-plugin-version.mjs
        └──────────────────────────────┘
```

Edges (X ──▶ Y means "Y depends on X"):

- `01` ──▶ `04` — `git subtree add` folds **committed** history only; the uncommitted 121-file
  Angular migration must be committed on `feature/m3` and **pushed** first (`00-decision.md` §7).
- `02` ──▶ `03`, `06`, `07`, `08`, `09`, `10`, `14` — the scaffold provides `workspaces` +
  `tsconfig.base.json` + the **minimal** `.changeset/config.json` + the `packages/` skeleton every
  downstream unit consumes.
- `03` ──▶ `04`, `05`, `07`, `11`, `13` — the web package must be wired as the dual-role root
  coordinator (incl. the canonical ordered `build:all`, which **task 03 OWNS**) before Angular folds
  against it, before build orchestration sequences it, before React consumes its
  `dist/custom-elements.json`, before the docs app references it, and **before the release task (13)
  references `build:all` / overwrites the minimal changeset config** (REVIEW P1-N2 — 13 runs strictly
  after 03, not alongside Wave 1).
- `04` ──▶ `05`, `14` — build orchestration sequences the folded Angular package; the CI `angular`
  matrix entry needs the package (soft, `--if-present`-guarded until it lands).
- `07` ──▶ `14` — the CI `react` matrix entry needs the React package (soft, `--if-present`-guarded).
- `11` ──▶ `12` — StackBlitz embeds consume the framework pages task 11 wires in.
- `07`/`08`/`09`/`10` ──▶ `11` — the docs integration wires in surfaces those tasks create.

No cycles. The single source-of-truth build is **web at root; web builds first**, every wrapper
consumes its `dist/` via the workspace symlink (`02-build-and-release.md` §1).

---

## 3. SERIAL vs WORKTREE-PARALLELIZABLE — per task

| Task | Verdict | Why |
| --- | --- | --- |
| `01-integrate-and-commit-angular` | **SERIAL** (blocking prereq) | Lives in the *other* repo; must commit + push `feature/m3` before the fold (`04`). |
| `02-monorepo-scaffold` | **SERIAL** | Edits the **root** `package.json` / `tsconfig.json` / `.gitignore` — the highest-contention files. Everything downstream needs its output. Land on `main` before fanning out. |
| `03-relocate-web-package` | **SERIAL** | More root-config edits (the dual-role coordinator wiring). Same lane as `02`; never run two root-config editors in one worktree. |
| `04-relocate-angular-package` | **SERIAL** (HIGHEST RISK) | `git subtree add` is a tree-level graft that also touches root config (deletes submodule/`.gitmodules`, rewires deps). Run after `03` in the same lane; do not parallelize with anything that edits root config. |
| `05-build-orchestration` | **SERIAL** | Edits root orchestration scripts (`test:all`/`lint:all`/`dev`) + documents the build order; **`build:all` is OWNED by `03`** (this task consumes it, does not redefine it). Depends on `03`+`04` being settled. |
| `06-shared-contracts-reference` | **WORKTREE-PARALLELIZABLE** | A standalone reference file derived from `current/02`; only needs `02`'s skeleton, no build coupling — can run alongside the Wave-1 spine. |
| `07-wrapper-react` | **WORKTREE-PARALLELIZABLE** | New `packages/react/**`, disjoint file set; only soft-depends on the already-merged `02`/`03` output. |
| `08-wrapper-vue` | **WORKTREE-PARALLELIZABLE** | New docs page + optional `packages/vue/**`; append-only edits to the two docs-wiring files. |
| `09-wrapper-svelte` | **WORKTREE-PARALLELIZABLE** | Same shape as Vue. |
| `10-wrapper-solid` | **WORKTREE-PARALLELIZABLE** (stretch) | Optional; same disjoint shape. |
| `11-docs-integration` | **SERIAL-ish** | Consumes all Wave-2 surfaces; touches the shared docs-wiring files broadly — run after the Wave-2 fan-in. |
| `12-stackblitz-examples` | **WORKTREE-PARALLELIZABLE** | Net-new example assets/embeds; runs in its own worktree after `11` lands the pages. |
| `13-versioning-and-release` | **SERIAL** (strictly after `03`) | OWNS the release layer (final `version`/`release` scripts + the authoritative `.changeset/config.json` that supersedes task 02's minimal one). `release` references `build:all` (owned by `03`), so it lands **after `03`**, not alongside Wave 1. The first-release step bumps versions + publishes; runs last. |
| `14-ci-pipeline` | **WORKTREE-PARALLELIZABLE to author / SERIAL to land green** | Net-new `.github/**` + `scripts/check-plugin-version.mjs`; zero conflict surface, so authorable anytime. **Green by default:** the `changeset-check` job is gated behind `hashFiles('.changeset/config.json') != ''`, so it is *skipped* (not red) until task 02 lands the config. Runs green end-to-end after `02` (+ soft `04`/`07`) are merged. |

**Worktree conflict rule.** The only shared high-contention files are the **root `package.json` /
`tsconfig.json` / `.gitignore`** (owned by `02`/`03`/`04`/`05`, with `13` also writing the
`package.json` `scripts` block + `.changeset/config.json` — hence `13` runs strictly after `03`) and
the two **docs-wiring files** `docs/src/app/app.routes.ts` + the docs nav shell (append-only edits
from `08`/`09`/`10`/`11`).
Wave-2 framework tasks each append one route + one nav item — **coordinate the shared "Frameworks"
nav headline once** (in `11`), then the rest merges trivially. Never run two root-config editors in
the same worktree.

> **Caveat — headful test / browser-port contention (REVIEW P2-7).** Multiple Wave-2 worktree
> agents that each run `npm run docs` / web-test-runner / a real-browser verification will collide
> on the docs port (:4200) and on shared headful-browser tooling. Stagger or pin distinct ports
> per worktree, or run only one headful verification at a time.

---

## 4. Recommended execution waves

### Wave 0 — Commit / prep (SERIAL, blocking)
- **`01-integrate-and-commit-angular.md`** — in the **Angular repo**
  (`D:/Projects/universal-material-angular`): commit the uncommitted migration (121 files — the new
  `src/value-accessors/**` CVAs + demo pages) on `feature/m3` and **push** it. `git subtree add`
  folds committed history only.
- In the **web repo**: confirm baseline is clean and branch off `main` for the migration work.
- Keep the standalone Angular checkout as a backup mirror until the monorepo build is verified green.

### Wave 1 — Scaffold + relocate (SERIAL spine; 06 alongside, 13 strictly after 03)
1. **`02-monorepo-scaffold.md`** — make the root the workspace coordinator: `workspaces`, the
   **non-release** orchestration scripts (`build:all`/`test:all`/`lint:all`/`changeset`),
   `@changesets/cli`, a **minimal** `.changeset/config.json`, `tsconfig.base.json`,
   empty `packages/` skeleton, `.gitignore` ignores. **Does NOT define `version`/`release` (task 13
   owns the release layer).** Verify the web build is byte-for-byte unchanged. **Merge to `main`.**
2. **`03-relocate-web-package.md`** — configure the root `package.json` as the dual-role
   `@universal-material/web` manifest **and** workspace coordinator (web **stays at root** — not
   moved to `packages/web`); **OWNS the canonical ordered `build:all`**. Confirm the published web
   contract is unchanged. **Merge to `main`.**
3. **`04-relocate-angular-package.md`** (HIGHEST RISK) —
   `git subtree add --prefix=packages/angular <angular-url> feature/m3` (non-squashed, blame
   survives). Then in `packages/angular`: delete the submodule + `.gitmodules` + `build-web.mjs` +
   tsconfig path-hack + the 7 duplicated runtime deps; point `tsconfig.lib.json` at
   `../../tsconfig.base.json`; declare web as `"*"` (workspace-linked) + `^3.10.0` peer.
   `npm install` at root; confirm `node_modules/@universal-material/web` is a symlink.
   **Merge to `main`.**
4. **`05-build-orchestration.md`** — wire `test:all`/`lint:all`/`dev` watch loops + document the
   web → angular → react order and the deferred caching seam. **Consumes `build:all` (owned by 03);
   does not redefine it.** **Merge to `main`.**

Alongside / after the spine:
- **`06-shared-contracts-reference.md`** — the shared value/event/FACE reference (own worktree,
  only needs `02`; runs alongside the spine).
- **`13-versioning-and-release.md`** — OWNS the release layer (final `version`/`release` scripts +
  the authoritative `.changeset/config.json`). It runs **strictly after `03`** (REVIEW P1-N2) — not
  alongside — because `release` references `build:all` (owned by 03) and both write the root
  `package.json` `scripts` block. Author it after 03 lands; it *executes* (first publish) in Wave 4.

After Wave 1: `npm run build:all` (web → angular) + `npm run test:all` green on `main`.

### Wave 2 — Wrappers + framework docs (PARALLEL git worktrees)
Spin up one worktree per task off post-Wave-1 `main`. Disjoint files modulo the two append-only
docs-wiring files (coordinate the "Frameworks" headline once, in `11`):
- **`07-wrapper-react.md`** — `packages/react/**`: `@lit/react` `createComponent` wrappers
  **generated** from `dist/custom-elements.json`, `tsup` (esm+cjs+dts), `0.1.0`. Add to `build:all`.
- **`09-wrapper-svelte.md`** — frameworks docs page + optional types-only `packages/svelte/`.
- **`10-wrapper-solid.md`** (stretch) — frameworks docs page + optional README/types `packages/solid/`.
- **`08-wrapper-vue.md` is already authored** — fold its docs page + optional `packages/vue/` in the
  same merge pass.

Merge order among these is arbitrary; resolve the trivial route/nav append conflicts on merge.
(See the §3 headful-port caveat before running multiple worktree verifications at once.)

### Wave 3 — Docs integration + StackBlitz (SERIAL-ish, then parallel)
1. **`11-docs-integration.md`** — wire the React wrapper + every framework page into the docs app
   (`app.routes.ts` + nav shell, the single "Frameworks" headline). Run after the Wave-2 fan-in so
   all framework surfaces exist.
2. **`12-stackblitz-examples.md`** — embed runnable per-framework examples via `@stackblitz/sdk`;
   consumes the task-11 pages. Worktree-parallelizable once `11` lands.

### Wave 4 — CI (author anytime; lands green now)
- **`14-ci-pipeline.md`** — `ci.yml` (per-framework `[web, angular, react]` matrix: build/test/lint
  with the right browser per framework + docs sanity build + `version-lockstep` guard + PR-only
  `changeset-check`), `release.yml` (Changesets version-PR → per-package publish),
  `scripts/check-plugin-version.mjs`. Authorable earlier in a worktree; lands green now that
  `02` (+ soft `04`/`07`) are merged.
- **First release** is driven by **`13-versioning-and-release.md`**: create the first changesets
  (web `minor` → `3.10.0`, angular `minor` → `3.7.0`, react `0.1.0`), `changeset version` (review
  bumped `package.json`s + CHANGELOGs + `plugin.json` sync), then publish per package via the
  Changesets action. Verify `npm pack` per package (web includes `skills/` + `.claude-plugin/`;
  angular/react carry a real web range, **not** `"*"`).

---

## 5. Critical-path summary

```
Wave 0 (01 commit) → Wave 1 (02 → 03 → 04 → 05) → Wave 3 (11 → 12) → Wave 4 (14 + 13 release)
```

The long pole is the **serial spine** `02 → 03 → 04 → 05`. Wave-2 wrappers (`07`/`08`/`09`/`10`) and
the standalone reference (`06`) parallelize off post-Wave-1 `main` and fan back in at `11`. The
release task (`13`) is authored **strictly after `03`** (it references `build:all`, owned by `03`,
and writes the same root `package.json` `scripts` block), then *executes* the first publish in
Wave 4. The single intentional lockstep moment is reserved for the future M3→M4 spec bump
(`00-decision.md` §9) — not part of this migration.
