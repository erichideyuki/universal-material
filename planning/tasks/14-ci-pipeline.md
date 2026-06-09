# Task 14 — CI pipeline

Build + test every package on PR; release workflow with Changesets; matrix per framework.

---

## Scope (ONE unit only)

Add GitHub Actions automation to the **web-rooted monorepo** at
`D:/Projects/universal-material-web`. Concretely, create exactly two workflow files plus
one helper script:

1. `.github/workflows/ci.yml` — runs on every PR and on push to `main`. Installs the
   workspace once, lints/builds/tests **every package** (web + Angular + React when
   present), builds the docs app as a sanity check, asserts the
   `plugin.json` ↔ `package.json` version lockstep, and (on PRs) enforces a Changeset is
   present. Includes a **per-framework matrix** so each wrapper's tests run as an isolated,
   independently-reportable job.
2. `.github/workflows/release.yml` — runs on push to `main`. Uses the Changesets action to
   open/refresh a "Version Packages" PR and, on merge of that PR, publish each package from
   its own publish root.
3. `scripts/check-plugin-version.mjs` — a tiny Node script asserting
   `.claude-plugin/plugin.json` `version` equals the root `package.json` `version` (the
   existing lockstep rule, made mechanical).

**Out of scope** (owned by other task files — see Preconditions): adding the
`workspaces` array / root orchestration scripts / Changesets dependency to
`package.json`, the `.changeset/config.json`, the `git subtree` fold of Angular, deleting
the submodule/`build-web.mjs`/path-hack, scaffolding `packages/react`. This task **only**
authors the CI/release plumbing that *consumes* those scripts.

There is currently **no `.github/` directory in the repo** (confirmed: the migration
baseline in `planning/current/07-git-and-release-state.md` §1 states "No `.github/`
directory at all"), so every file in this task is net-new.

---

## Preconditions & Dependencies

These workflows call root npm scripts (`lint:all`, `build:all`, `test:all`,
`docs:build`, `changeset`, `version`, `release`) and assume the workspace layout exists.
The following task files **must land first** (filenames are the canonical task names in
`planning/tasks/`; if a sibling numbering differs, match by the description below):

- **`02-monorepo-scaffold.md`** — adds `"workspaces": ["packages/*"]`,
  the root orchestration scripts `build:all` / `test:all` / `lint:all`, and the
  `changeset` / `version` / `release` scripts to the root `package.json`, plus
  `@changesets/cli` as a devDependency, **and** `.changeset/config.json`. (Spec:
  `planning/architecture/01-package-layout.md` §3.1, §6 and
  `planning/architecture/02-build-and-release.md` §2.2.) **Hard dependency** — the
  workflows invoke `npm run lint:all`, `npm run build:all`, `npm run test:all`,
  `npm run version`, `npm run release`, and `changeset status` (plus the Changesets
  action) require the `.changeset/config.json` it creates.
- **`04-relocate-angular-package.md`** — folds `packages/angular` via `git subtree` and
  rewires it to the workspace dep (Spec: `00-decision.md` §6–§7,
  `planning/current/05-angular-consumption-wiring.md`). **Soft dependency** — the CI matrix
  has an `angular` entry; until the package exists, `npm test -w @universal-material/angular`
  is guarded by `--if-present`/`if: hashFiles(...)` so the job no-ops instead of failing.
- **`packages/react` scaffold task** (phase 2) — soft dependency, same `--if-present`
  guard. The `react` matrix entry stays inert until the package lands.

This task can be **authored** before the dependencies land (the files are static YAML +
one Node script). The workflows only *succeed end-to-end* once `01` and `02` are merged. To
keep CI green in the interim, every package-specific step is guarded (see §"Step 3" guards),
so a PR that adds these workflows before the workspace scripts exist will still pass
(steps no-op rather than erroring).

---

## Context (execute COLD — zero chat memory)

### Repo & toolchain (verified facts)

- Repo root: `D:/Projects/universal-material-web` = the `@universal-material/web` package
  (root `package.json`, name `@universal-material/web`, version `3.9.0`, `type: module`).
  Confirmed by reading `D:/Projects/universal-material-web/package.json`.
- Installed toolchain: **Node v24.0.2, npm 11.3.0** (verified via `node --version` /
  `npm --version`). CI must pin **Node 24** to match. npm workspaces is native here — no
  pnpm/Nx (decision: `planning/architecture/00-decision.md` §2–§3).
- `origin` remote: `https://github.com/universal-material/universal-material-web`
  (`07-git-and-release-state.md` §1). Default/base branch = **`main`**
  (`.changeset/config.json` `baseBranch` is `main` per `01-package-layout.md` §6). Note the
  current working branch is `fix/round2-api-candidates`, which sits at the **same commit**
  as `main` (`e804c22`), so `origin/main` is the correct base for `changeset status`.

### How each package is built / tested / linted (exact commands, verified)

From the **root** `package.json` `scripts` (web library; verified by reading the file):

- `build` = `run-s clean script:sass-to-ts build:esm build:bundle sass analyze copy && node remove-scripts-from-package.js`
  — the serial gulp+tsc+esbuild pipeline. **`script:sass-to-ts` MUST run before `tsc`**
  (it generates the `*.styles.ts` template literals the compiled `.js` imports need); this
  ordering lives entirely inside `build`, so CI just calls `build`/`build:all`.
- `test` = `wtr --config web-test-runner.config.js`. **This launches Playwright Chromium**
  (confirmed in `web-test-runner.config.js`: default `browsers: [browsers.chromium]`, using
  `@web/test-runner-playwright`'s `playwrightLauncher({ product: 'chromium' })`). CI **must**
  run `npx playwright install --with-deps chromium` before web tests, or `wtr` fails to
  launch a browser.
- `lint` = `npm run lint:lit-analyzer && npm run lint:eslint && npm run lint:prettier`
  (lit-analyzer + eslint over `src/**/*.ts` + prettier `--check`).
- `docs:build` = `npm run predocs && cd docs && ng build` (`predocs` = `run-p analyze docs:apis script:sass-to-ts`).
  The docs app is **private/unpublished** — it is a CI **sanity build only**, never released
  (`01-package-layout.md` §2; `02-build-and-release.md` §1).
- `postinstall` = `node ./change-compiler-to-add-custom-elements.js` — a **dev-only** patch
  that mutates the hoisted `node_modules/@angular/compiler/fesm2022/compiler.mjs` so the
  Angular docs template type-checker knows the `u-*` elements. It runs automatically on
  `npm ci`. It is **stripped** from the published `dist/package.json` by
  `remove-scripts-from-package.js`, so npm consumers never run it. CI does **not** need to
  invoke it explicitly; just be aware `npm ci` triggers it (and it needs `@angular/compiler`
  present in `node_modules`, which it is — devDependency `@angular/compiler@^20`).

Per-package scripts the matrix will call (added by the dependency tasks; spec
`01-package-layout.md` §3.2/§3.3):

- **angular** (`packages/angular`): `build` = `ng-packagr -p ng-package.json`,
  `test` = `ng test` (karma + headless Chrome — CI needs Chrome), `lint` = `eslint src/**/*.ts`.
- **react** (`packages/react`, phase 2): `build` = `tsup`, `test` = `vitest run`,
  `lint` = `eslint src/**/*.ts`.
- **vue/svelte/solid**: types-only, no build/test — excluded from the matrix.

### Release model (verified facts)

- **Changesets, independent per-package semver** (`00-decision.md` §8;
  `02-build-and-release.md` §4). Root scripts (from dependency task `01`):
  `changeset` = `changeset`, `version` = `changeset version`, `release` = `changeset publish`.
- `02-build-and-release.md` §5 publish table: **web publishes from `dist/`**
  (`skills/` + `.claude-plugin/` included; `postinstall`+`publish` stripped),
  **angular from `packages/angular/dist/`** (ng-packagr output), **react from
  `packages/react/dist/`** (tsup output). `changeset publish` runs `npm publish` per package;
  the **build to each publish root** is `build:all`'s responsibility and must run before
  publish.
- The web's old manual `"publish": "npm run lint:eslint && cd dist && npm publish"` script
  stays in `package.json` but is **not** invoked by CI — Changesets `release` supersedes it.
  (Do not call the web `publish` script from any workflow; `changeset publish` handles web's
  `dist/` via the package's `publishConfig`/files. If the first dry run shows web is not
  picked up because it publishes from a subdir, see §"Risks" for the `dist/` publish-root
  note.)
- **`plugin.json` lockstep guard** (`02-build-and-release.md` §4.1): `.claude-plugin/plugin.json`
  `version` must equal root `package.json` `version` (they ship together inside the web
  tarball). CI asserts this; a future `changeset version` post-step syncs it (that sync step
  is owned by task `01`/a copy hook, not here — CI only *asserts*).

### Why a per-framework matrix

The goal line is "matrix per framework." Each wrapper has a **different test runner**
(web = wtr/Playwright, angular = karma/Chrome, react = vitest/node) and different browser
needs. A matrix gives each framework its own job with the right browser setup and an
independent pass/fail signal in the PR checks UI, instead of one monolithic step where an
Angular karma failure hides a web wtr failure. The web build is the long pole (~10–15s
cold per `02-build-and-release.md` §2.2) and is a dependency of the wrappers, so the matrix
jobs that need built web re-run `build:all` (cheap, cached npm) rather than sharing
artifacts in phase 1 (artifact sharing is the deferred caching seam, §2.4).

---

## Step-by-step changes (exact file paths + commands)

### Step 0 — create the directory

```bash
mkdir -p D:/Projects/universal-material-web/.github/workflows
mkdir -p D:/Projects/universal-material-web/scripts   # if it does not already exist
```

(On Windows/PowerShell: `New-Item -ItemType Directory -Force .github/workflows, scripts`.)

### Step 1 — `.github/workflows/ci.yml`

Create `D:/Projects/universal-material-web/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request: {}
  push:
    branches: [main]

# Cancel superseded runs on the same ref to save minutes.
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── Per-framework matrix: one job per publishable runtime package ──────────────
  build-test:
    name: build-test (${{ matrix.framework }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        framework: [web, angular, react]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      # Single root install for the whole workspace. Runs the web package's
      # postinstall patch once against the hoisted @angular/compiler (dev-only).
      - run: npm ci

      # Browsers needed per framework:
      #   web   → Playwright Chromium (wtr default launcher)
      #   angular → headless Chrome for karma
      - name: Install Playwright Chromium (web)
        if: matrix.framework == 'web'
        run: npx playwright install --with-deps chromium

      - name: Install Chrome (angular)
        if: matrix.framework == 'angular'
        uses: browser-actions/setup-chrome@v1

      # Lint. web has a real `lint`; wrappers expose `lint` once they exist.
      - name: Lint (web)
        if: matrix.framework == 'web'
        run: npm run lint
      - name: Lint (wrapper)
        if: matrix.framework != 'web'
        run: npm run lint -w @universal-material/${{ matrix.framework }} --if-present

      # Build. ALWAYS build web first (wrappers consume its dist/ via the
      # workspace symlink). Then build the matrix's own package.
      - name: Build web
        run: npm run build
      - name: Build wrapper
        if: matrix.framework != 'web'
        run: npm run build -w @universal-material/${{ matrix.framework }} --if-present

      # Test the matrix's package.
      - name: Test (web)
        if: matrix.framework == 'web'
        run: npm test
      - name: Test (wrapper)
        if: matrix.framework != 'web'
        env:
          # Angular karma headless Chrome flags for CI sandboxes.
          CHROME_BIN: ${{ steps.setup-chrome.outputs.chrome-path }}
        run: npm test -w @universal-material/${{ matrix.framework }} --if-present

  # ── Docs app sanity build (private, never published) ──────────────────────────
  docs-build:
    name: docs-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run docs:build

  # ── plugin.json ↔ package.json version lockstep guard ─────────────────────────
  version-lockstep:
    name: version-lockstep
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: node scripts/check-plugin-version.mjs

  # ── Changeset presence (PRs only) ─────────────────────────────────────────────
  # Gated so the pipeline is GREEN BY DEFAULT: the job only runs once
  # .changeset/config.json exists (created by 02-monorepo-scaffold.md). Before that
  # config lands, the whole job is skipped — it never red-fails on a missing config.
  changeset-check:
    name: changeset-check
    if: github.event_name == 'pull_request' && hashFiles('.changeset/config.json') != ''
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # changeset status needs the base branch history
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      # Fails if the PR touches a publishable package without a changeset.
      - run: npx changeset status --since=origin/main
```

Notes embedded in the YAML above (do not omit):

- `matrix.framework: [web, angular, react]` is the **per-framework matrix** (the goal's
  "matrix per framework"). `fail-fast: false` so one framework's failure doesn't cancel the
  others.
- The `--if-present` on every wrapper step makes the workflow **safe to merge before the
  wrapper packages exist** (preconditions): `npm run <script> -w @universal-material/angular --if-present`
  is a no-op when the workspace or script is absent.
- `setup-chrome` exposes the Chrome path; if `browser-actions/setup-chrome@v1` is not the
  preferred action, the equivalent is `puppeteer`-provided Chromium or
  `google-chrome-stable` from apt. Karma's `ChromeHeadless` needs `--no-sandbox` in CI —
  the Angular task should configure a `ChromeHeadlessCI` custom launcher in `karma.conf`;
  if it does not, set `CHROME_BIN` and pass `--browsers ChromeHeadlessNoSandbox`.
  (Cross-reference: the Angular subtree task owns karma config; this CI file only provides
  the binary + env.)
- `changeset status --since=origin/main` is the gate. `fetch-depth: 0` is required so the
  base ref is available.

### Step 2 — `.github/workflows/release.yml`

Create `D:/Projects/universal-material-web/.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]

# Only one release pipeline at a time.
concurrency: release-${{ github.workflow }}

jobs:
  release:
    name: release
    runs-on: ubuntu-latest
    permissions:
      contents: write        # push the Version Packages PR + tags
      pull-requests: write   # open/refresh the Version Packages PR
      id-token: write        # npm provenance (--provenance), if enabled
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          registry-url: https://registry.npmjs.org

      - run: npm ci

      # Build every publish root BEFORE publish:
      #   web   → dist/ (skills/ + .claude-plugin/ copied, scripts stripped)
      #   angular → packages/angular/dist/  (ng-packagr)
      #   react   → packages/react/dist/    (tsup)
      - run: npm run build:all

      - name: Changesets — version PR or publish
        uses: changesets/action@v1
        with:
          # `version` opens/updates the "Version Packages" PR.
          # `publish` runs on push to main when there are no pending changesets
          # (i.e. right after the Version PR merges) and publishes each bumped package.
          version: npm run version
          publish: npm run release
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Uncomment to enable npm provenance (requires id-token: write, above):
          # NPM_CONFIG_PROVENANCE: "true"
```

Notes:

- This is the **auto-on-merge** flow (the recommended default per `02-build-and-release.md`
  §3.2): merging the "Version Packages" PR into `main` triggers this workflow again, finds
  no pending changesets, and `publish` runs. If the maintainer prefers a **gated** publish
  (open decision `00-decision.md` §11.7), change the trigger to add
  `workflow_dispatch: {}` and set `publish` to run only on manual dispatch — but the
  Changesets action already gates publish behind "no pending changesets," so auto-on-merge
  is safe and is what this file ships.
- `NPM_TOKEN` (a granular npm automation token with publish rights to the
  `@universal-material` scope) and the default `GITHUB_TOKEN` are the only secrets. Document
  in the repo settings that `NPM_TOKEN` must be added; the workflow references
  `secrets.NPM_TOKEN`.
- `npm run build:all` runs **before** the Changesets action so every package's publish root
  is populated when `changeset publish` calls `npm publish` per package.

### Step 3 — `scripts/check-plugin-version.mjs`

Create `D:/Projects/universal-material-web/scripts/check-plugin-version.mjs`:

```js
// Asserts .claude-plugin/plugin.json version === root package.json version.
// The two ship together inside the @universal-material/web npm tarball
// (skills/ + .claude-plugin/ are copied into dist/), so they MUST stay in lockstep.
// Spec: planning/architecture/02-build-and-release.md §4.1.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const plugin = JSON.parse(
  readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8'),
);

if (pkg.version !== plugin.version) {
  console.error(
    `Version lockstep violated:\n` +
      `  package.json           = ${pkg.version}\n` +
      `  .claude-plugin/plugin.json = ${plugin.version}\n` +
      `These must match (they ship together). Sync plugin.json to the package version.`,
  );
  process.exit(1);
}
console.log(`plugin.json version OK (${plugin.version})`);
```

This script has **no dependencies** (pure Node ESM, uses `node:` builtins), so the
`version-lockstep` CI job does not need `npm ci`.

### Step 4 — (optional but recommended) document the secret + branch protection

Add a short note to the repo's `README.md` (or a `CONTRIBUTING.md`) under a "Releasing"
heading: the `Release` workflow needs `secrets.NPM_TOKEN` (npm automation token, scope
`@universal-material`, publish rights); enable branch protection on `main` requiring the
`build-test (web)`, `build-test (angular)`, `build-test (react)`, `docs-build`, and
`version-lockstep` checks. (Branch-protection config is a GitHub UI action, not a file in
this task — note it for the maintainer.) **Do not mark `changeset-check` as a *required*
check until `.changeset/config.json` exists** (task 02): the job is gated by
`hashFiles('.changeset/config.json') != ''`, so it is *skipped* (not run) before then, and a
required-but-skipped check would block merges. Add it to the required set once task 02 has
landed the config.

---

## Acceptance criteria

1. `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and
   `scripts/check-plugin-version.mjs` exist at the exact paths above.
2. `ci.yml` defines a **matrix over `[web, angular, react]`** (per-framework jobs) with
   `fail-fast: false`, plus separate `docs-build`, `version-lockstep`, and
   `changeset-check` jobs. `changeset-check` is PR-only **and** gated on the config existing
   (`if: github.event_name == 'pull_request' && hashFiles('.changeset/config.json') != ''`),
   so the pipeline is **green by default** and the check only activates once task 02's
   `.changeset/config.json` lands — it never red-fails on a missing config.
3. CI pins **Node 24** in every job (matches the installed toolchain).
4. The web matrix job installs **Playwright Chromium** before `npm test`; the angular job
   installs **Chrome** before `ng test`. (Without these the wtr/karma launchers fail.)
5. Every wrapper-specific step uses `-w @universal-material/<framework> --if-present` so the
   workflow is **green even before `packages/angular` / `packages/react` exist** (no hard
   failure for a not-yet-folded wrapper).
6. `build:all` runs **web first** in both CI (implicitly, via the always-run "Build web"
   step) and release (explicitly, before the Changesets action).
7. `release.yml` uses `changesets/action@v1` with `version: npm run version` /
   `publish: npm run release`, has `permissions: { contents: write, pull-requests: write, id-token: write }`,
   `concurrency: release-…`, and references `secrets.NPM_TOKEN` + `secrets.GITHUB_TOKEN`.
8. `scripts/check-plugin-version.mjs` exits non-zero with a clear message when
   `.claude-plugin/plugin.json` version ≠ root `package.json` version, and exits 0 when they
   match — verified locally (see Verification).
9. No existing file is modified except (optionally) `README.md`/`CONTRIBUTING.md` for the
   secret note. The web `build`/`test`/`lint`/`publish`/`postinstall` scripts are untouched.

---

## Verification commands

Run from `D:/Projects/universal-material-web`.

**Lint the workflow YAML (syntax):**
```bash
# Any of these; the repo has Node, so use a quick JS yaml parse if no actionlint:
npx --yes actionlint .github/workflows/ci.yml .github/workflows/release.yml || \
  node -e "const y=require('yaml');for(const f of ['.github/workflows/ci.yml','.github/workflows/release.yml'])y.parse(require('fs').readFileSync(f,'utf8'));console.log('yaml OK')"
```

**Verify the lockstep script — pass case (versions currently match: both `3.9.0`):**
```bash
node scripts/check-plugin-version.mjs
# expect: "plugin.json version OK (3.9.0)" and exit 0
```
Confirm `.claude-plugin/plugin.json` exists and reads `3.9.0` first
(`node -e "console.log(require('./.claude-plugin/plugin.json').version)"`). The
current root `package.json` version is `3.9.0` (verified), so this must print OK.

**Verify the lockstep script — fail case (temporarily mutate, then revert):**
```bash
node -e "const fs=require('fs');const p='./.claude-plugin/plugin.json';const j=JSON.parse(fs.readFileSync(p));const orig=j.version;j.version='0.0.0';fs.writeFileSync(p,JSON.stringify(j,null,2));try{require('child_process').execSync('node scripts/check-plugin-version.mjs',{stdio:'inherit'})}catch(e){console.log('correctly exited non-zero')}finally{j.version=orig;fs.writeFileSync(p,JSON.stringify(j,null,2))}"
# expect: error message + "correctly exited non-zero", and plugin.json restored
```

**End-to-end (only meaningful AFTER dependency tasks 01/02 land):**
```bash
npm ci
npm run lint:all
npm run build:all
npm run test:all
npm run docs:build
npx changeset status --since=origin/main   # needs .changeset/config.json (task 02)
```

**Push-based verification:** open a draft PR containing these files. Confirm the Actions tab
shows the matrix jobs `build-test (web)`, `build-test (angular)`, `build-test (react)`,
plus `docs-build` and `version-lockstep`. Before task 02 lands the wrapper steps no-op, and
`changeset-check` is **skipped** by its `hashFiles('.changeset/config.json') != ''` guard
(no `.changeset/config.json` yet) — so the pipeline is **green by default**. Once task 02
merges the minimal `.changeset/config.json`, the guard activates and `changeset-check` begins
running on PRs.

---

## Rollback notes

- This task is **purely additive** — it creates `.github/workflows/{ci,release}.yml` and
  `scripts/check-plugin-version.mjs` and (optionally) appends a README "Releasing" section.
  Rollback = `git rm .github/workflows/ci.yml .github/workflows/release.yml scripts/check-plugin-version.mjs`
  and revert the README hunk. Nothing else in the repo references these files; removing them
  returns the repo to the manual `npm run publish` flow (`07-git-and-release-state.md` §1).
- If the **release workflow misfires** (e.g. publishes an unintended version), the npm
  packages can be deprecated but not unpublished after 24h — so keep `release.yml` behind a
  protected `main` and verify the first run with the dry-run note in §Risks before enabling
  `NPM_TOKEN` in repo secrets. Until `NPM_TOKEN` is set, the Changesets action's `publish`
  step will fail auth and **publish nothing** — a safe default.
- The CI workflow has no side effects beyond compute minutes; disabling it is removing the
  file or toggling the workflow off in the Actions UI.

## Risks / things to confirm during execution

- **Web publishes from `dist/`, not the package root.** `changeset publish` runs
  `npm publish` in each package directory. The web package's tarball is assembled in `dist/`
  by `build` + `copy` + `remove-scripts-from-package.js`. Confirm with
  `npm publish --dry-run` (or `npm pack`) from `dist/` that the tarball includes `skills/`,
  `.claude-plugin/`, `scss/`, `custom-elements.json`, and that `postinstall`/`publish` are
  stripped. If Changesets cannot drive publishing from a subdir for the web package, the
  fallback is a `prepublishOnly`/`publishConfig` that points at `dist/`, or a custom
  `release` script that `cd dist && npm publish` for web while delegating wrappers to
  `changeset publish`. This wiring is owned by task `01`; CI just calls `npm run release`.
  (Cross-ref: `02-build-and-release.md` §5 + `00-decision.md` §10.)
- **Internal dep range rewrite.** Verify the published `packages/angular/dist/package.json`
  carries a real range for `@universal-material/web` (e.g. `^3.10.0`), not the literal `"*"`
  — npm workspaces uses `"*"` not `workspace:*`, and Changesets + npm should substitute the
  concrete version (`02-build-and-release.md` §5, last row). Check via `npm pack` in the
  release dry run.
- **Karma in CI.** `ng test` needs a no-sandbox headless Chrome launcher. If the Angular
  task's `karma.conf` lacks a `ChromeHeadlessCI` customLauncher, the angular matrix job will
  hang/fail; coordinate with `04-relocate-angular-package.md`.

---

Parallelizable in worktree? **yes** — this task only creates net-new files
(`.github/workflows/ci.yml`, `.github/workflows/release.yml`,
`scripts/check-plugin-version.mjs`, optional README note) that no other task edits, and it
touches none of the source/build/package files the workspace/subtree/react tasks modify. It
can be authored in an isolated worktree in parallel; it only *runs green end-to-end* once
the dependency task (`02-monorepo-scaffold`) merges, but
authoring and committing the files has no merge conflict surface with them.
