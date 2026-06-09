# 05 — How the Angular package consumes the web library (current wiring)

This document captures **how `@universal-material/angular` currently consumes
`@universal-material/web` today**, before the planned monorepo migration. It is
the "before" picture the monorepo will replace: a git submodule of the web repo,
a build-before-serve shim that compiles that submodule in place, a tsconfig path
hack that points the bare specifier at the submodule's `dist/`, and a set of web
runtime dependencies re-declared by hand in the Angular `package.json`.

All paths below are relative to the Angular workspace root
`D:/Projects/universal-material-angular` unless stated otherwise.

---

## 1. The web library is a git submodule, not an npm dependency

`.gitmodules` vendors the web repo under `./universal-material-web`:

```ini
# .gitmodules
[submodule "universal-material-web"]
	path = universal-material-web
	url = https://github.com/universal-material/universal-material-web.git
	branch = main
```

Key facts:

- **Path**: the submodule lives at the workspace root as `universal-material-web/`.
- **Tracked branch**: `main` (`submodule.universal-material-web.branch=main`),
  so `git submodule update --remote` follows `main`.
- **Pinned commit (gitlink)**: the superproject records a specific SHA, not a
  floating ref. `git submodule status` currently reports:
  ```
   e804c22330a4ec72179deb7bd7c06c0d734938b1 universal-material-web (heads/main)
  ```
  That `e804c22…` gitlink is the exact web commit this Angular checkout builds
  against. Updating the web library is a two-step dance: pull inside the
  submodule, then commit the moved gitlink in the superproject. The Angular repo
  and the web repo therefore version-drift independently and must be manually
  re-pinned — there is no semver range tying them together.
- The submodule is **not installed via npm**: `@universal-material/web` does
  **not** appear in the Angular `package.json` `dependencies`. It is resolved
  purely through the tsconfig path map (§3) against the submodule's build output.

The web submodule on disk currently has **both** `src/index.ts` and a built
`dist/index.js`, i.e. it is a full source checkout that gets compiled locally
(see §2), not a flat prebuilt package.

---

## 2. Build-before-serve: `scripts/build-web.mjs`

`scripts/build-web.mjs` compiles the submodule into its own `dist/` so the path
map (§3) has something to resolve. Its own header comment states the intent:

> Builds the `@universal-material/web` GIT SUBMODULE (an external git repo
> vendored under `./universal-material-web` — NOT an npm dependency) into its
> `dist/`, so this Angular workspace resolves `@universal-material/web` via the
> tsconfig path map (-> `universal-material-web/dist/index`).

What the script does, in order (`scripts/build-web.mjs`):

1. **Existence guard** — if `universal-material-web/package.json` is missing it
   errors with `Run "git submodule update --init"` and exits 1. So a fresh clone
   without `--recurse-submodules` fails fast.
2. **Source vs prebuilt detection** — `hasSource = exists(src/index.ts)`.
   - If there is no source but a root `index.js` exists, it treats the submodule
     as an already-built flat npm package and does nothing.
   - If there is neither source nor a built entry, it errors.
3. **Skip-if-built** — if `dist/index.js` already exists and `FORCE_WEB_BUILD`
   is not `1`, it skips the build (`set FORCE_WEB_BUILD=1 to rebuild`). This is
   why edits inside the submodule are **not** picked up on a normal
   `npm start` — you must set `FORCE_WEB_BUILD=1` or delete `dist/`.
4. **First-run dependency install** — if `universal-material-web/node_modules/.bin`
   is absent it runs, inside the submodule:
   ```
   npm install --ignore-scripts --no-audit --no-fund --legacy-peer-deps
   ```
   - `--legacy-peer-deps`: the web lib's *docs* devDeps (`ngx-highlightjs ->
     @angular/cdk`) have peer conflicts irrelevant to the sass+tsc build.
   - `--ignore-scripts`: skips esbuild/playwright binary postinstalls (only gulp
     sass-to-ts + tsc are needed here, never esbuild). Note this also skips the
     web lib's own `postinstall`.
   So the submodule grows its **own nested `node_modules`** (a second full copy
   of lit, etc.) just to be compiled.
5. **Compile styles** — `npm run script:sass-to-ts` inside the submodule (gulp
   compiles every `*.styles.scss` → `*.styles.ts`).
6. **Compile TypeScript** — `npm run build:bundle` inside the submodule (which is
   `tsc`, emitting `dist/`). `tsc` failures are caught and treated as non-fatal
   ("likely nested-lit portability" TS2742 warnings); only a **missing**
   `dist/index.js` afterwards is fatal.
7. **Verify** — errors out if `dist/index.js` was not produced.

This script is wired as an npm **pre-hook** on every entry point in
`package.json`:

```jsonc
// package.json
"build:web":     "node scripts/build-web.mjs",
"prestart":      "npm run build:web",   // before `ng serve demo`
"prebuild":      "npm run build:web",   // before `ng build` (the library)
"prebuild:demo": "npm run build:web",   // before `ng build demo`
"pretest":       "npm run build:web",   // before `ng test`
```

So **serving, building, building the demo, and testing all force the submodule to
be compiled first** (subject to the skip-if-built short-circuit). The web library
is effectively a local sub-build of the Angular workspace, gated behind a custom
mjs script rather than the package manager.

---

## 3. The path hack: tsconfig `paths` → submodule `dist/`

`tsconfig.json` maps the bare package specifier directly onto the submodule's
build output:

```jsonc
// tsconfig.json (compilerOptions.paths)
"@universal-material/web":   ["universal-material-web/dist/index"],
"@universal-material/web/*": ["universal-material-web/dist/*"],
```

(For comparison, the same `paths` block self-aliases the Angular library:
`"@universal-material/angular": ["src"]`.)

Consequences:

- Every `import … from '@universal-material/web'` in the Angular source and demo
  is **not** resolved from `node_modules` — TypeScript rewrites it to
  `universal-material-web/dist/index(.js/.d.ts)`. If §2 hasn't run, that file
  doesn't exist and the build breaks; hence the `pre*` hooks.
- There are ~23 import sites across `src/` and `demo/` (e.g.
  `src/index.ts` re-exports `SnackbarDuration` from `@universal-material/web`;
  the value-accessors in `src/value-accessors/*` and the directives in
  `src/tab-bar/`, `src/dialog/`, `src/snackbar/` import web types/elements).
- The Angular **library** package manifest (`src/package.json`) declares the web
  lib as a **peerDependency** (`"@universal-material/web": "^3.9.0"`), and
  `src/ng-package.json` whitelists it via
  `"allowedNonPeerDependencies": ["@universal-material/web", "animated-scroll-to"]`.
  So at *publish* time the dependency is expressed correctly (a `^3.9.0` peer),
  but at *develop/build* time inside this repo it is satisfied by the
  submodule + path map, **not** by an installed `@universal-material/web`. The
  development resolution and the published contract are two different mechanisms
  describing the same dependency.

---

## 4. The web library's SCSS is consumed by path, too

`angular.json` pulls the **global stylesheet straight out of the submodule
working tree** (not from `node_modules`, not from the submodule's `dist/scss`):

```jsonc
// angular.json → projects.demo.architect.build.options.styles
"styles": [
  "node_modules/@mdi/font/scss/materialdesignicons.scss",
  "node_modules/@universal-material/core/dist/css/universal-material-no-reboot.css",
  "node_modules/highlight.js/styles/atelier-sulphurpool-light.css",
  "universal-material-web/scss/universal-material.scss",   // <- submodule working tree
  "demo/src/styles.scss"
]
```

So there are **two** distinct couplings to the submodule:
1. **TS/JS**: via the tsconfig `paths` map → submodule `dist/index` (compiled JS).
2. **SCSS**: via this `styles` entry → submodule `scss/universal-material.scss`
   (raw SCSS source, compiled by Angular's own sass pipeline).

`universal-material-web/scss/universal-material.scss` is confirmed present on disk.
This SCSS path is unaffected by `build-web.mjs` (which only emits TS/JS `dist/`),
so the styles depend on the submodule's *source tree* being checked out, while
the components depend on its *built `dist/`*.

---

## 5. Angular builders in play

From `angular.json`, the workspace has two projects:

| Project | type | builder(s) | tsConfig |
| --- | --- | --- | --- |
| `universal-material-angular` | `library` | `@angular/build:ng-packagr` (build, prod/dev configs); `@angular/build:karma` (test) | `src/tsconfig.lib*.json`, `src/tsconfig.spec.json` |
| `demo` | `application` | `@angular/build:application` (build); `@angular/build:dev-server` (serve); `@angular/build:karma` (test); `@angular/build:extract-i18n` | `demo/tsconfig.app.json`, `demo/tsconfig.spec.json` |

Relevant build options for consuming the web lib:
- `inlineStyleLanguage: "scss"` on both `demo:build` and the test/karma targets.
- The demo `build` registers a text **loader** for `.html` and `.scss`
  (`"loader": { ".html": "text", ".scss": "text" }`) so docs examples can be
  imported as raw strings (mirrors the web repo's `raw-loader` docs convention).
- All builders run **after** the `pre*` → `build:web` hooks (§2), because those
  hooks fire on the npm scripts (`start`, `build`, `build:demo`, `test`) that
  invoke `ng`. (`npm run watch` → `ng build --watch` is the one entry **without**
  a `build:web` pre-hook.)

The package scripts that drive these builders:

```jsonc
// package.json scripts
"start":      "ng serve demo --port 4280",          // prestart -> build:web
"build":      "ng build --project universal-material-angular", // prebuild -> build:web
"build:demo": "ng build --project demo",            // prebuild:demo -> build:web
"watch":      "ng build --watch --configuration development",
"test":       "ng test universal-material-angular"  // pretest -> build:web
```

---

## 6. Runtime-dependency duplication

The web library's **runtime dependencies are re-declared by hand** in the Angular
workspace `package.json`. Because the submodule is built with its own nested
`node_modules`, and the Angular app/demo also need those same packages at runtime
(lit elements, contexts, swiper, etc.), the Angular `package.json` lists a copy of
every web runtime dep.

Web library runtime deps
(`D:/Projects/universal-material-web/package.json` → `dependencies`):

```jsonc
"dependencies": {
  "@bart-krakowski/get-week-info-polyfill": "^1.0.8",
  "@lit-labs/virtualizer": "^2.1.1",
  "@lit/context": "^1.1.5",
  "@material/material-color-utilities": "^0.3.0",
  "dompurify": "^3.4.5",
  "lit": "^3.2.1",
  "swiper": "^12.1.4"
}
```

Every one of these is **duplicated** in the Angular `package.json`
`dependencies` (same names, matching ranges):

| package | web `dependencies` | Angular `dependencies` | duplicated? |
| --- | --- | --- | --- |
| `@bart-krakowski/get-week-info-polyfill` | `^1.0.8` | `^1.0.8` | ✅ |
| `@lit-labs/virtualizer` | `^2.1.1` | `^2.1.1` | ✅ |
| `@lit/context` | `^1.1.5` | `^1.1.5` | ✅ |
| `@material/material-color-utilities` | `^0.3.0` | `^0.3.0` | ✅ |
| `dompurify` | `^3.4.5` | `^3.4.5` | ✅ |
| `lit` | `^3.2.1` | `^3.2.1` | ✅ |
| `swiper` | `^12.1.4` | `^12.1.4` | ✅ |

The Angular `package.json` adds its own non-web runtime deps on top (`@angular/*`,
`@universal-material/core`, `highlight.js`, `ngx-highlight-js`, `rxjs`,
`@stackblitz/sdk`, `animated-scroll-to`, `tslib`, …), but the seven rows above
exist **only** because the web library needs them — they are mirrored manually so
the demo/app resolves them from the root `node_modules` while the submodule build
resolves its own copies from its nested `node_modules`.

This is the duplication the monorepo removes: today a web-side dependency bump
(e.g. `lit ^3.2.1 → ^3.3.0`) must be hand-mirrored into the Angular
`package.json` or the two trees silently diverge — the submodule could build
against one `lit` while the running app loads another. (Note: `tslib` is shared
machinery but is the web lib's *devDependency*, not a runtime dep, so it is not
counted among the seven duplicated runtime deps above.)

---

## 7. Why this wiring exists / the failure modes it papers over

- **Skip-if-built staleness** — `build-web.mjs` short-circuits when
  `dist/index.js` exists, so iterating on the web library from inside the Angular
  repo needs `FORCE_WEB_BUILD=1` or a manual `dist/` wipe; otherwise the Angular
  build silently uses a stale web build.
- **Nested install + `--legacy-peer-deps` + `--ignore-scripts`** — the submodule
  carries a second full dependency tree, installed with peer-dep and lifecycle
  scripts disabled, purely to satisfy gulp+tsc. This is slow on first run and
  skips the web lib's own postinstall.
- **Non-fatal `tsc`** — web-side `tsc` errors are swallowed (treated as benign
  nested-lit portability warnings); only a missing `dist/index.js` is fatal, so
  real type regressions in the web lib can pass unnoticed through the Angular
  build.
- **Two-mechanism dependency** — develop/build resolution (submodule + path map +
  duplicated deps) and publish-time resolution (peer `^3.9.0`) describe the same
  dependency two different ways, which can drift.

---

## What the monorepo replaces

The migration collapses every coupling above into a single workspace package
graph:

1. **Submodule + gitlink pin → workspace package.**
   Delete the `.gitmodules` entry and the `universal-material-web` submodule
   gitlink (currently pinned at `e804c22…`). The web library becomes a first-class
   workspace package living in the monorepo, versioned in lockstep — no more
   manual two-step submodule re-pin, no `git submodule update --init`, no
   independent version drift between the Angular and web repos.

2. **`scripts/build-web.mjs` build-before-serve → workspace task graph.**
   Remove `scripts/build-web.mjs` and the `prestart` / `prebuild` /
   `prebuild:demo` / `pretest` hooks in `package.json`. The monorepo build tool
   (workspace task runner / project references) builds the web package as an
   upstream dependency on demand — no `FORCE_WEB_BUILD` flag, no skip-if-built
   staleness, no swallowed `tsc` errors, no nested `node_modules` installed with
   `--legacy-peer-deps --ignore-scripts`.

3. **tsconfig `paths` hack → real `workspace:*` dependency.**
   Drop the `"@universal-material/web": ["universal-material-web/dist/index"]`
   (and `/*`) path map from `tsconfig.json`. The Angular package declares a
   normal `"@universal-material/web": "workspace:*"` dependency and resolves it
   through the package manager like any other package. The `src/package.json`
   peerDependency (`^3.9.0`) and `ng-package.json`
   `allowedNonPeerDependencies` entry stay as the *published* contract, now
   backed by a real installed package during development instead of a path
   alias. The `angular.json` SCSS entry
   `universal-material-web/scss/universal-material.scss` likewise resolves from
   the workspace package (e.g. `@universal-material/web/scss/universal-material.scss`)
   instead of the submodule working tree.

4. **Hand-mirrored runtime deps → single deduped declaration.**
   Remove the seven web runtime deps duplicated in the Angular `package.json`
   (`@bart-krakowski/get-week-info-polyfill`, `@lit-labs/virtualizer`,
   `@lit/context`, `@material/material-color-utilities`, `dompurify`, `lit`,
   `swiper`). They are declared once, in the web package, and hoisted by the
   workspace so the app and the web package share a single resolved copy of
   `lit` et al. A web-side dependency bump propagates automatically — no manual
   mirror, no two-`lit` divergence.
