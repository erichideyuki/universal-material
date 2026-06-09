# Planning harness — index

This directory is the **migration-planning harness** for turning the two-repo setup
(`@universal-material/web` at root + the separate `@universal-material/angular` git submodule)
into a single **web-rooted npm-workspaces monorepo** with per-framework wrappers: Angular folded
in via `git subtree`, React as the one new runtime wrapper, Vue/Svelte/Solid as docs pages +
optional types-only packages, independent per-package versioning via **Changesets**, and GitHub
Actions CI/release.

It is organized so a **cold agent with zero chat memory** can pick up any single task file and
execute it end-to-end. Read this index first, then **`EXECUTION-PLAN.md`** for the runbook (the
DAG, the serial-vs-parallel verdicts, and the ordered waves).

---

## How to use this harness (read this if you are a fresh / cold agent)

1. **Start with `EXECUTION-PLAN.md`** (sibling of this file). It is the authoritative runbook: the
   dependency DAG between the 14 task files, a SERIAL-vs-WORKTREE-PARALLELIZABLE verdict per task,
   and the ordered execution waves (Wave 0 → Wave 4).
2. **Pick a task file under `tasks/` by its canonical number** (`01`..`14`). Each is fully
   self-contained: absolute paths, verified current-state facts, step-by-step edits, acceptance
   criteria, verification commands, rollback notes, and a "Parallelizable in worktree?" verdict.
   Tasks reference each other **only by these canonical filenames** (e.g.
   `02-monorepo-scaffold.md`, `04-relocate-angular-package.md`) — no other names exist.
3. **When a task is ambiguous, consult the layer it cites:**
   - `architecture/` — the *decisions* (the ADR + buildable specs). This is the authority a task
     defers to. If a task and the architecture disagree, the architecture wins (or the task is stale).
   - `current/` — the *as-is* snapshot of both repos (what exists today, pre-migration). Use it to
     understand the baseline a task is changing.
   - `research/` — the *why* behind the per-framework wrapper strategy (FACE form participation,
     per-framework custom-element interop, StackBlitz). Use it when writing wrapper/docs content.
4. **Do not re-litigate settled decisions.** `architecture/00-decision.md` §11 lists the open
   decisions awaiting human sign-off; everything else is decided. Tasks bake in the ADR's
   recommended resolutions and call them out as deliberate assumptions.
5. **The cardinal project rule still applies** (see repo `CLAUDE.md`): anything user-facing is
   verified in the real browser at the docs site (`npm run docs`, :4200). Migration/scaffold tasks
   that change no component source must leave :4200 visually identical.

Key invariants every task preserves (do not break these):

- The **web library stays at the repo root** — the root `package.json` is *both* the
  `@universal-material/web` manifest *and* the workspace coordinator (deliberate dual role). It is
  **not** moved into `packages/web`.
- The web **build pipeline (gulp+tsc+esbuild), `dist/` publish root, postinstall `@angular/compiler`
  patch, `skills/`, `.claude-plugin/`, and docs app are untouched.** The published web npm contract
  is byte-for-byte unchanged.
- Wrappers live under `packages/*` and consume web via a **workspace dependency** (killing the old
  submodule + `scripts/build-web.mjs` + tsconfig path-hack triad). The 7 hand-mirrored runtime deps
  are de-duplicated (hoisted from web).
- **React is the only new runtime wrapper.** Vue/Svelte/Solid get docs pages + optional types-only
  packages (`.d.ts` + README, no runtime JS) — because every input-like `u-*` element is a
  Form-Associated Custom Element emitting native `input`/`change` events.

---

## `current/` — as-is snapshot (the "before" picture)

| File | One-line description |
| --- | --- |
| `01-web-library.md` | Identity, build pipeline, `dist/` layout, and published contract of `@universal-material/web@3.9.0` as it exists today — the root package that must stay untouched. |
| `02-web-form-contracts.md` | Per-component value-property / event / FACE / `disabled` contract for every form-ish `u-*` element — the crux the framework wrappers bind against. |
| `03-web-docs-app.md` | Surface map of the canonical Angular-20 docs site (:4200): routing, `docs-title`/`docs-example`/`docs-apis-table` primitives, nav shell, where a new page slots in. |
| `04-angular-wrapper-lib.md` | Exhaustive inventory of the existing `@universal-material/angular` wrapper (8 CVAs, `TabBarDirective`, services) — what an equivalent wrapper MUST replicate vs MAY skip. |
| `05-angular-consumption-wiring.md` | How the Angular package consumes web *today*: git submodule + `build-web.mjs` shim + tsconfig path-hack + hand-mirrored runtime deps — the "before" the monorepo deletes. |
| `06-angular-demo-and-stackblitz.md` | Map of the Angular wrapper's demo app (:4280) and its dormant StackBlitz "open in editor" integration that the docs/StackBlitz task can revive. |
| `07-git-and-release-state.md` | Exact git + release baseline of both repos (remotes, branch topology, distinct roots, uncommitted Angular migration) — the precondition state for the subtree fold. |

## `research/` — the "why" behind the wrapper strategy

| File | One-line description |
| --- | --- |
| `form-participation.md` | Cross-cutting verdict: the `u-*` inputs are Form-Associated Custom Elements, so each framework needs only thin value/event glue — the finding that collapses "five symmetric wrappers" into "one real React wrapper + Angular." |
| `react.md` | The React consumption story: why React (pre-19) needs a real runtime wrapper, `@lit/react` `createComponent`, controlled inputs, react-hook-form/Formik, SSR. |
| `vue.md` | Vue 3 consumes `u-*` natively (no runtime wrapper): `isCustomElement` config, `v-model` expansion rules, `GlobalComponents` typing, Nuxt/SSR caveat. |
| `svelte.md` | Svelte 4/5 custom-element consumption: documentation + ambient types only, the `bind:value` caveat, eager registration. |
| `solid.md` | OPTIONAL/stretch — SolidJS scores 16/16 on Custom Elements Everywhere; `prop:`/`attr:`/`on:` patterns for a future quick-start/types package. |
| `stackblitz.md` | How to generate and embed runnable per-framework examples via `@stackblitz/sdk` in the docs app, with per-framework project templates and gotchas. |

## `architecture/` — the decisions (authority the tasks defer to)

| File | One-line description |
| --- | --- |
| `00-decision.md` | The ADR: adopt npm workspaces + Changesets, keep web at root, fold Angular via `git subtree`, build one real React wrapper, independent per-package versioning — plus §11 open decisions awaiting human sign-off. |
| `01-package-layout.md` | The buildable spec: target directory tree, every `package.json` identity + peer deps, the `tsconfig.base.json` graph, where the docs app fits, the `.changeset/config.json` body. |
| `02-build-and-release.md` | Build orchestration, watch loops, the deferred Turbo/Nx caching seam, the CI/release outline, Changesets versioning, per-package publish flow, and the M3-major version policy. |

## `tasks/` — the implementation harness (one executable unit each)

Canonical, on-disk filenames. Every cross-reference in the harness uses exactly these names —
there are no "stable internal" aliases. `EXECUTION-PLAN.md` places each in the wave order.

| File | One-line description | Parallel? | Deps |
| --- | --- | --- | --- |
| `01-integrate-and-commit-angular.md` | Wave 0 prereq, in the **Angular repo**: commit the uncommitted 121-file CVA/demo migration on `feature/m3` and push it, so `git subtree add` (task 04) has committed history to fold. | no (serial) | none |
| `02-monorepo-scaffold.md` | Make the root the npm-workspaces coordinator: add `workspaces`, root `build:all`/`test:all`/`lint:all`/`changeset`/`version`/`release` scripts, `@changesets/cli`, `.changeset/config.json`, `tsconfig.base.json`, empty `packages/` skeleton, `.gitignore` ignores. No web behavior change. | yes (worktree) | `01` |
| `03-relocate-web-package.md` | Configure the root `package.json` as the dual-role web manifest **and** workspace coordinator (web stays at root — not moved). Wire it into the workspace graph; confirm the published web contract is unchanged. | no (serial) | `02` |
| `04-relocate-angular-package.md` | **HIGHEST RISK** — the subtree fold. `git subtree add --prefix=packages/angular` from the pushed `feature/m3`, then delete the submodule/`.gitmodules`/`build-web.mjs`/tsconfig path-hack/7 dup deps and rewire Angular to the workspace dep. | no (serial) | `02`, `03` |
| `05-build-orchestration.md` | Wire the root orchestration scripts to build web first then each wrapper, plus watch loops; the deferred Turbo/Nx caching seam stays a no-op wrapper. | no (serial) | `03`, `04` |
| `06-shared-contracts-reference.md` | Author the shared value/event/FACE contract reference the wrappers bind against (derived from `current/02-web-form-contracts.md`); standalone reference file, no build coupling. | yes (worktree) | `02` |
| `07-wrapper-react.md` | `@universal-material/react` (`0.1.0`): `@lit/react` `createComponent` wrappers **generated** from `dist/custom-elements.json`, built with `tsup` (esm+cjs+dts). The one new runtime wrapper. | yes (worktree) | `02`, `03` |
| `08-wrapper-vue.md` | "Using with Vue 3" docs page (load-bearing) + OPTIONAL types-only `packages/vue/` (`GlobalComponents` `.d.ts` + README). No runtime wrapper. | yes (worktree) | `02` |
| `09-wrapper-svelte.md` | Svelte frameworks docs page + OPTIONAL types-only `packages/svelte/` (ambient `.d.ts` + README, `bind:value` caveat). No runtime wrapper. | yes (worktree) | `02` |
| `10-wrapper-solid.md` | **stretch** — Solid frameworks docs page + OPTIONAL types/README `packages/solid/` (`prop:`/`attr:`/`on:` patterns). No runtime wrapper. | yes (worktree) | `02` |
| `11-docs-integration.md` | Wire the new framework pages + React wrapper into the web docs app (`app.routes.ts` + nav shell, "Frameworks" headline); the shared docs-wiring fan-in. | partly (serial-ish) | `03` |
| `12-stackblitz-examples.md` | Embed runnable per-framework examples via `@stackblitz/sdk` in the docs app (per `research/stackblitz.md`); consumes the framework pages from task 11. | yes (worktree) | `11` |
| `13-versioning-and-release.md` | First-release runbook: create the initial changesets (web `minor`→`3.10.0`, angular `minor`→`3.7.0`, react `0.1.0`), `changeset version`, per-package publish; M3-spec-major policy preserved. | no (serial) | `02` |
| `14-ci-pipeline.md` | GitHub Actions: `ci.yml` (per-framework matrix build/test/lint + docs sanity + plugin/version lockstep + changeset gate), `release.yml` (Changesets version-PR + per-package publish), `scripts/check-plugin-version.mjs`. | yes (worktree to author) | `02`, `04`, `07` |

> The deps column is the canonical DAG from `architecture/00-decision.md`. `EXECUTION-PLAN.md`
> resolves these into ordered waves and the serial-vs-worktree verdict per task.
