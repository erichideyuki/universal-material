# 02 — Build and release

Build orchestration, watch, caching seam, CI outline, versioning with Changesets,
per-package publish flow, and the M3-major version policy. Decisions are in
[`00-decision.md`](./00-decision.md); package identities in
[`01-package-layout.md`](./01-package-layout.md).

---

## 1. Dependency graph

```
@universal-material/web   (root, gulp+tsc+esbuild)          ← the only source-of-truth build
        ▲                    ▲                   ▲
        │ workspace dep      │                   │
@universal-material/angular  @universal-material/react   docs/ app (private, consumes built dist/)
   (ng-packagr)                (tsup + @lit/react)
        ▲
   vue/svelte/solid (optional, types-only — depend on web for types, no runtime)
```

- No cycles. **web builds first**; every wrapper consumes web's built `dist/` (resolved
  via the workspace symlink `node_modules/@universal-material/web` → repo root).
- The docs app is **not** a workspace member; it consumes `../dist` directly and is built
  only as a CI sanity check / for deployment, never published.

---

## 2. Build orchestration

### 2.1 Per-package build commands (unchanged where they exist)

| Package | `build` | Output / publish root |
| --- | --- | --- |
| **web** (root) | `run-s clean script:sass-to-ts build:esm build:bundle sass analyze copy && node remove-scripts-from-package.js` (UNCHANGED) | `dist/` (mirrored tree + `bundle.min.js` + `scss/` + `css/` + `custom-elements.json` + `skills/` + `.claude-plugin/`) |
| **angular** | `ng-packagr -p ng-package.json` | `packages/angular/dist/` |
| **react** | `tsup` (esm+cjs+dts) | `packages/react/dist/` |
| **vue/svelte/solid** | none, or `tsc --emitDeclarationOnly` | `src/*.d.ts` shipped as-is |

The web pipeline's invariant is preserved: **`gulp scripts:sass-to-ts` must run before
`tsc`** (it generates the `*.styles.ts` template literals the `.js` imports need). That
ordering lives entirely inside the web `build` script — the monorepo never reorders it.

### 2.2 Root orchestration (npm workspaces, no extra tooling)

```jsonc
// root package.json scripts (added; existing web scripts untouched)
"build:all": "npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present",
"test:all":  "npm test && npm test -ws --if-present",
"lint:all":  "npm run lint && npm run lint -ws --if-present"
```

- **Build order is explicit and serial across the web→wrapper boundary** (web first), then
  wrappers run sequentially. Wrappers are independent of each other, so they *could* be
  parallelized with `npm-run-all`'s `run-p`, but serial keeps logs readable and the build
  is fast enough (web is the long pole at ~10-15s cold).
- `-w <name>` targets a single workspace; `-ws` fans out to all; `--if-present` no-ops for
  scripts/packages that do not exist yet.
- The `docs:build` sanity check is a separate root script (`predocs` + `cd docs && ng
  build`, UNCHANGED).

### 2.3 Watch / local dev

- **Web library + docs site (primary loop, UNCHANGED):** `npm run docs` =
  `run-p build:watch docs:serve` (gulp `scripts:watch` + `ng serve` on :4200). The
  developer keeps this running. After a web change, the docs watcher picks up the new
  `dist/` within a few seconds.
- **Angular wrapper dev:** `npm run build:watch -w @universal-material/angular`
  (`ng-packagr --watch`). It consumes the web symlink; a web change requires the web watch
  (or a one-off `npm run build`) to refresh `dist/` first.
- **React wrapper dev:** `npm run build:watch -w @universal-material/react`
  (`tsup --watch`).
- **Everything at once:** `npm-run-all -p "build:watch" "build:watch -w @universal-material/angular" …`
  if simultaneous wrapper dev is needed. Not the common case.

Caveat (carried from CLAUDE.md gotchas): the web `build:watch` and any wrapper watch both
touch the workspace `node_modules`/`dist`; avoid two processes writing the **same**
package's `dist/` (web's `dist/` is written only by web's pipeline).

### 2.4 Caching seam (deferred, documented)

Phase 1 has **no** Turborepo/Nx. The seam to add one later **without restructuring
packages**: the root `build:all`/`test:all`/`lint:all` scripts are the only orchestration
entry points. To adopt Turborepo, replace their bodies with `turbo run build/test/lint`
and add a `turbo.json` declaring per-package `inputs`/`outputs` + `dependsOn: ["^build"]`.
To adopt Nx, add `project.json` per package wrapping the existing `build`/`test`/`lint` via
`nx:run-commands`. Either is a purely additive change. Trigger to do it: CI build time
exceeds ~3-4 min or the wrapper count grows past ~3 real runtime packages.

---

## 3. CI outline (GitHub Actions)

### 3.1 `.github/workflows/ci.yml` (on PR + push to main)

```yaml
name: CI
on: { pull_request: {}, push: { branches: [main] } }
jobs:
  build-test-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci                       # single root install; symlinks workspace deps
      # postinstall patch runs once here, mutating the hoisted @angular/compiler (dev-only)
      - run: npm run lint:all
      - run: npm run build:all            # web → angular → react
      - run: npm run test:all             # wtr (web) + ng test (angular) + vitest (react)
      - run: npm run docs:build           # docs app sanity build (not published)
  changeset-check:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx changeset status --since=origin/main   # fails if PR has no changeset
```

Notes:
- **`npm test:all` runs the web tests headfully** via `@web/test-runner-playwright`; CI
  must install the Playwright browser (`npx playwright install --with-deps chromium`)
  before `test:all`, or scope web tests to a CI-friendly launcher.
- `ng test` (Angular) uses karma+chrome-headless; CI needs Chrome (use the
  `browser-actions/setup-chrome` action or `puppeteer`-provided Chromium).
- Cache `~/.npm` (via `cache: npm`) and, optionally, each package's `dist/` keyed by a
  hash of its `src/` for incremental CI (the Turborepo/Nx upgrade in §2.4 automates this).

### 3.2 `.github/workflows/release.yml` (on push to main)

Use the **Changesets action**:

```yaml
name: Release
on: { push: { branches: [main] } }
concurrency: release
jobs:
  release:
    runs-on: ubuntu-latest
    permissions: { contents: write, pull-requests: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm, registry-url: https://registry.npmjs.org }
      - run: npm ci
      - run: npm run build:all
      - uses: changesets/action@v1
        with:
          # `version` opens/updates a "Version Packages" PR; merging it triggers `publish`
          version: npm run version          # changeset version
          publish: npm run release           # changeset publish (per-package, see §5)
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Whether publish is auto-on-merge of the Version PR or gated behind `workflow_dispatch` is
**open decision 00-decision §11.7**.

---

## 4. Versioning with Changesets

- **Model: independent per-package semver** (00-decision §8). Each PR that changes a
  publishable package adds `.changeset/<id>.md`:

  ```md
  ---
  "@universal-material/web": minor
  ---
  Harden field/select/tab/chip APIs; keep u-select selection across re-renders.
  ```

- `changeset version` consumes all pending changeset files, bumps each named package's
  `package.json`, writes/extends each package's `CHANGELOG.md`, applies
  `updateInternalDependencies: "patch"` to dependents, and deletes the changeset files.
- `changeset publish` publishes every package whose version is ahead of the registry and
  creates per-package git tags (`@universal-material/web@3.10.0`, etc.).

### 4.1 The web `plugin.json` lockstep guard

`.claude-plugin/plugin.json` `version` must equal the web `package.json` version (they
ship together). Add a CI assertion (a tiny node script or `jq` check) in `ci.yml` that
fails if they diverge, and a `changeset version` post-step (or a `predist`/`copy` hook)
that syncs `plugin.json` from `package.json`. This keeps the existing lockstep rule
mechanical instead of manual.

---

## 5. Per-package publish flow

Each package publishes from its **own** publish root with its **own** toolchain;
`changeset publish` invokes `npm publish` per package, but the *build to publish root* is
each package's responsibility (run by `build:all` before publish):

| Package | Build to publish root | Publish root | Notes |
| --- | --- | --- | --- |
| **web** | `npm run build` | **`dist/`** | `copy` includes `skills/` + `.claude-plugin/`; `remove-scripts-from-package.js` strips `postinstall`+`publish` from `dist/package.json` so consumers never run the Angular-compiler patch. The `dist/package.json` `"@universal-material/web": "*"` does not apply (web has no self-dep); web's deps are concrete ranges already. |
| **angular** | `ng-packagr` | `packages/angular/dist/` | ng-packagr emits fesm2022/esm/types. Its `dependencies."@universal-material/web": "*"` is rewritten by Changesets to the published range (e.g. `^3.10.0`) at publish. `animated-scroll-to` carried via `allowedNonPeerDependencies`. |
| **react** | `tsup` | `packages/react/dist/` | esm+cjs+dts; `react`/`react-dom`/`@universal-material/web` are `external` (peers); `@lit/react` bundled or external+dep. |
| **vue/svelte/solid** | none / `tsc -d` | package root (`src/*.d.ts`) | types + README only; nothing to compile if hand-authored `.d.ts`. |

**npm publish provenance / 2FA:** set the npm token as `NODE_AUTH_TOKEN`; consider
`--provenance` (requires `id-token: write`, already in the release job perms). Confirm
org-level 2FA-on-publish policy with the maintainer.

**`workspace`-spec rewriting under npm:** npm workspaces uses `"*"` (not pnpm's
`workspace:*` literal) for the internal dep; Changesets + `npm publish` substitute the
concrete version. Verify with a dry run (`npm publish --dry-run` / `npm pack`) that the
published `packages/angular/dist/package.json` carries a real range, not `"*"`.

---

## 6. M3-major version policy (restated for releases)

- **Major == Material spec generation.** M3 → `3.x`; M4 → `4.x`. The major only moves when
  Material publishes a new generation, and at that point **all** published packages cross
  to the new major together (the one intentional lockstep moment — drive it with a single
  release that contains a `major` changeset for every package).
- **In-library breaking changes** (renames, removed exports, changed defaults) bump the
  **minor**, not the major. The current API-hardening work → web **`3.10.0`**.
- **Wrappers move independently** on their own minor/patch lines between generations,
  constrained only by their `@universal-material/web` **peer range** (e.g. Angular
  `^3.10.0`). A wrapper-only fix bumps only that wrapper.
- **Pre-1.0 wrappers** (react `0.1.0`, optional types packages) follow normal pre-1.0
  semver: breaking changes bump the minor until they reach `1.0.0`.

---

## 7. First-release runbook (condensed)

1. Commit the Angular working-tree migration on `feature/m3` and push (prereq for subtree —
   00-decision §7).
2. In the web repo root: add `"workspaces"`, root scripts, `@changesets/cli`,
   `.changeset/config.json`, `tsconfig.base.json`; have web `tsconfig.json` extend it.
3. `git subtree add --prefix=packages/angular <angular-url> feature/m3`.
4. In `packages/angular`: delete submodule/`build-web.mjs`/path-hack/duplicated deps; set
   identity (01-package-layout §3.2); point `tsconfig.lib.json` at `../../tsconfig.base.json`.
5. `npm install` at root; verify `node_modules/@universal-material/web` is a symlink.
6. `npm run build:all` + `npm run test:all` + `npm run docs:build` green.
7. Add `.github/workflows/{ci,release}.yml`.
8. Create the first changesets: web `minor` (→ 3.10.0), angular `minor` (→ 3.7.0).
9. `npm run version`; review bumped `package.json`s + CHANGELOGs + `plugin.json` sync.
10. Tag + `npm run release` (or via the Changesets action). Verify `npm pack` contents per
    package (web includes `skills/` + `.claude-plugin/`; angular/react carry a real web
    range, not `"*"`).
11. Phase 2: scaffold `packages/react`, generate wrappers from `custom-elements.json`, add
    to `build:all`, ship `0.1.0`. Add framework-usage docs pages for Vue/Svelte/Solid.
```
