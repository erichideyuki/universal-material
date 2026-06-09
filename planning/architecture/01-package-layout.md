# 01 — Package layout

Concrete directory tree, every `package.json` identity, per-wrapper peer dependencies,
the tsconfig graph, where the docs app fits, and how shared bridging code (if any) is
packaged. Decisions are set in [`00-decision.md`](./00-decision.md); this file is the
buildable spec.

---

## 1. Directory tree (target state)

```
universal-material-web/                       # repo root == @universal-material/web package
│
├── package.json                              # ← web manifest + workspace coordinator (§3.1)
├── package-lock.json                         # single root lockfile for the whole workspace
├── tsconfig.json                             # web tsconfig (UNCHANGED) — extends tsconfig.base.json
├── tsconfig.base.json                        # ← NEW shared base (§4)
├── tsconfig.test.json                        # UNCHANGED (web tests)
│
├── gulpfile.js                               # UNCHANGED
├── gulp-tasks/                               # UNCHANGED (sass-to-ts, sass, docs, docs-api)
├── custom-elements-manifest.config.js        # UNCHANGED (CEM)
├── eslint.config.mjs / prettier.config.mjs   # UNCHANGED (root lint/format, also linted by packages)
├── web-test-runner.config.js                 # UNCHANGED (web tests via wtr)
│
├── src/                                       # web library source — UNCHANGED
│   ├── <component>/<component>.ts
│   ├── <component>/<component>.styles.scss
│   ├── <component>/<component>.styles.ts      # gulp-generated, gitignored
│   ├── shared/                                # FieldBase, SelectionControl, TextFieldBase, …
│   └── index.ts                               # side-effect registration barrel + re-exports
├── scss/                                      # global M3 tokens (universal-material.scss) — UNCHANGED
├── skills/                                    # 28 SKILL.md folders — UNCHANGED
├── .claude-plugin/plugin.json                 # version-locked to package.json — UNCHANGED
│
├── dist/                                      # web publish root (gitignored) — UNCHANGED
│   ├── index.js / index.d.ts                  # main/module/types
│   ├── bundle.min.js                          # standalone esbuild bundle (not the entry)
│   ├── <mirrored src tree>.js/.d.ts           # flat subpath imports, no exports map
│   ├── scss/                                  # copied scss sources
│   ├── css/                                   # compiled global css
│   ├── custom-elements.json
│   ├── skills/ + .claude-plugin/              # copied at publish
│   └── package.json                           # copied, postinstall+publish stripped
│
├── change-compiler-to-add-custom-elements.js  # dev-only postinstall patch — UNCHANGED
├── add-custom-elements-schemas.cjs            # UNCHANGED (used by the patch)
├── remove-scripts-from-package.js             # UNCHANGED (strips postinstall+publish in dist)
│
├── docs/                                      # web docs app (Angular 20, :4200) — UNCHANGED
│   ├── angular.json                           # styles[] → ../scss/universal-material.scss
│   ├── tsconfig.app.json                      # path: @universal-material/web → ../dist/index
│   └── src/app/…                              # docs-shell, docs-example, docs-apis-table, pages
│
├── .changeset/
│   └── config.json                            # ← NEW (§6)
│
├── .github/workflows/
│   ├── ci.yml                                 # ← NEW: build:all + test:all + lint:all + changeset status
│   └── release.yml                            # ← NEW: changeset version → publish
│
└── packages/
    │
    ├── angular/                               # @universal-material/angular  (subtree of feature/m3)
    │   ├── package.json                       # §3.2
    │   ├── ng-package.json                    # dest: ./dist, entryFile src/index.ts
    │   ├── tsconfig.json                      # extends ../../tsconfig.base.json
    │   ├── tsconfig.lib.json                  # ng-packagr lib config; NO @universal-material/web path hack
    │   ├── tsconfig.spec.json                 # karma/jasmine
    │   ├── README.md
    │   ├── dist/                              # ng-packagr output (publish root), gitignored
    │   └── src/
    │       ├── value-accessors/               # 8 CVAs (default, check, radio, select, chip-field,
    │       │                                  #   typeahead, slider, datepicker)
    │       ├── tab-bar/                       # TabBarDirective (two-way activeTabIndex)
    │       ├── snackbar/ dialog/              # SnackbarService, ConfirmDialogService (thin web wrappers)
    │       └── index.ts                       # UniversalMaterialModule + FormComponents + re-exports
    │
    ├── react/                                 # @universal-material/react  (NEW, phase 2)
    │   ├── package.json                       # §3.3
    │   ├── tsconfig.json                      # extends ../../tsconfig.base.json (+ jsx)
    │   ├── tsup.config.ts                     # esm+cjs+dts, external: react/react-dom/web
    │   ├── README.md                          # controlled/uncontrolled, react-hook-form, Next SSR
    │   ├── dist/                              # tsup output (publish root), gitignored
    │   └── src/
    │       ├── index.ts                       # re-exports all wrappers
    │       └── components/*.ts                # createComponent wrappers (generated from CEM)
    │
    ├── vue/                                   # @universal-material/vue  (OPTIONAL, types-only)
    │   ├── package.json                       # §3.4
    │   ├── README.md                          # isCustomElement, v-model rules
    │   └── src/vue-shims.d.ts                 # GlobalComponents augmentation for u-* tags
    │
    ├── svelte/                                # @universal-material/svelte  (OPTIONAL, types-only)
    │   ├── package.json                       # §3.4
    │   ├── README.md                          # eager registration, bind:value recipe
    │   └── src/svelte.d.ts                    # $$Props / ambient types
    │
    └── solid/                                 # @universal-material/solid  (OPTIONAL, stretch)
        ├── package.json                       # §3.4
        ├── README.md                          # prop:/attr:/on: patterns
        └── src/jsx.d.ts                       # JSX.IntrinsicElements augmentation (optional)
```

`vue/`, `svelte/`, `solid/` are **optional types-only packages.** Per the research
(`planning/research/{vue,svelte,solid}.md`) these frameworks consume the `u-*` elements
natively; the *primary* deliverable for them is a **docs page in the web docs app**, with
a published `.d.ts` package only if there is demand. They are drawn here so the layout is
forward-compatible, not because they are committed phase-1 work.

---

## 2. Where the docs app fits

The web docs app stays at `docs/` (it is part of the web package's repo, not a workspace
member — it is private and consumes the workspace).

- It resolves the library through `docs/tsconfig.app.json`'s path
  `@universal-material/web` → `../dist/index` (UNCHANGED), so it always renders the
  freshly-`tsc`-compiled output.
- `docs/angular.json` `styles[]` pulls `../scss/universal-material.scss` (UNCHANGED).
- **Framework-usage pages** (React/Vue/Svelte/Solid quick-starts) are added as new pages
  under `docs/src/app/components/` or a new `docs/src/app/frameworks/` section. This keeps
  one canonical, pixel-perfect gallery and avoids per-framework demo apps.
- The Angular **demo** app currently in the Angular repo is either folded into
  `packages/angular` (kept for Angular-specific examples + StackBlitz) or retired in favor
  of a docs page — **open decision (00-decision §11.4).**

No second Angular app is introduced for phase 1 beyond what already exists.

---

## 3. `package.json` identities

### 3.1 Root — `@universal-material/web` (web manifest + coordinator)

Keep the **entire existing manifest** (name, version, type:module, main/module/types/sass,
all `scripts`, `dependencies`, `devDependencies`, postinstall, customElements). **Add**:

```jsonc
{
  "name": "@universal-material/web",
  "version": "3.9.0",                 // → 3.10.0 on next publish (00-decision §8)
  "type": "module",
  "workspaces": ["packages/*"],       // ← NEW

  // ← NEW root orchestration (do not disturb the existing web scripts):
  "scripts": {
    // … all existing web scripts unchanged (build, build:watch, docs, test, lint, …) …
    "build:all":  "npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present",
    "test:all":   "npm test && npm test -ws --if-present",
    "lint:all":   "npm run lint && npm run lint -ws --if-present",
    "changeset":  "changeset",
    "version":    "changeset version",
    "release":    "changeset publish"
  },

  "devDependencies": {
    // … existing …
    "@changesets/cli": "^2.27.0"      // ← NEW
  }
}
```

Notes:
- `version` script name collides conceptually with npm's built-in; that is fine — it is an
  explicit run-script. (If preferred, name it `version:packages` to avoid confusion with
  `npm version`.)
- `build:all` runs **web first** (its output is what Angular/React consume), then the
  wrappers. `--if-present` lets it no-op for packages not yet created.
- The web package's own `build`/`test`/`lint`/`publish` remain the source of truth for
  the web library; `*:all` are thin fan-outs.

### 3.2 `packages/angular/package.json` — `@universal-material/angular`

```jsonc
{
  "name": "@universal-material/angular",
  "version": "3.6.2",                  // → 3.7.0 on first monorepo publish (open decision; see 00-decision §11.5)
  "license": "MIT",
  "sideEffects": false,
  "peerDependencies": {
    "@universal-material/web": "^3.10.0",
    "@angular/common": "^20",
    "@angular/core": "^20",
    "@angular/forms": "^20"
  },
  "dependencies": {
    "@universal-material/web": "*",   // workspace-linked; rewritten to published range on publish
    "animated-scroll-to": "^2.3.0",   // the only genuine extra runtime dep
    "tslib": "^2.6.2"
  },
  "scripts": {
    "build": "ng-packagr -p ng-package.json",
    "build:watch": "ng-packagr -p ng-package.json --watch",
    "test": "ng test",
    "lint": "eslint src/**/*.ts"
  }
  // REMOVED vs old src/package.json: nothing material; the old one already declared
  //   @universal-material/web as a peer. The 7 duplicated web runtime deps that lived in
  //   the Angular *root* package.json are NOT carried here — they hoist from the web pkg.
}
```

`ng-package.json` keeps `allowedNonPeerDependencies: ["@universal-material/web",
"animated-scroll-to"]` so ng-packagr accepts the workspace dep.

### 3.3 `packages/react/package.json` — `@universal-material/react` (NEW)

```jsonc
{
  "name": "@universal-material/react",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" }
  },
  "sideEffects": false,
  "peerDependencies": {
    "@universal-material/web": "^3.10.0",
    "react": "^17 || ^18 || ^19",
    "react-dom": "^17 || ^18 || ^19"
  },
  "dependencies": {
    "@lit/react": "^1.0.0"            // the wrapper engine; small, ships with the package
  },
  "devDependencies": {
    "tsup": "^8", "typescript": "~5.8.2",
    "react": "^19", "react-dom": "^19",
    "@universal-material/web": "*"    // workspace dep for build-time types
  },
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch",
    "test": "vitest run",
    "lint": "eslint src/**/*.ts"
  }
}
```

Rationale for peers: React + react-dom are the consumer's framework; web is the underlying
elements. `@lit/react` is a **dependency** (not a peer) because it is the wrapper's own
engine and is tiny.

### 3.4 Optional types-only packages — `vue` / `svelte` / `solid`

```jsonc
// packages/vue/package.json  (svelte/solid analogous)
{
  "name": "@universal-material/vue",
  "version": "0.1.0",
  "types": "./src/vue-shims.d.ts",
  "exports": { ".": { "types": "./src/vue-shims.d.ts" } },
  "peerDependencies": {
    "@universal-material/web": "^3.10.0",
    "vue": "^3"
  }
  // no "main"/"module": there is no runtime JS. Ships .d.ts + README only.
  // no build step (or a trivial "tsc --emitDeclarationOnly" if generated from CEM).
}
```

Svelte peer: `"svelte": "^4 || ^5"`. Solid peer: `"solid-js": "^1"` (Solid may ship a
README-only package with no `types`).

---

## 4. tsconfig graph

Extract a **shared base** so every package inherits the same strictness without coupling
to web-specific paths.

```
tsconfig.base.json            # NEW — shared compilerOptions only (no include/rootDir/outDir)
   strict, noImplicitOverride, esModuleInterop, isolatedModules,
   forceConsistentCasingInFileNames, skipLibCheck, importHelpers,
   moduleResolution: "node", target/module: ES2022
   (NOTE: experimentalDecorators + useDefineForClassFields:false stay PER-PACKAGE,
    because React/tsup wrappers want standard decorators / class fields; only web and
    Angular need the Lit/Angular decorator mode.)
        ▲
        │ extends
        ├── tsconfig.json (web)            # adds: lib es2021+DOM, rootDir src, outDir dist,
        │                                  #   experimentalDecorators, useDefineForClassFields:false,
        │                                  #   ts-lit-plugin, angularCompilerOptions (UNCHANGED)
        ├── packages/angular/tsconfig.json # adds: Angular options, experimentalDecorators
        │      └── tsconfig.lib.json        # ng-packagr lib; NO @universal-material/web path alias
        ├── packages/react/tsconfig.json    # adds: jsx: react-jsx, lib DOM, standard decorators
        └── packages/{vue,svelte,solid}/    # minimal; declaration-only if they emit .d.ts
```

Key points:
- The **web `tsconfig.json` keeps its current shape** (00-decision §4); we only lift the
  framework-neutral options into `tsconfig.base.json` and have web `extends` it. This is a
  near-zero-risk refactor (override-compatible).
- **No project references / `paths` aliases for cross-package resolution.** npm workspace
  symlinks make `@universal-material/web` resolve as a real installed package from every
  consumer. This is the central simplification over the old path-hack.
- The web docs app's `docs/tsconfig.app.json` keeps its `@universal-material/web` →
  `../dist/index` path (it deliberately consumes the *built* `dist/`, not source).

---

## 5. Shared bridging code

There is **no shared runtime bridge package**, and we should not invent one. The research
shows the FACE design already standardizes the value/event contract, so each wrapper's
glue is framework-specific and small:

- **Angular**: 8 CVAs + `TabBarDirective` (already exists; folded in).
- **React**: `@lit/react` `createComponent` calls, ideally **generated** from
  `custom-elements.json` so the wrapper list stays in sync with the elements. The
  generator script lives in `packages/react/` (e.g. `scripts/gen.ts`), reads the web
  package's `custom-elements.json`, and emits `src/components/*.ts`.
- **Vue/Svelte/Solid**: ambient `.d.ts` only; nothing runtime to share.

If a future need for a shared, framework-neutral helper appears (e.g. a common
"value/event map" derived from CEM), introduce a **private, unpublished**
`packages/internal-codegen/` consumed only at build time — do **not** add a published
runtime dependency between wrappers. (Deferred; not phase 1.)

---

## 6. `.changeset/config.json`

```jsonc
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  // docs app is not a workspace member, so nothing to ignore there;
  // if vue/svelte/solid are not yet real packages, they simply have no changesets.
  "ignore": []
}
```

`updateInternalDependencies: "patch"` ensures that when web bumps, dependents that pin it
get a patch bump so the published peer/dep range stays coherent.

---

## 7. What is explicitly NOT changing

- The web build pipeline, its scripts, its `dist/` publish root, `copy` step, postinstall
  patch, `remove-scripts-from-package.js`, `skills/`, `.claude-plugin/`.
- The web docs app (`docs/`) and its :4200 dev loop.
- The `u-` tag prefix, PascalCase class convention, `declare global` blocks,
  `src/index.ts` registration order.
- The web library's published npm contract (consumers see the same package).
```
