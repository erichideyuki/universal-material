# Task 13 — Versioning & release (Changesets) — including the web publish mechanism

> **Status:** ready to implement.
> **Architecture authority:** `planning/architecture/00-decision.md` §2.6, §2.7, §8, §9, §10, §11.5, §11.6, §11.7; `planning/architecture/02-build-and-release.md` §4, §5, §6, §7.
> **One-line scope:** Stand up **Changesets** for independent per-package versioning + the **deterministic per-package publish mechanism** — most importantly resolving how the root `@universal-material/web` package publishes from `dist/` under `changeset publish` (via `publishConfig.directory: "dist"`), how internal `"@universal-material/web": "*"` workspace deps are rewritten to a real range at publish, the `3.7.0` Angular baseline, the M3-major lockstep exception, and the end-to-end release runbook.

---

## Scope (ONE unit only)

> **Ownership note (REVIEW P1-N2).** This task is the **SOLE owner of the release layer**: the
> final `version` / `release` root scripts (including the `sync-plugin-version.js` post-step) and
> the **final `.changeset/config.json` body**. `02-monorepo-scaffold.md` ships only a *minimal*
> valid `.changeset/config.json` (enough for the CI `changeset-check` gate) and a bare
> `changeset` script — **it does not define `version`/`release`**, so this task **adds** them
> rather than overwriting them, and **overwrites** the minimal config with the authoritative body
> below. **Sequencing (REVIEW P1-N2): this task runs STRICTLY AFTER `03-relocate-web-package.md`**
> (not "alongside Wave 1"), because `release` references `build:all`, whose canonical ordered body
> is owned by task 03 — landing this task before 03 would reference an unsettled `build:all`.
> Resolutions **P1-4** (peer `^3.10.0`, never `"*"`) and **P1-5** (web `publishConfig.directory:
> "dist"`) below are retained.

Deliver the **versioning + release configuration and runbook** for the monorepo:

1. Add `@changesets/cli` (dev dep) + `.changeset/config.json` + an empty `.changeset/README.md` at the repo root.
2. Add the root `version` / `release` orchestration scripts to the root `package.json`.
3. **Resolve the web publish-from-`dist/` mechanism deterministically** (REVIEW P1-5): add `"publishConfig": { "directory": "dist" }` to the root web `package.json` so `changeset publish` → `npm publish` packs the built `dist/` tree, exactly preserving today's `cd dist && npm publish` behaviour. Adjust `remove-scripts-from-package.js` to also strip the now-vestigial `"publish"` script from `dist/package.json` (it already strips it; confirm and keep), and keep `publishConfig` out of the published `dist/package.json` (or harmless if it remains — see B3).
4. **Resolve internal workspace-dep version substitution at publish** (REVIEW P1-4): set `updateInternalDependencies` in the Changesets config and document the explicit-range fallback for the `"@universal-material/web": "*"` entries that the Angular/React packages carry, so the published tarballs never ship a literal `"*"`.
5. **Pin the Angular baseline at `3.7.0`** (REVIEW P2-5) in the buildable first-release changesets; keep `4.0.0` only as rejected prose.
6. Add the **`.claude-plugin/plugin.json` ↔ web `package.json` version lockstep sync + guard** as a `changeset version` post-step and a CI assertion.
7. Write the **first-release runbook** and the **per-PR changeset authoring** convention.
8. Encode the **M3-major lockstep exception** (the one intentional super-bump) as a documented procedure.

**This task does NOT:**
- Add `"workspaces"` to the root `package.json` or create `packages/` — that is `02-monorepo-scaffold.md`. This task **assumes the workspaces skeleton already exists** (its hard dependency) and only adds the *versioning/release* layer on top.
- Author the CI workflow YAML (`.github/workflows/{ci,release}.yml`) — that is `14-ci-pipeline.md`. This task defines the **scripts and config those workflows call** (`npm run version`, `npm run release`, `changeset status`) and specifies the publish mechanism the release workflow relies on, but does not write the workflow files.
- Touch the web library `src/`, its gulp/tsc/esbuild build steps, `dist/` *contents*, `skills/`, or `.claude-plugin/` content (only the `plugin.json` **version field** is synced — mechanically, not by hand).
- Fold Angular (`04-relocate-angular-package.md`) or scaffold React (`07-wrapper-react.md`). It only references their `package.json` identities as they will exist post-fold.

---

## Preconditions & Dependencies

- **Hard dependency:** `02-monorepo-scaffold.md` — the root `package.json` must already declare `"workspaces": ["packages/*"]`, the `packages/` directory must exist, `tsconfig.base.json` must be present, and the **minimal** `.changeset/config.json` + bare `changeset` script must be in place. Changesets discovers publishable packages by reading the npm workspaces glob; without it, `changeset` sees only the root package. This task **adds** the `version`/`release` scripts (task 02 deliberately omits them) and **overwrites** the minimal `.changeset/config.json` with the authoritative body (§A3). **If `packages/` does not yet exist, you can still land everything in this task** — Changesets operates fine with a single (root) package — but the internal-dependency-substitution and Angular-`3.7.0` halves only become *exercisable* once `packages/angular` (and later `packages/react`) exist. In that single-package state, ship the config + web publish mechanism + runbook, and leave the first Angular changeset as a documented follow-up tied to `04-relocate-angular-package.md`.
- **Hard ordering (REVIEW P1-N2):** this task runs **STRICTLY AFTER `03-relocate-web-package.md`** — **not** "alongside Wave 1". `release` (`npm run build:all && changeset publish`) references `build:all`, whose canonical ordered body is owned by task 03; landing this task before 03 would wire `release` to an unsettled script and risks racing the root `package.json` `scripts` block. Sequence 13 after 03 on the serial trunk (see `EXECUTION-PLAN.md`).
- **Soft / forward references (not blockers):**
  - `04-relocate-angular-package.md` produces `packages/angular/package.json` with `dependencies."@universal-material/web": "*"` and peer `^3.10.0`. The internal-dep-substitution mechanism here governs how that `"*"` is rewritten at publish.
  - `07-wrapper-react.md` produces `packages/react/package.json` at `0.1.0` with web as a peer/external. Same substitution mechanism applies.
  - `14-ci-pipeline.md` consumes the `version` / `release` scripts and the `changeset status` gate defined here.
- **No dependency** on the docs (`11`), StackBlitz (`12`), or wrapper-doc tasks (`08`/`09`/`10`).

**Serial.** This task writes the single shared `.changeset/config.json` and edits the single root `package.json` `scripts` block + `remove-scripts-from-package.js` — release-critical, repo-global files that must not be co-edited by parallel worktrees.

---

## Context (enough to execute COLD)

### Verified ground-truth (read directly from the repo on 2026-06-08)

- **Root package is `@universal-material/web@3.9.0`** (`D:/Projects/universal-material-web/package.json` lines 2-3). It is `"type": "module"`, `main`/`module`/`types` = `index.js`/`index.js`/`index.d.ts` — these resolve **inside `dist/`**, because the package is published from `dist/`, not from the repo root.
- **Today's publish mechanism is a script, not a directory field.** `package.json` line 49: `"publish": "npm run lint:eslint && cd dist && npm publish"`. There is **no** `"publishConfig"` key today (verified: `node -e` print returned `publishConfig= (none)`). The `cd dist && npm publish` is the only thing that makes `dist/` (not the repo root) the publish root.
- **`dist/package.json` is a *copy* of the root `package.json`** placed there by the `copy` script (`package.json` line 30: `copyfiles package.json … dist/`), then post-processed by `remove-scripts-from-package.js` (`D:/Projects/universal-material-web/remove-scripts-from-package.js`), which strips the `postinstall` and `publish` scripts via the regex `,\n\s+"(postinstall|publish)":\s".+?"`. So consumers never run the Angular-compiler postinstall patch or the dev `publish` script.
- **`postinstall` patch** (`package.json` line 50): `node ./change-compiler-to-add-custom-elements.js` — dev-only, mutates `node_modules/@angular/compiler`, stripped from `dist/package.json`. Untouched by this task.
- **`.claude-plugin/plugin.json`** (`D:/Projects/universal-material-web/.claude-plugin/plugin.json`) `version` = `3.9.0`, must stay equal to the web `package.json` version (they ship together; `copy` script copies `.claude-plugin/**/*` into `dist/`). It has **no** lockstep automation today.
- **Angular published identity** (`D:/Projects/universal-material-angular/src/package.json`): `@universal-material/angular@3.6.2`, peer `@universal-material/web: "^3.9.0"`. The monorepo re-baselines this to **`3.7.0`** with peer **`^3.10.0`** (continuation of the `3.x` line — see §11.5 / §8 of the ADR).
- **Toolchain:** Node `v24.0.2`, npm `11.3.0` (verified). `npm-run-all` (`run-s`/`run-p`) is already a devDependency (`package.json` line 119) — the `version`/`release` scripts can use plain script chaining; no new orchestration tool needed. **`publishConfig.directory` is supported since npm 7**, so it is valid on npm 11.3.0.
- **No `.changeset/`, no `packages/`, no `workspaces` key, no `@changesets/cli`** exist yet (all verified absent).

### Why `publishConfig.directory: "dist"` is THE deterministic resolution (REVIEW P1-5)

`changeset publish` walks every workspace package whose version is ahead of the registry and runs the equivalent of `npm publish` **in that package's own directory**. It does **not** `cd dist`. The web package's *publishable artifact* lives in `dist/`, not at the package root. There are three candidate mechanisms; this task picks exactly one:

| Mechanism | Verdict | Why |
| --- | --- | --- |
| **`"publishConfig": { "directory": "dist" }` on the root web `package.json`** | **CHOSEN** | npm-native (npm ≥7). When `npm publish` runs in the root, npm packs the contents of `publishConfig.directory` (`dist/`) **as if it were the package root**, exactly reproducing today's `cd dist && npm publish`. One field, zero new scripts, fully compatible with `changeset publish` (which just shells `npm publish`). The `dist/package.json` (already the stripped copy) becomes the published manifest. |
| Per-package `publish` script override that `cd dist && npm publish` | Rejected | `changeset publish` does not invoke a package's own `publish` script; it calls `npm publish` directly. A `publish` script would be ignored, reintroducing the original ambiguity. |
| Move the web build output to the package root | Rejected | Massive churn to a deliberately-untouched build pipeline (ADR §4); breaks the `dist/`-as-publish-root invariant the whole ADR preserves. |

> **One instruction for a cold agent:** add `"publishConfig": { "directory": "dist" }` to the root `package.json`. That is the entire web-publish resolution. Keep `remove-scripts-from-package.js` stripping the `publish` script (it is now vestigial but harmless to leave in source; stripping keeps `dist/package.json` clean). The dev-time `cd dist && npm publish` script may remain in the *source* `package.json` for manual emergency publishes, but the canonical path is `changeset publish`.

### Why internal `"*"` deps must be rewritten (REVIEW P1-4)

Under **npm** workspaces, the internal dep is written as a literal `"*"` (not pnpm's `workspace:*`). The Angular package will carry `dependencies."@universal-material/web": "*"`; React carries web as a **peer** (`peerDependencies`, value also a range/`*`). If `"*"` shipped to npm verbatim, every install of `@universal-material/angular` would resolve `@universal-material/web` to **whatever latest** is on the registry — losing the spec-anchored compatibility guarantee.

- **Changesets handles this at `version` time** via `updateInternalDependencies`: when a depended-on package bumps, Changesets rewrites the dependents' internal range. **But Changesets only rewrites a range it already understands** — a bare `"*"` is treated as "any", which Changesets leaves as-is. The robust pattern is therefore the **explicit-range fallback**: in the dependent `package.json`, declare the web dep with a real caret range (e.g. `"^3.10.0"`), and let `updateInternalDependencies: "patch"` keep it current. npm workspaces still symlinks it locally because the linked package's version satisfies the range.
- **This task's rule (deterministic):**
  - **Angular** `dependencies."@universal-material/web"`: use **`"^3.10.0"`** (an explicit range that the local symlinked `3.10.0` satisfies), NOT `"*"`. Peer stays `"^3.10.0"`.
  - **React** `peerDependencies."@universal-material/web"`: **`"^3.10.0"`**.
  - Set `"updateInternalDependencies": "patch"` so a web patch bump nudges dependents.
  - **Verify at publish** with `npm pack --dry-run` that the produced tarball's `package.json` carries the real range, never `"*"`. (Cross-referenced in `02-build-and-release.md` §5 "workspace-spec rewriting".)
- **Note:** the *web* package has **no** self-dependency, so its `dist/package.json` deps are already concrete caret ranges (`lit ^3.2.1`, etc.) — no substitution needed there. The `"*"` problem is purely a *dependent* (Angular/React) concern.

### Angular baseline = `3.7.0` (REVIEW P2-5)

Per ADR §8 and §11.5: Angular's published `src/package.json` reads `3.6.2`; the monorepo **continues the `3.x` line to `3.7.0`**. `4.0.0` is **rejected** because the major number is reserved for the **Material Design spec generation** (M3 → `3.x`); a `4.0.0` Angular release would *visually collide* with the future M3→M4 super-bump. The first Angular changeset in this repo is therefore a **`minor`** bump from `3.6.2` → `3.7.0`. (`4.0.0` survives only as rejected prose — do not encode it anywhere buildable.)

### M3-major lockstep exception (the one intentional super-bump)

Independent per-package versioning is the rule (ADR §8). The **single exception** (ADR §9): when Material ships a new spec generation (M3→M4), **every** published package crosses to the new major **together**, driven by one release that contains a `major` changeset for **every** package in the same `.changeset/*.md` (or a set of them merged in one Version PR). Between generations, packages move independently on minor/patch. This task documents that procedure (Step C5) so a future maintainer executes it deterministically.

### How Changesets fits the existing release flow (from `02-build-and-release.md` §4, §5, §10)

- A PR that changes a publishable package adds `.changeset/<random-id>.md` with frontmatter naming the package(s) + bump level + a human changelog line.
- `changeset version` consumes all pending changeset files: bumps each named `package.json`, writes/extends each package's `CHANGELOG.md`, applies `updateInternalDependencies` to dependents, deletes the changeset files. (This is the root `version` script.)
- `changeset publish` publishes every package whose version is ahead of the registry and creates per-package git tags (`@universal-material/web@3.10.0`, `@universal-material/angular@3.7.0`, …). (This is the root `release` script.) The web package, by virtue of `publishConfig.directory: "dist"`, publishes its `dist/` tree.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web`. All paths absolute. PowerShell syntax on Windows.

### PART A — Install Changesets + config

**A1. Ensure the dev dependency is present.** Task 02 already added `@changesets/cli`; this is idempotent (npm no-ops if it is already at the requested range):
```powershell
npm install --save-dev "@changesets/cli@^2.27.0"
```
(This writes/keeps `@changesets/cli` in the root `package.json` `devDependencies` and updates the lockfile. It is a dev tool — it never ships in `dist/`.)

**A2. Ensure the config directory exists** (task 02 already created `.changeset/config.json` + `.changeset/README.md`; only run `init` if `.changeset/` is somehow absent):
```powershell
if (-not (Test-Path .\.changeset\config.json)) { npx changeset init }
```

**A3. Overwrite `D:/Projects/universal-material-web/.changeset/config.json`** with the deterministic config — **this is the authoritative body that supersedes task 02's minimal config**:
```jsonc
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["docs"],
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "onlyUpdatePeerDependentsWhenOutOfRange": true
  }
}
```
Field rationale (every field is load-bearing — do not omit):
- `"access": "public"` — the packages are public-scoped (`@universal-material/*`); without this, `npm publish` of a scoped package defaults to `restricted` and fails.
- `"baseBranch": "main"` — `changeset status --since=origin/main` (the CI gate in `14-ci-pipeline.md`) keys off this.
- `"updateInternalDependencies": "patch"` — resolves REVIEW P1-4: a web bump nudges Angular/React's web range so the published tarball carries a fresh, real range.
- `"ignore": ["docs"]` — the `docs/` app is private/unpublished (ADR §8). If `docs/` is **not** a named workspace package (it currently is not), this entry is harmless/no-op; keep it as documentation of intent. **Do NOT** add the optional `vue`/`svelte`/`solid` types packages to `ignore` — Changesets simply produces no changeset for a package until it changes.
- `"commit": false` — the Changesets GitHub Action (defined in `14-ci-pipeline.md`) manages commits/PRs; local `changeset version` should not auto-commit.
- `onlyUpdatePeerDependentsWhenOutOfRange: true` — only bump a peer-dependent (React/Angular peer on web) when the web change actually moves it out of the declared peer range, avoiding noisy wrapper bumps on every web patch.

**A4. Replace the generated `.changeset/README.md`** at `D:/Projects/universal-material-web/.changeset/README.md` with a short project-specific note (keep the upstream link, add the M3-major rule and the `3.7.0` Angular baseline pointer). This is documentation only — it is fine to leave the changesets default and append a short paragraph pointing at this task file and ADR §8/§9.

### PART B — Root `package.json` release scripts + web publish mechanism

**B1. Add the version/release scripts** to `D:/Projects/universal-material-web/package.json` `"scripts"` (additive — these are **net-new**; task 02 deliberately did not define `version`/`release`, so this is an add, not an overwrite. The bare `changeset` already exists from task 02 — restating it is a harmless no-op):
```jsonc
"version": "changeset version && node sync-plugin-version.js",
"release": "npm run build:all && changeset publish",
"changeset": "changeset"
```
- `version` runs `changeset version` then syncs `plugin.json` (B4). **Note:** npm treats a script literally named `version` as the npm-lifecycle `npm version` hook **only when you run `npm version`** — here it is invoked explicitly as `npm run version` (and by the Changesets Action's `version:` input), so the lifecycle collision does not fire. If you prefer to avoid any ambiguity, name it `version:packages` and update the runbook + `14-ci-pipeline.md` reference accordingly; the canonical name in this plan is `version`.
- `release` builds everything first, then `changeset publish`. Because this task runs **strictly after `03-relocate-web-package.md`** (REVIEW P1-N2), `build:all` — whose canonical ordered body (web → angular → react) is **owned by task 03** — already exists, so `release` can reference it directly. (Only if, exceptionally, you land this before task 03 would you temporarily use `"release": "npm run build && changeset publish"` (web-only) and widen it once `build:all` lands — but the sequencing forbids that ordering.)

**B2. Add `publishConfig` to the root web `package.json`** (THE web-publish resolution, REVIEW P1-5). Insert at the top level (e.g. right after `"license": "MIT"`):
```jsonc
"publishConfig": {
  "directory": "dist",
  "access": "public"
}
```
This makes `npm publish` (hence `changeset publish`) pack `dist/` as the package root — byte-for-byte the current `cd dist && npm publish` outcome.

**B3. Confirm `remove-scripts-from-package.js` still strips the vestigial `publish` script.** It already does (regex matches `postinstall|publish`). **Additionally**, since `publishConfig` will be copied into `dist/package.json` by the `copy` step and would point `dist`'s *own* publish at a nested `dist/dist` (wrong if anyone ever ran `npm publish` from inside `dist/`), strip `publishConfig.directory` from the **published** manifest. Edit `D:/Projects/universal-material-web/remove-scripts-from-package.js` to also remove the nested `directory` (or the whole `publishConfig` block, keeping only `access`). Concrete, surgical change — replace the single regex line with a JSON-aware edit:
```js
import fs from 'fs';

const path = './dist/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

// Strip dev-only lifecycle scripts so consumers never run the Angular-compiler
// postinstall patch or the manual publish helper.
delete pkg.scripts?.postinstall;
delete pkg.scripts?.publish;

// The published manifest IS the dist/ tree, so it must not re-point publish at a
// nested dist/. Keep access:public for the scoped package; drop the directory hop.
if (pkg.publishConfig) {
  delete pkg.publishConfig.directory;
  if (Object.keys(pkg.publishConfig).length === 0) delete pkg.publishConfig;
}

fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
```
> **Why rewrite the whole file instead of the regex?** The original regex (`,\n\s+"(postinstall|publish)":…`) is brittle against key ordering and would not touch `publishConfig`. A parse-edit-stringify is deterministic and order-independent. The output is still valid JSON with the same content minus the stripped keys. (If you must minimise diff risk, you may instead keep the regex for the two scripts and add a second regex for `"directory": "dist"`, but the parse approach is recommended.)

**B4. Create the plugin-version sync script** `D:/Projects/universal-material-web/sync-plugin-version.js` (resolves the §4.1 lockstep mechanically, called from the `version` script in B1):
```js
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const pluginPath = './.claude-plugin/plugin.json';
const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));

if (plugin.version !== pkg.version) {
  plugin.version = pkg.version;
  fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');
  console.log(`Synced .claude-plugin/plugin.json version -> ${pkg.version}`);
} else {
  console.log(`.claude-plugin/plugin.json already at ${pkg.version}`);
}
```
This runs **after** `changeset version` has bumped `package.json`, so it copies the new web version into `plugin.json`. (The `copy` build step then carries the synced `plugin.json` into `dist/`.)

**B5. Add the CI guard script** `D:/Projects/universal-material-web/check-plugin-version.js` (used by `14-ci-pipeline.md`'s `ci.yml`, asserts the two never diverge):
```js
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const plugin = JSON.parse(fs.readFileSync('./.claude-plugin/plugin.json', 'utf8'));

if (plugin.version !== pkg.version) {
  console.error(
    `Version lockstep broken: package.json=${pkg.version} but ` +
    `.claude-plugin/plugin.json=${plugin.version}. Run: npm run version (or sync-plugin-version.js).`
  );
  process.exit(1);
}
console.log(`plugin.json lockstep OK (${pkg.version})`);
```
Add a root script to invoke it (additive):
```jsonc
"check:plugin-version": "node check-plugin-version.js"
```

### PART C — First-release changesets + runbook

> Do C1–C4 once the workspaces skeleton + Angular fold exist (`02`/`04`). If only the web package exists when you run this task, do **C1 (web)** only and leave C2 (Angular) as a follow-up tied to `04-relocate-angular-package.md`.

**C1. Web first changeset** — create `D:/Projects/universal-material-web/.changeset/web-3-10-0.md`:
```md
---
"@universal-material/web": minor
---

Harden field/select/tab/chip APIs; keep u-select selection across option re-renders. (3.9.0 → 3.10.0; in-library breaks bump the minor per the M3-major policy.)
```
(Authoring by hand is the deterministic path for the seed release; for ordinary PRs use `npm run changeset` interactively. The random-id filename Changesets generates is fine too — the fixed name here just makes the runbook reproducible.)

**C2. Angular first changeset** — create `D:/Projects/universal-material-web/.changeset/angular-3-7-0.md` (ONLY after `04-relocate-angular-package.md` lands `packages/angular`):
```md
---
"@universal-material/angular": minor
---

Re-baseline @universal-material/angular at 3.7.0 in the monorepo: drop the git submodule + build-web.mjs + tsconfig path hack; consume @universal-material/web via the workspace dependency. Peer requires @universal-material/web ^3.10.0. (Continues the 3.x line; 4.0.0 rejected to avoid colliding with the M3->M4 spec-major policy.)
```

**C3. React first changeset** — when `07-wrapper-react.md` lands `packages/react@0.1.0`, its *initial* version is set directly in its `package.json` (no changeset needed to reach `0.1.0`). The **first publishable change after that** adds a normal changeset. Do not author a `0.1.0` changeset.

**C4. Run the version step locally to preview** (does NOT publish):
```powershell
npm run version
```
Inspect the diff: each named `package.json` bumped, `CHANGELOG.md` created/extended, `.claude-plugin/plugin.json` synced to the new web version, dependents' web range refreshed by `updateInternalDependencies`, the consumed `.changeset/*.md` files deleted. If it looks right, that diff becomes the "Version Packages" PR content (in CI, the Changesets Action does this automatically).

**C5. (Reference-only) M3→M4 super-bump procedure** — document in the runbook section of this file and in `.changeset/README.md`. When Material ships M4:
1. In ONE branch, add a single `.changeset/m4-major.md` listing **every** published package at `major`:
   ```md
   ---
   "@universal-material/web": major
   "@universal-material/angular": major
   "@universal-material/react": major
   ---
   Material Design 4: cross every package to 4.x together (spec-generation super-bump).
   ```
2. `npm run version` → all packages cross to `4.0.0` simultaneously; `plugin.json` syncs to web `4.0.0`.
3. Update every wrapper's `@universal-material/web` peer range to `^4.0.0` in the same PR.
4. Publish. This is the **only** time independent versioning yields to lockstep (ADR §9).

**C6. Publish (real)** — only on `main`, normally via the Changesets Action (`14-ci-pipeline.md`); the manual equivalent:
```powershell
npm run release
```
This runs `build:all` then `changeset publish`, which:
- publishes `@universal-material/web` by packing `dist/` (via `publishConfig.directory`), with `postinstall`+`publish` stripped and `skills/` + `.claude-plugin/` included;
- publishes `@universal-material/angular` from its ng-packagr output with a real `^3.10.0` web range (never `"*"`);
- publishes `@universal-material/react` from `packages/react/dist/`;
- creates per-package git tags.

---

## Acceptance criteria

1. `@changesets/cli` is a root `devDependency`; `D:/Projects/universal-material-web/.changeset/config.json` exists with `access: "public"`, `baseBranch: "main"`, `updateInternalDependencies: "patch"`, and the `onlyUpdatePeerDependentsWhenOutOfRange` experimental option.
2. The root `package.json` has `"version"`, `"release"`, `"changeset"`, and `"check:plugin-version"` scripts, and a top-level `"publishConfig": { "directory": "dist", "access": "public" }`.
3. `remove-scripts-from-package.js` strips `scripts.postinstall`, `scripts.publish`, **and** `publishConfig.directory` from `dist/package.json`, producing valid JSON.
4. `sync-plugin-version.js` exists and, when run after a web bump, sets `.claude-plugin/plugin.json` `version` equal to the web `package.json` version. `check-plugin-version.js` exits non-zero when they diverge and zero when they match.
5. **Web publish resolution is deterministic:** `npm pack --dry-run` (run at the repo root after `npm run build`) reports a tarball whose root files come from `dist/` (i.e. `index.js`, `scss/`, `skills/`, `.claude-plugin/`, `custom-elements.json` at the tarball root), **not** the repo-root source tree. (See V4.)
6. **No `"*"` ships:** for any dependent package present (Angular/React), its packed `package.json` carries a real `^3.10.0` range for `@universal-material/web`, never `"*"`. (See V5; N/A until those packages exist.)
7. The first-release changesets produce web `3.9.0 → 3.10.0` (minor) and Angular `3.6.2 → 3.7.0` (minor) — **`4.0.0` appears nowhere buildable** (config/changeset/script), only as rejected prose.
8. `npx changeset status --since=origin/main` runs without error against a branch that has at least one changeset (the gate `14-ci-pipeline.md` will call).
9. No files under web `src/`, the web build steps, `dist/` *contents* logic (beyond the publish-root mechanism), `skills/`, or `.claude-plugin/` *content* (only the version field is synced) are changed.

---

## Verification commands

> Run from `D:/Projects/universal-material-web`. PowerShell. Do not restart the dev server (`npm run docs`) unless asked.

**V1 — Changesets installed + config valid:**
```powershell
node -e "const p=require('./package.json'); console.log('changesets dev dep:', p.devDependencies['@changesets/cli'] ?? '(MISSING)')"
node -e "const c=require('./.changeset/config.json'); console.log('access=',c.access,'baseBranch=',c.baseBranch,'updateInternalDependencies=',c.updateInternalDependencies)"
npx changeset status   # should run; reports pending changesets or 'No changesets present'
```

**V2 — root release scripts + publishConfig present:**
```powershell
node -e "const p=require('./package.json'); ['version','release','changeset','check:plugin-version'].forEach(s=>console.log(s,'=>',p.scripts[s]??'(MISSING)')); console.log('publishConfig=',JSON.stringify(p.publishConfig))"
# expect publishConfig= {"directory":"dist","access":"public"}
```

**V3 — plugin lockstep sync + guard:**
```powershell
# After a bump, sync must align the versions; guard must pass.
node sync-plugin-version.js
node check-plugin-version.js          # prints 'plugin.json lockstep OK (<ver>)', exit 0
# Negative test: temporarily diverge, confirm the guard fails, then restore.
$plugin = Get-Content .\.claude-plugin\plugin.json -Raw
($plugin -replace '"version":\s*"[^"]+"','"version": "0.0.0-test"') | Set-Content .\.claude-plugin\plugin.json
node check-plugin-version.js; "exit=$LASTEXITCODE"   # expect non-zero
$plugin | Set-Content .\.claude-plugin\plugin.json   # restore
```

**V4 — web publishes from `dist/` (THE P1-5 check):**
```powershell
npm run build
npm pack --dry-run 2>&1 | Select-String -Pattern 'index.js','scss/','skills/','.claude-plugin/','custom-elements.json'
# These paths must appear at the TARBALL ROOT (no 'dist/' prefix), proving publishConfig.directory took effect.
# Also confirm the published manifest is the stripped one:
node -e "const p=require('./dist/package.json'); console.log('scripts.postinstall=',p.scripts?.postinstall??'(stripped)','scripts.publish=',p.scripts?.publish??'(stripped)','publishConfig.directory=',p.publishConfig?.directory??'(stripped)')"
```

**V5 — no `"*"` in dependents (only once `packages/angular` exists):**
```powershell
# Run after building angular; substitute the angular publish dir if different.
node -e "const p=require('./packages/angular/dist/package.json'); console.log('web dep =', p.dependencies?.['@universal-material/web'] ?? p.peerDependencies?.['@universal-material/web']); if((JSON.stringify(p)).includes('\"@universal-material/web\":\"*\"')) { console.error('STAR LEAKED'); process.exit(1); }"
```

**V6 — version preview produces the right numbers (dry-ish: inspect, then revert):**
```powershell
git stash --include-untracked   # protect working tree if needed
npm run version
node -e "console.log('web =>',require('./package.json').version)"   # expect 3.10.0
# if packages/angular exists:
# node -e "console.log('angular =>',require('./packages/angular/package.json').version)"  # expect 3.7.0
git checkout -- package.json .claude-plugin/plugin.json
git clean -fd .changeset CHANGELOG.md packages 2>$null   # restore consumed changesets / generated changelogs
git stash pop 2>$null
```

**V7 — web library untouched beyond the publish mechanism:**
```powershell
git status --porcelain src skills
# expect: empty (no src/ or skills/ content changes). .claude-plugin/plugin.json may show a version-only change after a real bump.
```

---

## Rollback notes

- **Fully additive + reversible.** To roll back the whole task:
  ```powershell
  Remove-Item -Recurse -Force .changeset
  Remove-Item sync-plugin-version.js, check-plugin-version.js -ErrorAction SilentlyContinue
  git checkout -- package.json remove-scripts-from-package.js .claude-plugin/plugin.json
  npm install   # drop @changesets/cli from node_modules / lockfile
  ```
  This restores the original `cd dist && npm publish` script behaviour and removes all versioning automation.
- **Publish mechanism is independently revertible:** removing only the `"publishConfig"` block from the root `package.json` and reverting `remove-scripts-from-package.js` returns the web package to "publish only via `cd dist && npm publish`". No consumer-visible change results from adding/removing `publishConfig` because it never reaches the published `dist/package.json` (stripped in B3).
- **No published-contract risk:** the produced `@universal-material/web` tarball is byte-for-byte what `cd dist && npm publish` produced — same `dist/` tree, same stripped scripts, same `skills/` + `.claude-plugin/` payload. The only added artifact is per-package git tags + CHANGELOGs, which are repo-side, not in the consumer tarball.
- **Angular/React substitution rollback:** if a `"*"` ever leaks (V5 fails), the fix is to set the dependent's web range to an explicit `^3.10.0` and re-run `changeset version`; no rollback of this task's config is required.

---

## Parallelizable in worktree? **no** — why

This task edits **release-critical, repo-global single-owner files**: the root `package.json` `scripts` block **and** its new top-level `publishConfig` (the same file every relocation/scaffold task touches), the shared `.changeset/config.json` (the **authoritative** body it owns), and `remove-scripts-from-package.js` (the publish post-processor that gates the consumer-facing tarball). Those are exactly the files where a parallel worktree's append-only edits would collide non-trivially, and where a wrong merge silently breaks publishing. **It must run STRICTLY AFTER `03-relocate-web-package.md`** (REVIEW P1-N2) — not "alongside Wave 1" — because `release` references `build:all` (owned by task 03) and both write the root `package.json` `scripts` block; running them concurrently races that block. It is also **temporally coupled** to the scaffold and Angular fold: the internal-dependency-substitution and `3.7.0`-baseline halves only become exercisable after `02-monorepo-scaffold.md` and `04-relocate-angular-package.md` have established `packages/` and `packages/angular`. The ADR marks versioning/release as **serial** for this reason. Land it on its own branch, after task 03 (and the scaffold), with no concurrent writer to `package.json` / `.changeset/` / `remove-scripts-from-package.js`.
