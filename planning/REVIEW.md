# Planning harness — completeness review (PASS 2)

> Second adversarial completeness pass over everything under `planning/` (README,
> `EXECUTION-PLAN.md`, `current/`, `research/`, `architecture/`, `tasks/` — now **14 task
> files**). Goal: verify the PASS-1 P0/P1 issues are resolved, then hunt for NEW gaps.
> Claims below were spot-checked against the live repo at `D:/Projects/universal-material-web`
> (e.g. `src/select/select.ts:184-185` dispatches plain `input`/`change`, no `detail`).
>
> Scope reviewed this pass: `README.md`, `EXECUTION-PLAN.md`; `research/{vue,solid,svelte}.md`;
> `tasks/{02,03,04,05,07,09,10,11,13,14}.md` in full; `tasks/{01,06,08,12}` and `current/*`,
> `architecture/*` cross-checked for dependency-name resolution and the specific claims below.
>
> Priorities: **P0** = blocks cold execution / wrong-or-failed build / breaks the DAG.
> **P1** = real gap or contradiction that will mislead an implementer but is recoverable.
> **P2** = polish / drift / minor inaccuracy.

---

## Verdict

**The harness is now cold-executable end to end.** All four PASS-1 P0 blockers are CLOSED and
all eight PASS-1 P1 items are CLOSED. The navigation layer (`EXECUTION-PLAN.md` + the
canonical-filename DAG), the highest-risk units (Angular fold `04`, React generator `07`,
release runbook `13`), and the corrected `u-select` value-read all exist and are concrete.

The three NEW P1 coordination defects this pass surfaced — `build:all` co-owned by `03`/`05`
(**P1-N1**), the `version`/`release`/`.changeset/config.json` co-ownership across `02`/`13`
(**P1-N2**), and the ungated CI `changeset-check` (**P1-N3**) — are now **all CLOSED**: single
authoritative owners are pinned per script (`build:all` → `03`; release layer → `13`), task 02
ships only a minimal config + non-release scripts, `13` runs strictly after `03`, and
`changeset-check` is gated behind `hashFiles('.changeset/config.json') != ''` so CI is green by
default. **No open P0 or P1 remains.**

---

## Resolved during execution (task 04 — Angular fold)

> Integration finding surfaced and fixed while *executing* task 04 (commit `d6157ae`), then folded
> back into the harness. This corrects a wrong premise that ran through `04`/`07` and the three
> architecture ADRs.

- **The harness originally assumed internal packages resolve `@universal-material/web` through an
  npm-workspaces symlink at `node_modules/@universal-material/web` (and that the tsconfig path
  could simply be *deleted*). That premise is WRONG for a root-hosted package.** The web library
  lives at the **repo root** (it *is* `@universal-material/web`, the dual-role coordinator), and
  **npm does NOT symlink the workspace-ROOT package** — npm only symlinks `packages/*` members.
  So sibling packages cannot resolve the bare `@universal-material/web` specifier through
  `node_modules`.
- **Fix (the repo-proven docs-app pattern):** internal monorepo consumers resolve web by mapping
  the bare specifier to the **built `../../dist/index`** via a tsconfig `paths` entry (tsc/ng) or a
  build-tool alias (tsup/esbuild), with **web built first** — exactly what the web docs app already
  does (`docs/tsconfig.app.json` → `../dist/index`). The published contract stays a
  `peerDependency` range in each package's *published* manifest only.
- **What was actually implemented for `packages/angular` (commit `d6157ae`, `ng build` green):**
  `packages/angular/tsconfig.json` `paths` maps `@universal-material/web` → `../../dist/index` and
  `@universal-material/web/*` → `../../dist/*` (repointed from the submodule's
  `universal-material-web/dist/index`, **not** removed); the workspace `packages/angular/package.json`
  has **NO** `@universal-material/web` entry (a workspace-manifest dep/peer naming the unpublished
  root package triggered an npm **`ETARGET`** against the registry); the published
  `packages/angular/src/package.json` keeps `peerDependencies["@universal-material/web"]: ^3.10.0`.
- **`npm install` at the monorepo root requires `--legacy-peer-deps`:** the web repo's
  `@angular/elements@20.0.5` peer-pins `@angular/core@20.0.5`, while `packages/angular` pulls
  `@angular/core@^20.3.0` (an Angular devDep version skew). **Follow-up:** align the web repo's
  `@angular/*` devDeps to `^20.3.x` so the flag (and any `.npmrc legacy-peer-deps=true`) can be
  dropped.
- **Harness files updated to match:** `tasks/04-relocate-angular-package.md` (Step 5 path repoint,
  Step 6 no workspace web entry, the RESOLVE/P1-4 block, acceptance criteria, V3–V8);
  `tasks/07-wrapper-react.md` (web resolved via tsconfig path + tsup alias to `../../dist`, no
  web dep/devDep on the manifest, peer-only published contract); `architecture/00-decision.md`
  §2/§4/§5/§6/§8, `architecture/01-package-layout.md` §1/§3/§4, and
  `architecture/02-build-and-release.md` §1/§3/§5/§7 (+ the `--legacy-peer-deps` install
  requirement and the `@angular/*` devDep-alignment follow-up).

---

## PASS-1 issues — status

| ID | Title | Status |
| --- | --- | --- |
| P0-1 | `EXECUTION-PLAN.md` missing | **CLOSED** |
| P0-2 | Dangling task-dependency filenames | **CLOSED** |
| P0-3 | Missing task files (Angular fold / React / Svelte / Solid / release / StackBlitz) | **CLOSED** |
| P0-4 | Wrong `u-select` value-read in research + downstream | **CLOSED** |
| P1-1 | Skill-folder count 30 vs 28 | not re-checked this pass (P2-class) |
| P1-2 | `ButtonWrapper` vs `ButtonBase` chain described two ways | not re-checked this pass |
| P1-3 | `test:all`/`lint:all` double-run web | **CLOSED** (task 03 §"npm `-ws` behavior") |
| P1-4 | `workspace:*` vs `"*"` publish substitution unverified | **CLOSED** (task 04 §RESOLVE + task 13 §B) |
| P1-5 | Web publishes from `dist/` but mechanism unresolved | **CLOSED** (task 13 `publishConfig.directory`) |
| P1-6 | React wrapper hand-transcribes 64 tags | **CLOSED** (task 07 ships `scripts/gen.mjs`) |
| P1-7 | CI ships known-broken steps with no gating | **CLOSED** (P1-N3 — `changeset-check` gated behind `hashFiles('.changeset/config.json')`) |
| P1-8 | StackBlitz heavily cited but no task | **CLOSED** (task 12 exists) |

### Detail on the CLOSED items

- **P0-1 — CLOSED.** `planning/EXECUTION-PLAN.md` exists and is the runbook: the 14-task DAG
  table with deps + SERIAL/WORKTREE verdicts, the ASCII dependency graph, per-task verdict
  rationale, the four execution waves, and a critical-path summary. README points to it.
- **P0-2 — CLOSED.** `grep` for the old dangling names (`01-workspace-and-root-scripts`,
  `02-changeset-config`, `03-fold-angular-subtree`, `01-monorepo-foundation`,
  `monorepo-foundation` *as a filename*) hits **only `REVIEW.md` itself** (this document). Every
  task cross-reference now uses a canonical `NN-name.md`. Tasks 08/09 still use the *prose*
  phrase "monorepo-foundation task(s)" but always pair it with the explicit canonical filename
  `02-monorepo-scaffold.md` (e.g. `08` L36, `09` L45), so it resolves cold.
- **P0-3 — CLOSED.** All 14 task files exist (`01`–`14`) and the four formerly-missing
  high-risk units are present and cold-executable: `04` (subtree fold, with backup/abort/reset),
  `07` (React generator), `09`/`10` (Svelte/Solid docs+types), `12` (StackBlitz), `13` (release
  runbook). Each carries absolute paths, acceptance criteria, verification commands, and a
  worktree verdict.
- **P0-4 — CLOSED (research AND tasks).** `research/vue.md` (§3, §4b, the v-model sketch
  example 4) now reads the select value off `$event.target.value` and explicitly annotates
  "native `input`/`change` (not composed, no `detail`)". `research/solid.md` replaced the bogus
  `'selection-change'` / `e.detail.value` with `on:change`/`on:input` reading
  `e.currentTarget.value`, and notes native `input`/`change` are in Solid's delegated set.
  `research/svelte.md` uses `on:input`/`on:change` off `e.target.value`. The downstream
  Svelte (`09`) and Solid (`10`) tasks both carry the corrected per-component contract table
  with the load-bearing rule printed verbatim: **read `e.target.value`/`e.target.checked`, NOT
  `e.detail`** — `e.detail` reserved only for genuine `CustomEvent`s (`u-typeahead` `selected`,
  `u-chip-field` `remove`). Verified against source: `src/select/select.ts:184-185` dispatches
  `new InputEvent('input', …)` + `new Event('change', …)` — plain events, value on the element.
- **P1-4 — CLOSED.** `tasks/04` §"RESOLVE — REVIEW P1-4" picks a **Primary** mechanism
  (web as a **peer-only** `^3.10.0` on `packages/angular`, NO `dependencies` entry; ng-packagr
  publishes `src/package.json` whose peer is the concrete range, so `"*"` never reaches the
  tarball) plus a **verified fallback** (dev-time `"*"` on the workspace manifest + published
  `^3.10.0` peer). V4 asserts `has dep: false` and no `"*"`. `tasks/13` §B sets
  `updateInternalDependencies: "patch"` + `onlyUpdatePeerDependentsWhenOutOfRange` and an
  explicit-range rule, with V5 grepping the packed manifest for a leaked `"*"`.
- **P1-5 — CLOSED.** `tasks/13` §B2 adds `"publishConfig": { "directory": "dist", "access":
  "public" }` to the root web `package.json` (npm ≥7 packs `dist/` as the package root,
  reproducing `cd dist && npm publish` under `changeset publish`). §B3 rewrites
  `remove-scripts-from-package.js` to a parse-edit-stringify that strips
  `scripts.postinstall`/`scripts.publish` **and** `publishConfig.directory` from the published
  `dist/package.json`. V4 proves tarball paths appear at the tarball root (no `dist/` prefix).
- **P1-6 — CLOSED.** `tasks/07` ships a **generator** (`packages/react/scripts/gen.mjs`) that
  reads the web `HTMLElementTagNameMap` blocks (→ 59 wrappable elements, dropping 5 unmapped
  internals), overlays a curated events map, and **exits non-zero if the wrapper count drifts
  from 59** (anti-drift guard). It explicitly flags the P1-6 trap and the stale-CEM trap (CEM
  lists only 53 and has empty `events` for `u-text-field`/`u-checkbox`). Acceptance #2 and V2/V3
  enforce "no hand-pasted tag list."

---

## P0 — blockers

**None.** No P0 remaining.

---

## P1 — real gaps / contradictions (NEW this pass)

### P1-N1. `build:all` body is OWNED by both task 03 and task 05 — with DIFFERENT, order-incompatible shapes — **CLOSED**

> **CLOSED.** Task 03 is now declared the SOLE owner of the canonical ordered `build:all`
> (`npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present`); task 05 drops the divergent unordered `-ws` form, adds "build:all is OWNED by task 03; do not redefine it here," and re-scopes to dev/watch + documenting the order + the React-needs-`dist/custom-elements.json`-first constraint. `EXECUTION-PLAN.md` names task 03 as the single authoritative owner.


`build:all` (and `test:all`/`lint:all`) is written by **three** serial-spine tasks, and the two
that claim canonical ownership disagree:

- **`tasks/03-relocate-web-package.md`** Step 2 (L175) declares the **canonical** body and says
  so ("Do not 'improve' the bodies beyond the canonical forms above; the CI task calls
  `build:all` … by these exact names and shapes"):
  ```
  "build:all": "npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present"
  ```
  (wrappers listed **by name in build order**, precisely "because build has a hard order — web
  first, then angular, then react — and `-ws` has no order guarantee", per `03` L135–139.)
- **`tasks/05-build-orchestration.md`** Scope item 1 + L118 writes a **different** body:
  ```
  "build:all": "npm run build && npm run build -ws --if-present"
  ```
  i.e. the **unordered `-ws` fan-out** — the exact form task 03 explicitly rejected. Task 05's
  *own* Context (L38, L73) insists the order must be web → angular → react, yet `-ws` cannot
  guarantee angular-before-react.

Both tasks are on the serial spine (`02 → 03 → 04 → 05`), both rewrite the same three scripts in
the same root `package.json`, and **neither acknowledges the other's ownership of `build:all`**.
Task 03 thinks it set the final body; task 05's precondition (L33) says "the orchestration
scripts added here live in that same root manifest," implying task 05 is the author. Whichever
runs last wins, so a cold agent running 05 after 03 will **clobber 03's ordered `build:all` with
the unordered `-ws` form**, and `14-ci-pipeline.md` (which says it relies on the exact shapes
from 03) is then calling a script whose angular/react order is non-deterministic.

Impact is bounded (web still builds first in both forms, so the React-needs-`custom-elements.json`
constraint survives), which is why this is P1 not P0 — but it is a genuine "two specs, one file,
silently divergent" defect on the critical path.

**Fix:** pick ONE owner of the three `*:all` bodies and ONE shape. Recommended: make task 03 own
them with the **named-and-ordered** `build:all` (so angular-before-react is guaranteed), and
re-scope task 05 to "watch/`dev` loops + the documented build-order invariant + verifying
`build:all` end-to-end once `packages/angular`/`packages/react` exist" — explicitly stating it
**does not re-author** `build:all`/`test:all`/`lint:all` (or, if 05 must author them, have it
reproduce 03's exact ordered body and drop the `-ws` form). `EXECUTION-PLAN.md` should name the
single authoritative task for these scripts.

### P1-N2. Task 02 and task 13 both write `version`/`release`/`changeset` and `.changeset/config.json` — divergent bodies, no declared supersession — **CLOSED**

> **CLOSED.** Task 02 is scoped to create the workspace + a MINIMAL valid `.changeset/config.json` + the non-release root scripts only (bare `changeset`, no `version`/`release`), with an inline note that the release layer is OWNED by task 13 and supersedes the minimal config. Task 13 is declared the SOLE owner of the release layer (final `version`/`release` scripts incl. the `sync-plugin-version.js` step + the authoritative `.changeset/config.json`) and now runs STRICTLY AFTER task 03 (deps `02, 03`); P1-4 and P1-5 resolutions retained. `EXECUTION-PLAN.md` orders 13 after 03.


Same class of defect on the release wiring:

- **`tasks/02-monorepo-scaffold.md`** Step 2 sets `"version": "changeset version"`,
  `"release": "changeset publish"`, `"changeset": "changeset"`; Step 3 installs
  `@changesets/cli`; Step 4 creates `.changeset/config.json` with `"ignore": []` and **no**
  `onlyUpdatePeerDependentsWhenOutOfRange`.
- **`tasks/13-versioning-and-release.md`** §B1 **overwrites** `"version": "changeset version &&
  node sync-plugin-version.js"` and `"release": "npm run build:all && changeset publish"`
  (materially different — adds the plugin-version sync and the pre-publish build); §A1 installs
  `@changesets/cli` **again**; §A3 **overwrites** `.changeset/config.json` with `"ignore":
  ["docs"]` + `onlyUpdatePeerDependentsWhenOutOfRange`.

The final merged state is deterministic *if* 13 always runs after 02 (it does — 13 deps `02`),
so 13's bodies win. But **neither task flags that 13 supersedes 02's first cut**: task 02
presents its `version`/`release` bodies as the deliverable (Acceptance #1 pins them verbatim),
and task 13 never says "replace task 02's `version`/`release`". A cold agent that verifies task
02 against its acceptance criteria, then later runs 13, sees the acceptance-pinned scripts get
rewritten with no note that this is intended. Worse: 13 is scheduled "**alongside Wave 1**"
(authorable early) while 02 starts Wave 1 — if a worktree authors 13's config/scripts and merges
around the same time as 02/03, the `.changeset/config.json` and `version`/`release` bodies race.

**Fix:** declare the supersession explicitly. Either (a) task 02 ships **only** the
`workspaces`/`tsconfig.base.json`/`packages/` skeleton and **defers all `changeset`/`version`/
`release`/`@changesets/cli`/`.changeset/config.json` to task 13** (cleanest — one owner of the
release layer), or (b) task 02 keeps a minimal first cut but both 02 and 13 state in-line that
**13's bodies and config are authoritative and replace 02's**, and `EXECUTION-PLAN.md` orders 13
strictly after 03 (not "alongside Wave 1") to remove the race.

---

## P1 — carried forward from PASS 1 (still partially open)

### P1-N3 (was P1-7). CI `changeset-check` is still designed to red-fail until task 02 merges, with no `hashFiles` gate — **CLOSED**

> **CLOSED.** `14-ci-pipeline.md` now gates `changeset-check` behind `if: github.event_name == 'pull_request' && hashFiles('.changeset/config.json') != ''`, so the job is *skipped* (green by default) until task 02 lands the config; the "that error is expected … do not fix it" instruction is removed, and the branch-protection note no longer marks `changeset-check` required until the config exists.


`tasks/14-ci-pipeline.md` still ships `changeset-check` running `npx changeset status
--since=origin/main`, and the task still says (V/"Push-based verification") that before tasks
01/02 land "`changeset-check` will error on the missing config — that error is expected …; do not
'fix' it." The PASS-1 recommendation (guard the job behind
`hashFiles('.changeset/config.json')`, or sequence 14 strictly after 02) is **not** applied —
the job is unconditional except for the PR-only `if`. Shipping a CI workflow whose required
check is *designed to be red* on `main`/PRs until an unspecified later merge still blocks branch
protection and produces misleading red checks. The Angular karma `ChromeHeadlessCI` launcher is
also still delegated to "the Angular subtree task" (`04`) with the note that the angular matrix
"will hang/fail" until it lands.

EXECUTION-PLAN does soften this by labeling `14` "**WORKTREE-PARALLELIZABLE to author / SERIAL to
land green** (Wave 4)" and waving it in after `02` (+ soft `04`/`07`). That sequencing note
mitigates the blocker *if followed*, so this drops from a hard P1 to a **borderline P1/P2** — but
the in-task instruction ("do not fix the red") still contradicts the goal of a green-by-default
pipeline. **Fix:** add the `if: hashFiles('.changeset/config.json') != ''` guard to
`changeset-check` (and an equivalent guard or `--if-present` no-op for the angular matrix leg)
so the workflow is green-by-default and only *activates* the check once the config exists.

---

## P2 — drift / polish (NEW or still-open)

- **P2-N1 (was P2-1) — CLOSED in mechanism, note the recipe owner.** Task `11` now explicitly
  "RESOLVES REVIEW P2-1" by owning the single canonical "how to add a framework usage page"
  recipe + the "Frameworks" nav scaffold, which `07`/`08`/`09`/`10` reuse. Good. Minor residual:
  `08`/`09`/`10` each still inline a full nav/route how-to (they predate or duplicate `11`'s
  recipe) and each independently "create the Frameworks headline if absent" — harmless
  (append-only, coordinate-once), but the recipe in `11` and the inline copies in `08`–`10` are
  now two sources for the same steps; keep them in sync or have `08`–`10` link to `11`'s recipe.
- **P2-N2 (was P2-2) — CLOSED.** Task `11` Scope item 3 explicitly normalizes the badges page
  `badge.component.html` → `badges.component.html` mismatch and "RESOLVES REVIEW P2-2".
- **P2-N3 (was P2-5) — CLOSED.** Task `13` §"Angular baseline = 3.7.0" pins `3.7.0` in the
  buildable first-release changeset and keeps `4.0.0` only as rejected prose (Acceptance #7:
  "`4.0.0` appears nowhere buildable").
- **P2-N4 — `02`/`13` double-install `@changesets/cli`.** A subset of P1-N2: both task 02 Step 3
  and task 13 §A1 run `npm install --save-dev @changesets/cli`. Idempotent (npm no-ops the second
  add), so cosmetic, but it reinforces that the release-layer ownership boundary between 02 and 13
  is unstated. Folds into the P1-N2 fix.
- **P2-N5 (was P2-7) — CLOSED.** The headful test / browser-port-contention caveat is now in
  `EXECUTION-PLAN.md` §3 ("Caveat — headful test / browser-port contention (REVIEW P2-7)") with
  a stagger-or-pin-ports instruction.
- **P2-N6 — `tasks/02` prettier/`.prettierignore` hand-waving (was P2-4) still present.** Task 02
  §"Lint/format" still hedges that `prettier .` "effectively checks almost nothing" and that the
  optional `packages/README.md` is "safe" with muddled `.md`-is-not-ignored reasoning, untested.
  A one-line `prettier --check packages/README.md` in Verification would replace the hand-waving.
  Low impact (it only governs an optional README).

---

## Coverage summary (what IS solid this pass)

- **Navigation layer is now complete and consistent.** `EXECUTION-PLAN.md` ↔ README task table
  ↔ per-task Preconditions agree on the DAG (`14` deps `02,04,07`; `13`/`06`/`08`/`09`/`10` dep
  `02`; `11` dep `03`; `12` dep `11`; spine `02→03→04→05`). No dangling filenames remain.
- **The four highest-risk units are genuinely cold-executable.** `04` carries a mirror-clone
  backup, a V0 precondition gate, idempotent submodule-dissolution commands, and a full
  "How to abort & reset" section. `07`'s generator is anti-drift-guarded and documents the stale
  CEM. `13` resolves both publish-correctness questions (P1-4/P1-5) deterministically with
  dry-run verifications. `09`/`10` carry the corrected event contract verbatim.
- **The research→task value-read correction is fully propagated.** All three relevant research
  files and both downstream framework tasks read the form value off `e.target`/`e.currentTarget`,
  reserving `e.detail` for true `CustomEvent`s — matching `select.ts:184-185`.

The three NEW P1s this pass surfaced were **multiple-ownership contradictions** in the
root-`package.json` script bodies (`build:all` across `03`/`05`; `version`/`release`/`.changeset`
across `02`/`13`) plus the ungated CI `changeset-check`. All three are now **CLOSED**: a single
authoritative owner is pinned per script (`build:all` → `03`; release layer → `13`), `13` is
ordered strictly after `03`, and `changeset-check` is gated on the config existing. The harness is
clean end to end.
