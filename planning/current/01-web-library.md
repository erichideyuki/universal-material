# 01 — Web Components Library: Current State

> Snapshot of `@universal-material/web` as it exists today (pre-monorepo), captured for the monorepo-migration harness. Everything below is read directly from the repo at `D:/Projects/universal-material-web`. **No source was modified to produce this.**

---

## 1. Package identity

Source of truth: `D:/Projects/universal-material-web/package.json`.

| Field | Value |
| --- | --- |
| `name` | `@universal-material/web` |
| `version` | `3.9.0` |
| `description` | `Material web components` |
| `type` | `module` (pure ESM — no CJS output) |
| `main` | `index.js` |
| `module` | `index.js` |
| `types` | `index.d.ts` |
| `sass` | `scss/universal-material.scss` |
| `customElements` | `custom-elements.json` (CEM manifest pointer) |
| `license` | `MIT` |
| `homepage` | `https://universal-material.github.io` |
| `repository` | `git+https://github.com/universal-material/universal-material-web.git` |

Key consequence: **`main`, `module`, and `types` are all relative to the publish root, which is `dist/`, not the repo root.** The package is published from inside `dist/` (see §6), so `index.js` / `index.d.ts` resolve to `dist/index.js` / `dist/index.d.ts`. There is **no `exports` map** — subpath imports like `@universal-material/web/button/button.js` work purely by Node's classic file resolution against the flat `dist/` tree (see README at `D:/Projects/universal-material-web/README.md`).

Versioning rule (from `CLAUDE.md`): major tracks the Material Design spec generation (M3 → `3.x`); internal breaking changes bump the **minor**, not the major.

---

## 2. Full build pipeline

The release build is the `build` script in `package.json` (line 21):

```
run-s clean script:sass-to-ts build:esm build:bundle sass analyze copy && node remove-scripts-from-package.js
```

`run-s` (npm-run-all) runs these **in series**. Exact commands and what each does:

| # | npm script | Underlying command | Output |
| --- | --- | --- | --- |
| 1 | `clean` | `rimraf ./dist/ rimraf ./src/**/*.d.ts rimraf ./src/**/*.styles.ts` | Wipes `dist/` plus stray generated `.d.ts` / `.styles.ts` under `src/`. (Note: this single `rimraf` invocation is passed multiple glob args; the literal `rimraf` tokens in the middle are no-op path args.) |
| 2 | `script:sass-to-ts` | `gulp -f gulpfile.js scripts:sass-to-ts` | Compiles every `src/**/*.styles.scss` → `src/**/*.styles.ts`. See §3. |
| 3 | `build:esm` | `esbuild src/index.ts --bundle --format=esm --minify --define:process.env.NODE_ENV="production" --outfile=dist/bundle.min.js` | Single minified ESM bundle `dist/bundle.min.js`. **Standalone artifact — the docs site and normal consumers do NOT import it.** |
| 4 | `build:bundle` | `tsc` | Type-checks `src/` and emits per-file `.js` + `.d.ts` (+ `.js.map`, `.d.ts.map`) into `dist/`, preserving the directory tree. This is the real published code. (Script is misleadingly named "bundle" but is a plain `tsc` emit.) |
| 5 | `sass` | `gulp -f gulpfile.js sass` | Compiles the global stylesheet `scss/universal-material.scss` → `dist/css/universal-material.css` and `…min.css` (expanded + compressed, with sourcemaps). See §5. |
| 6 | `analyze` | `cem analyze --litelement --globs "src/**/*.ts" && node fix-html-custom-data-union-types.js` | Generates `custom-elements.json` (CEM manifest) from the Lit sources, then post-processes `vscode.html-custom-data.json` to expand union-type attribute values (`fix-html-custom-data-union-types.js`). |
| 7 | `copy` | see below | Copies static assets + the published `package.json` into `dist/`. |
| 8 | (chained, not run-s) | `node remove-scripts-from-package.js` | Strips `postinstall` and `publish` scripts from the **copied** `dist/package.json`. See §6. |

### `copy` (step 7), verbatim from current `package.json` line 30:

```
copyfiles package.json README.md custom-elements.json vscode.html-custom-data.json dist/
  && copyfiles -u 1 scss/**/*.scss dist/scss
  && copyfiles ".claude-plugin/**/*" dist/
  && copyfiles "skills/**/*" dist/
```

So a fresh `dist/` ends up with: the built JS/d.ts tree, `bundle.min.js`, `css/`, `scss/` (raw SCSS sources, with the leading `scss/` segment stripped by `-u 1`), `package.json`, `README.md`, `custom-elements.json`, `vscode.html-custom-data.json`, **`.claude-plugin/`**, and **`skills/`**.

> **Stale-dist caveat for the harness:** the `dist/package.json` currently on disk is from an **older 3.8.0 build** and its embedded `copy` script does **not** include the `.claude-plugin`/`skills` copyfiles lines. The current root `package.json` (3.9.0) does. The on-disk `dist/` therefore does **not** contain `dist/.claude-plugin/` or `dist/skills/` right now — they only appear after a fresh `npm run build`. Trust the root `package.json`, not the checked-in `dist/`.

### Other relevant scripts

- `build:watch` → `gulp -f gulpfile.js scripts:watch` (sass-to-ts + tsc emit on file changes; used by `npm run docs`).
- `docs` → `run-p build:watch docs:serve` (library watcher in parallel with `cd docs && ng serve` on port 4200).
- `predocs` → `run-p analyze docs:apis script:sass-to-ts`.
- `docs:apis` → `gulp -f gulpfile.js docs:apis` (ts-morph reads JSDoc on `@property` decls, writes `docs/src/app/apis.ts`).
- `test` → `wtr --config web-test-runner.config.js` (Web Test Runner; co-located `*.test.ts` excluded from the `tsc` build via `tsconfig.json`).
- `publish` → `npm run lint:eslint && cd dist && npm publish` (publishes from `dist/`).

**Toolchain summary: gulp (sass→ts, sass, docs:apis) + tsc (emit) + esbuild (standalone bundle) + cem (manifest). There is NO Angular packaging tool (ng-packagr) anywhere in the library build.** The only Angular present is the `docs/` app (dev/test surface) and the `change-compiler-to-add-custom-elements.js` postinstall shim (§6).

`rollup.config.js` exists but is **not part of `npm run build`** — it's referenced only by the `checksize` script (`rollup -c`) for measuring gzipped size, reading `./dist/index.js` and emitting to `./dist/bundled`.

---

## 3. Source layout convention

Library source lives under `D:/Projects/universal-material-web/src/`. There are **37 component/area directories** (`app-bar`, `badge`, `button`, `button-field`, `calendar`, `card`, `checkbox`, `chip`, `chip-field`, `collapse`, `datepicker`, `dialog`, `elevation`, `expansion-panel`, `field`, `icon`, `list`, `menu`, `navigation`, `navigation-bar`, `navigation-rail`, `overflow-menu`, `progress`, `radio`, `ripple`, `scaffold`, `search`, `select`, `slider`, `snackbar`, `switch`, `tab-bar`, `text-area`, `text-field`, `theme`, `typeahead`, plus the non-component `shared/` base-class folder).

Per component, files are **co-located** (example: `src/button/`):

| File | Role | Hand-edited? |
| --- | --- | --- |
| `<component>.ts` | The `LitElement` class, `@customElement('u-…')` | Yes |
| `<component>.styles.scss` | SCSS style source | Yes |
| `<component>.styles.ts` | Generated `css\`…\`` template literal | **No — generated by gulp `scripts:sass-to-ts`** |
| `<component>.test.ts` | Co-located Web Test Runner spec | Yes; excluded from `tsc` build |
| `<component>.*-context.ts` | Lit context tokens (where used) | Yes |

The SCSS→TS transform (`gulp-tasks/scripts.js`) reads each `*.styles.scss`, runs dart-sass (`outputStyle: 'expanded'`), indents every line by two spaces, and wraps it as:

```ts
import { css } from 'lit';

export const styles = css `
  …compiled css…
`;
```

(Confirmed by reading `src/button/button-set.styles.ts`.) The component imports it via `import { styles } from './<component>.styles.js'` and assigns `static styles`.

**Generated files are gitignored** (`.gitignore` lines 51–53): `/src/**/*.d.ts`, `/src/**/*.styles.ts`, `/src/scss/**/*.ts`. They exist on disk now because a build was run, but are not version-controlled. `custom-elements.json`, `vscode.css-custom-data.json`, and `vscode.html-custom-data.json` are **also gitignored** (lines 54–56) despite being committed-looking artifacts.

`src/index.ts` is the barrel: it first runs **side-effect imports** that register every custom element (order matters — providers like `scaffold` register before consumers; see `CLAUDE.md` gotcha #2), then `export *` re-exports the public classes/types. `src/config.ts` holds runtime defaults (dialog button labels/variants, `navigationDrawer.useSwiperJs`).

---

## 4. How components register

- **Tag prefix `u-`**: every element is `@customElement('u-<name>')` (e.g. `@customElement('u-button')` in `src/button/button.ts`).
- **Class name**: unprefixed PascalCase (`<u-button>` → `class Button`). Internal abstract bases (`ButtonWrapper`, `FieldBase`, `ToggleButton`) follow the same naming.
- Decorators are Lit's: `@customElement`, `@property`, `@state`, `@query`, `@queryAssignedElements`. `tsconfig.json` sets `experimentalDecorators: true` and `useDefineForClassFields: false` (classic decorator semantics).
- Every component file ends with a `declare global { interface HTMLElementTagNameMap { 'u-…': ClassName } }` block (required by convention; see `CLAUDE.md`).
- There are **64 `@customElement` declarations** across non-test source files (some directories define several elements, e.g. `button/` defines `u-button`, `u-button-set`, `u-fab`, `u-fab-menu`, `u-fab-menu-item`, `u-icon-button`, `u-toggle-button`).
- Interactive button-like components extend the shared `ButtonWrapper` (`src/shared/button-wrapper.ts`) to inherit ripple, elevation, and link/button rendering, overriding `_renderContent()`. The form-associated (FACE) submitter plumbing (`static formAssociated = true`, `attachInternals()`, `requestSubmit`) lives one level down on `ButtonBase` (`src/button/button-base.ts`), which itself `extends ButtonWrapper`.

---

## 5. SCSS / global styles

Two distinct SCSS surfaces:

1. **Per-component SCSS** (`src/**/*.styles.scss`) → compiled to TS template literals, shipped *inside* the JS (shadow-DOM scoped). Never emitted as standalone CSS.
2. **Global stylesheet** entry `scss/universal-material.scss` → compiled by `gulp sass` to `dist/css/universal-material.css` (+ `.min.css`). It `@use`s `variables`, `css-vars`, `colors`, `layout`, `utilities`, `table/table`, `typo/font`, `typo/typo`, `reboot`, `global`, and conditionally includes the reboot + global styles when `variables.$include-reboot` is true. The `scss/` tree (tokens, mixins, functions, colors, typo, utilities) is also copied **raw** into `dist/scss/` so downstream consumers can `@use` it (this is what the `sass` package field points at).

---

## 6. dist/ shape and publishing

The published artifact **is** the `dist/` directory (`publish` script does `cd dist && npm publish`). Shape after a fresh build:

```
dist/
  index.js / index.d.ts (+ .map)        ← package main/module/types
  config.js / config.d.ts
  bundle.min.js                          ← standalone esbuild ESM bundle (not used by main entry)
  <component>/                           ← one folder per src/ component, mirroring the tree
    <component>.js / .d.ts (+ maps)
    <component>.styles.js / .d.ts
    <component>.test.js                  ← tests get emitted too (cosmetic; harmless)
  css/universal-material.css (+ .min.css, sourcemaps)
  scss/…                                 ← raw SCSS sources (copied)
  custom-elements.json                   ← CEM manifest
  vscode.html-custom-data.json
  package.json                           ← copied, then scripts stripped
  README.md
  .claude-plugin/plugin.json             ← (only after current 3.9.0 build; see §2 caveat)
  skills/<skill>/SKILL.md
```

The flat per-component folder tree (no `exports` map) is what makes both `import '@universal-material/web'` (barrel) and `import '@universal-material/web/button/button.js'` (subpath) resolve.

### `remove-scripts-from-package.js` (post-`copy` step)

`D:/Projects/universal-material-web/remove-scripts-from-package.js` reads `./dist/package.json` and regex-strips the `postinstall` and `publish` entries:

```js
content.replaceAll(/,\n\s+"(postinstall|publish)":\s".+?"/g, '')
```

**Why it matters:** the root `package.json` has a `postinstall` hook (next section). If that hook shipped to consumers, every `npm install` of `@universal-material/web` would try to patch the *consumer's* Angular compiler. Stripping `postinstall` (and the publish helper) from the published `package.json` prevents that. So the consumed package has **no install hooks**.

### `postinstall` → `change-compiler-to-add-custom-elements.js`

Root `package.json` line 50: `"postinstall": "node ./change-compiler-to-add-custom-elements.js"`. This is a **dev-repo-only** hook (stripped before publish). It patches `node_modules/@angular/compiler/fesm2022/compiler.mjs`, appending:

```js
import { mapSchemas } from '../../../../add-custom-elements-schemas.cjs';
mapSchemas(SCHEMA);
```

(idempotent — bails if `mapSchemas(SCHEMA);` is already present). `add-custom-elements-schemas.cjs` reads the local `custom-elements.json`, derives `name^[HTMLElement]|prop,prop,…` schema entries for each custom element, and pushes them into Angular's compiler `SCHEMA` array. **Purpose:** make Angular's template type-checker (used by the `docs/` app) aware of the `u-*` custom elements and their props, so the docs templates don't error on unknown elements/attributes. It is a docs-development convenience and is **not** part of the shipped library.

---

## 7. Skills + `.claude-plugin` packaging

- `.claude-plugin/plugin.json` declares the Claude Code plugin (`name: universal-material-web`, `version: 3.9.0`, MIT). It exposes the sibling `skills/` directory.
- `skills/` has **28 skill folders**, each containing a single `SKILL.md` (frontmatter `description:` one-liner + body with code snippets pulled from docs examples + caveats). Folders: `badge, buttons, card, chips, collapse, datepicker, dialog, drawer, expansion-panel, fab, list, menu, navigation-bar, navigation-rail, overview, progress, scaffold, search, select, selection-controls, setup, slider, snackbar, tab-bar, text-field, theming, top-app-bar, typeahead` (plus the two already-listed). One skill per component family.
- Both directories are copied into `dist/` by the `copy` script (current 3.9.0 build) and thus **ship inside the npm package**. Consumers enable them with `/plugin install ./node_modules/@universal-material/web` (per README); skills surface as `universal-material-web:<skill-name>`.
- `CLAUDE.md` mandates keeping `skills/<name>/SKILL.md` in sync with any user-facing API change — they are a second consumer-facing surface alongside the docs site.

---

## 8. Runtime dependencies

From `package.json` `dependencies` (these ship with the package and must resolve at the consumer):

| Dep | Range | Used for |
| --- | --- | --- |
| `lit` | `^3.2.1` | Core (LitElement, decorators, directives) |
| `@lit/context` | `^1.1.5` | Context provider/consumer (scaffold, fab-menu) |
| `@lit-labs/virtualizer` | `^2.1.1` | Virtualized lists (typeahead/list) |
| `@material/material-color-utilities` | `^0.3.0` | M3 dynamic color (theme-builder) |
| `@bart-krakowski/get-week-info-polyfill` | `^1.0.8` | Locale week-info polyfill (imported first in `index.ts`, datepicker/calendar) |
| `dompurify` | `^3.4.5` | HTML sanitization (typeahead highlight) |
| `swiper` | `^12.1.4` | Optional drawer gesture (`config.navigationDrawer.useSwiperJs`) |

`devDependencies` are heavy: the entire **Angular 20** stack (docs app + the compiler-patch shim), `gulp` + plugins, `esbuild` (run via the platform exe, not `npx`), `typescript ~5.8.2`, `sass`, CEM analyzer, the Web-Test-Runner/Playwright/open-wc testing stack, `ts-morph` (docs:apis), `rollup` (+terser/summary, checksize only), and eslint/prettier tooling.

---

## 9. Why this matters for the monorepo

1. **The build is gulp + tsc + esbuild — NOT ng-packagr.** Do not assume an Angular library build. The library is framework-agnostic Lit web components. Angular appears only as (a) the `docs/` consumer app and (b) the dev-only compiler-patch shim. A monorepo build target must reproduce four ordered steps: (1) gulp `scripts:sass-to-ts` (SCSS→TS template literals — *prerequisite for tsc*), (2) `tsc` emit to `dist/`, (3) esbuild standalone bundle, (4) gulp `sass` + cem `analyze` + asset copy. Any monorepo tooling (Nx/Turbo/etc.) must respect that **the SCSS-to-TS gulp step runs before tsc**, or the `*.styles.ts` imports won't exist.

2. **The `postinstall` hook is a landmine — handle it deliberately.** Root `package.json` runs `node ./change-compiler-to-add-custom-elements.js` on install, which **mutates `node_modules/@angular/compiler`**. In a monorepo with hoisted/shared `node_modules`, a root or workspace install will trigger this and patch a *shared* Angular compiler — affecting every workspace, not just docs. It is also path-fragile (hardcoded `../../../../add-custom-elements-schemas.cjs` relative to the Angular package, and a fixed `fesm2022/compiler.mjs` path). The publish flow deliberately strips `postinstall` (via `remove-scripts-from-package.js`) so consumers never run it — the monorepo must preserve that strip-before-publish guarantee and decide where/whether the docs-only patch runs.

3. **Publish root is `dist/`, with no `exports` map.** `main`/`module`/`types`/`sass` are all relative to `dist/`, and subpath imports rely on the flat mirrored file tree. A monorepo packaging step must publish from the built `dist/` (not the package root) and keep the per-component folder layout, or every existing `@universal-material/web/<component>/<component>.js` import breaks.

4. **Generated artifacts are gitignored but build-critical.** `*.styles.ts`, `*.d.ts`, `custom-elements.json`, and the vscode custom-data JSON are all gitignored. A clean monorepo checkout has none of them — every CI/build path must regenerate them. The current on-disk `dist/` is a **stale 3.8.0 build** and must not be treated as ground truth.

5. **Skills + plugin are shipped product, not repo cruft.** `skills/` and `.claude-plugin/` are copied into the published package and versioned in lockstep (`plugin.json` version must equal `package.json` version — both `3.9.0`). The monorepo must keep them adjacent to the package and copy them at build time.
