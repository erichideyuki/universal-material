# Task 07 — React wrapper package (`@universal-material/react`) — the only runtime wrapper

> **Status:** ready to implement.
> **Architecture authority:** `planning/architecture/00-decision.md` §5, §11; `planning/architecture/01-package-layout.md` §1, §3.3, §4, §5; `planning/research/react.md` (the full how-to) and `planning/research/form-participation.md` §2–§5 (the value/event contract).
> **One-line scope:** Build `packages/react/` = `@universal-material/react@0.1.0`: a real **runtime** React wrapper package whose `@lit/react` `createComponent()` calls are **GENERATED from the web library's element manifest** (one wrapper per `u-*` element, with a typed events map), built with **tsup** to ESM+CJS+`.d.ts`, peer-depending on `react`, `react-dom`, and `@universal-material/web ^3.10.0`. This is the **only** new runtime framework wrapper (Vue/Svelte/Solid are docs + optional types-only — tasks 08/09/10).

---

## Scope (ONE unit only)

Deliver the React consumption package for `@universal-material/web`:

1. **(Load-bearing) A code generator** at `packages/react/scripts/gen.mjs` that reads the web
   library's element list and emits `packages/react/src/components/*.ts` — **one
   `createComponent(...)` wrapper per `u-*` element**, each with its typed `events` map. The
   generator is the deliverable, not 64 hand-written wrappers. **Do NOT hand-transcribe the 64
   tags** (this is the REVIEW P1-6 trap; the verified tag/class list is in this doc's Context).
2. **The package skeleton**: `packages/react/package.json` (`@universal-material/react@0.1.0`,
   exports esm/cjs/types, tsup build, `@lit/react` dependency, `react`/`react-dom`/web peers),
   `tsup.config.ts`, `tsconfig.json` (extends the shared base), `src/index.ts` barrel,
   `README.md`.
3. **The generated output committed** (`src/components/*.ts` + `src/index.ts`) so the package
   builds and publishes without running the generator at install time.
4. **Tests** (vitest + a DOM env) covering: the controlled `value`+`onInput`/`onChange` path,
   the uncontrolled (native `FormData`) path, and a `react-hook-form` `Controller` binding.
5. **A README** documenting controlled vs uncontrolled usage given FACE, react-hook-form
   `register` (uncontrolled) vs `Controller` (controlled), the checkbox/switch/radio
   `checked`+`onChange` divergence, and the Next.js/SSR `"use client"` caveat.

**This task does NOT:**
- Touch the web library `src/`, its build pipeline (`gulp`/`tsc`/`esbuild`), `dist/`,
  `skills/`, `.claude-plugin/`, or the postinstall patch. (The generator **reads** web's
  manifest; it never writes into web.)
- Touch `packages/angular`, `packages/vue`, `packages/svelte`, or `packages/solid`.
- Add a "Using with React" docs page (that is part of task `11-docs-integration.md`); this
  task ships the npm package + its README only.
- Set up Changesets, CI, or release wiring (tasks `13-versioning-and-release.md` /
  `14-ci-pipeline.md`; note 14 lists this task `07` as a dependency, not the reverse).
- Generate JSX intrinsic-element typings for bare `<u-*>` usage — the deliverable is the
  `createComponent` wrappers, not ambient JSX (React-19-bare usage is documented in the
  README as an alternative, not packaged).

---

## Preconditions & Dependencies

Declared by canonical task **filename** (see the task index in `planning/tasks/`):

- **Hard dependency — `02-monorepo-scaffold.md`:** adds `"workspaces": ["packages/*"]` to the
  root `package.json`, creates `tsconfig.base.json`, and `.changeset/config.json`. Without it,
  `packages/react` is not a workspace member and its own devDeps (`@lit/react`, `tsup`, `vitest`)
  do not install. **The `packages/` directory does not exist yet** (verified: `packages/` is
  absent at authoring time) — task 02 creates it.
- **Hard dependency — `03-relocate-web-package.md`:** confirms the root package stays
  `@universal-material/web` as both the web manifest and the workspace coordinator, and that its
  built `dist/` (with `index.d.ts` re-exporting every component class + `custom-elements.json`) is
  the build-time type source this package consumes. The web library is NOT moved to `packages/web`.
  **`@universal-material/web` is the workspace-ROOT package, which npm does NOT symlink into
  `node_modules`** (npm only symlinks `packages/*` members) — so this package resolves the bare
  `@universal-material/web` specifier via a **tsconfig path / tsup alias → the built `../../dist/index`**
  (the docs-app pattern: `docs/tsconfig.app.json` maps it to `../dist/index`), with **web built
  first**. The generator likewise reads `../../dist/custom-elements.json` directly by relative path.
- **No dependency** on Angular (`04`), Vue (`08`), Svelte (`09`), Solid (`10`), or docs (`11`).
  Nothing here references their code. Task `14-ci-pipeline.md` depends on **this** task (it adds
  `npm run build -w @universal-material/react` to `build:all`), not vice-versa.

If you run this task before `02` has merged, you can still author every file under
`packages/react/`, but `npm install` will not install this package's devDeps and the build
will fail to resolve `@universal-material/web` (which comes from the built root `dist/`, not a
node_modules symlink) — so **`02` must land first** and **web must be built first**. This task is
otherwise worktree-parallelizable with all sibling wrapper tasks (see the final section).

---

## Context (enough to execute COLD)

> A fresh agent with zero chat memory must be able to run this. Every path below is real and
> verified against the repo at authoring time (2026-06-08). The repo root is
> `D:/Projects/universal-material-web`.

### What `@universal-material/web` is, mechanically
- `@universal-material/web@3.9.0` (next publish `3.10.0` — `00-decision.md` §8) is a **pure-ESM**
  Material 3 Lit component library. Root manifest: `D:/Projects/universal-material-web/package.json`
  (`"type": "module"`, `"main"/"module": "index.js"`, `"types": "index.d.ts"`,
  `"customElements": "custom-elements.json"`).
- Components register as custom elements under the **`u-` tag prefix** via
  `@customElement('u-...')`, with an **unprefixed PascalCase public class** per CLAUDE.md
  (`u-text-field` → `class TextField`, `u-select` → `class Select`, `u-checkbox` → `class
  Checkbox`). The class barrel is `D:/Projects/universal-material-web/src/index.ts`: it does
  side-effect registration imports (e.g. `import './text-field/text-field.js'`) then
  `export *` re-exports every public class. **Importing `@universal-material/web` once registers
  every `<u-*>` element** — wrappers reference the element class, which also triggers registration.
- The **published** package's `dist/index.d.ts` exports every public component class. The React
  wrappers import those classes (`import { TextField } from '@universal-material/web'`) as
  `elementClass` and for prop typing.

### Why React is the ONE runtime wrapper (and Vue/Svelte/Solid are not)
- Every input-like `u-*` element is a **Form-Associated Custom Element (FACE)**: it sets
  `static formAssociated = true`, calls `attachInternals()`, and pushes its value via
  `ElementInternals.setFormValue(...)`. Verified per component in
  `planning/research/form-participation.md` §2.2. So native `<form>`/`FormData` submission and
  constraint validation are **free** in every framework.
- The remaining glue is **JSX typing + property-vs-attribute binding + `on*` event subscription**.
  Per `planning/research/react.md`: **React ≤18 writes unknown custom-element props as
  *attributes* and ignores `on*` handlers** — so you cannot pass a non-string `value` or
  subscribe to `input`/`change` declaratively without a wrapper. React 19 fixes this natively but
  lowercases event-prop names (no kebab-case). `@lit/react`'s `createComponent` closes both gaps
  on React **17/18/19**: it sets matching props as **properties** (via an `in`-operator check, so
  `value`/`checked` reach the IDL setters that call `setFormValue`) and wires an explicit
  `events` map via `addEventListener`. That is why React gets a real runtime wrapper while
  Vue/Svelte/Solid — which already bind DOM properties and listen to native events — only need
  docs + optional ambient types (`00-decision.md` §5; `01-package-layout.md` §1 note).

### `@lit/react` API (the wrapper engine — `01-package-layout.md` §3.3 makes it a *dependency*)
- Package: **`@lit/react`** (peer `@types/react: "17 || 18 || 19"`). Import:
  `import { createComponent, type EventName } from '@lit/react'`.
- `createComponent({ react, tagName, elementClass, events?, displayName? })`:
  - Sets React props that exist as element **properties** as properties (not attributes).
  - `events` maps a React prop name → DOM event name, e.g.
    `{ onInput: 'input' as EventName<InputEvent>, onChange: 'change' as EventName<Event> }`,
    wired via `addEventListener` in mount/update.
  - **Must be called once at module scope** (calling it in a render body remounts the element and
    loses caret/state — `react.md` Gotcha 4).
- Bespoke `CustomEvent`s carry data in `event.detail`: `u-typeahead` emits `selected`
  (`CustomEvent<…>`), `u-chip-field` emits `remove` (`CustomEvent<…>`). Type those with
  `EventName<CustomEvent<…>>`. For the **value** itself you read `event.target.value` /
  `event.target.checked` off the host element (FACE), not `detail`.

### The exact per-component value/event contract the wrappers + README must reflect
From `planning/research/form-participation.md` §2.2/§2.3 and `planning/research/react.md`
(verified against `src/`). For value read-back you listen on the **`u-*` element** for `input`
(live) and/or `change` (committed) and read the IDL property. `change` is `bubbles: true` but
**not `composed`** for selection controls and native text fields (native parity) — the host
re-dispatches it, so a listener **on the element** still fires (which `createComponent` does).

| Component(s) | tag(s) | Two-way prop | Live/commit events to map | Value read from | Notes |
| --- | --- | --- | --- | --- | --- |
| Text field / area / search | `u-text-field`, `u-text-area`, `u-search` | `value: string` | `onInput` (native, composed) + `onChange` | `e.target.value` | native `<input>` inside |
| Datepicker(s) | `u-datepicker`, `u-range-datepicker` | `value: string` | `onInput` (composed) + `onChange` | `e.target.value` | host re-dispatches |
| Select | `u-select` | `value: string` (+ `selectedIndex`) | `onInput` (composed) + `onChange` (not composed) | `e.target.value` | **no `value` attribute**, IDL prop only |
| Checkbox / radio / switch (+ `*-list-item`) | `u-checkbox`, `u-radio`, `u-switch`, `u-checkbox-list-item`, `u-radio-list-item`, `u-switch-list-item` | `checked: boolean` | `onChange` (re-dispatched, not composed) | `e.target.checked` | **not** `value`/`input`; indeterminate → `setFormValue(null)` |
| Slider | `u-slider` | `value: number` OR `valueStart`/`valueEnd: number` | `onInput` (dragging, composed) + `onChange` (commit, composed) | `e.target.value` (number) | range mode = multi-entry FormData |
| Chip field | `u-chip-field` | `value: any[]` | `onChange` (bubbles, not composed) + `onRemove` (`CustomEvent`) | `e.target.value` (array) | multi-entry FormData |
| Typeahead | `u-typeahead` | `value: any` | `onInput` (composed) + `onChange` + `onSelected` (`CustomEvent`) | depends; lead with explicit | bespoke `selected` detail |
| Button field | `u-button-field` | `value: string` (setter) | none (display-only) | n/a | not a value-emitting input |
| Button / FAB | `u-button`, `u-fab`, `u-fab-menu-item` | — | (none for value) | n/a | form **submitter**, not a field |

> **Mental model to print in the README (from `react.md` §"Controlled vs uncontrolled"):**
> `value`/`checked` go **in** as DOM properties; the value comes **out** by listening to
> `input` (live) / `change` (commit) on the `u-*` element and reading `e.target.value` (or
> `e.target.checked` for checkbox/switch/radio). Because every input is FACE, an **uncontrolled**
> usage (give the element a `name`, read on `<form>` submit via `FormData`) needs no React state
> at all and is the simplest path with `react-hook-form`'s `register`/uncontrolled mode.

### The generator's source of truth (READ THIS — it is the P1-6 trap)
**Do NOT trust `dist/custom-elements.json`'s `name` or `events` fields blindly.** Verified facts:
- There are **64** `@customElement('u-*')` declarations across `src/` (verified by grep).
- `dist/custom-elements.json` is **stale** at authoring time: it lists only **53** custom-element
  declarations (e.g. `u-slider` is missing) and its `events` arrays are **incomplete** — e.g.
  `u-text-field` and `u-checkbox` show `events: []` even though they emit `input`/`change` (those
  come from the inner native `<input>` / `redispatchEvent`, which the CEM `@event` JSDoc scan does
  not capture). **Always regenerate it first** (`npm run analyze` at the web root re-runs
  `cem analyze`).
- The CEM declaration `name` is the **analyzer-internal class name** (`UmTextField`, `UmSelect`),
  **not** the public export. The **public** class name comes from the
  `declare global { interface HTMLElementTagNameMap { 'u-select': Select } }` block (and the
  `export *` in `src/index.ts`). Verified: across all **59** `HTMLElementTagNameMap` entries the
  mapping is exactly `u-foo-bar` → `FooBar` (zero mismatches), so the tag→class derivation is
  `tag.replace(/^u-/, '').split('-').map(capitalize).join('')`.
- **5 of the 64 tags have no `HTMLElementTagNameMap` entry** (and need not be wrapped — they are
  internal/template/UI-only, not form fields): `u-calendar`, `u-overflow-menu`,
  `u-overflow-menu-item`, `u-range-calendar`, `u-typeahead-template-render`. The generator's
  source of truth is therefore the **`HTMLElementTagNameMap` blocks** (cross-checked against
  `src/index.ts` re-exports), which give exactly the 59 publicly-typed elements with their public
  class names — not the stale CEM `name` list.

**Generator algorithm (authoritative):**
1. Run `npm run analyze` at the web root (regenerates `dist/custom-elements.json`) — optional but
   recommended for events; the **value/event map below is the authority**, since CEM events are
   incomplete.
2. Scan `D:/Projects/universal-material-web/src/**/*.ts` for `HTMLElementTagNameMap` entries
   `'u-foo': Bar;` → build the `{ tag, className }[]` list (59 entries). Verify each `className`
   is re-exported from `src/index.ts` (it is, via `export *`).
3. Overlay a **curated events map** keyed by tag (hard-coded in the generator, sourced from
   `form-participation.md` §2.2 and the table above): map `onInput`/`onChange` for the
   value-emitting inputs, `onChange` for selection controls, plus `onSelected`/`onRemove` for
   `u-typeahead`/`u-chip-field`. Non-input elements get **no** `events` map.
4. Emit one file per element under `src/components/<tag>.ts` and a barrel `src/index.ts`.

The verified 64-tag list (for the reviewer; the generator derives 59 wrappable ones from the
tagNameMap, dropping the 5 unmapped internals above):
`u-app-bar`?no→ actual tags: `u-top-app-bar, u-navigation-bar, u-navigation-bar-item, u-badge,
u-button, u-button-set, u-fab, u-icon-button, u-button-field, u-calendar*, u-range-calendar*,
u-datepicker, u-range-datepicker, u-card, u-card-content, u-card-media, u-collapse,
u-expansion-panel, u-expansion-panel-container, u-slider, u-chip, u-chip-set, u-chip-field,
u-dialog, u-checkbox, u-checkbox-list-item, u-radio, u-radio-list-item, u-search, u-switch,
u-switch-list-item, u-elevation, u-field, u-text-field, u-text-area, u-select, u-option, u-list,
u-list-item, u-icon, u-menu, u-menu-item, u-drawer, u-drawer-item, u-drawer-headline,
u-side-navigation, u-navigation-rail, u-navigation-rail-item, u-navigation-rail-headline,
u-overflow-menu*, u-overflow-menu-item*, u-circular-progress, u-progress-bar, u-ripple,
u-scaffold, u-pane, u-snackbar, u-tab-bar, u-tab, u-theme(? no), u-highlight,
u-typeahead, u-typeahead-template-render*, u-fab-menu, u-fab-menu-item` — the **5 starred**
(`u-calendar`, `u-range-calendar`, `u-overflow-menu`, `u-overflow-menu-item`,
`u-typeahead-template-render`) lack a tagNameMap entry and are excluded. **Do not paste this list
into code — let the generator read the tagNameMap so it never drifts.**

### Package shape (from `01-package-layout.md` §1, §3.3, §4, §5)
```
packages/react/                          # @universal-material/react (NEW, runtime)
├── package.json                         # §3.3 — esm+cjs+dts, @lit/react dep, react/web peers
├── tsconfig.json                        # extends ../../tsconfig.base.json (+ jsx: react-jsx, std decorators)
├── tsup.config.ts                       # esm+cjs+dts, external: react/react-dom/@universal-material/web
├── vitest.config.ts                     # happy-dom/jsdom env for the React tests
├── README.md                            # controlled/uncontrolled, react-hook-form, Next SSR
├── scripts/gen.mjs                      # the GENERATOR (reads web's tagNameMap + curated events)
├── dist/                                # tsup output (publish root), gitignored
├── test/                                # vitest specs
│   ├── controlled.test.tsx
│   ├── uncontrolled.test.tsx
│   └── react-hook-form.test.tsx
└── src/
    ├── index.ts                         # re-exports all wrappers (GENERATED)
    └── components/*.ts                   # createComponent wrappers (GENERATED)
```
Build tools are **absent at authoring time** (verified: no `node_modules/@lit/react`, no `tsup`,
no `vitest`) — they install via this package's `devDependencies`/`dependencies` on the next root
`npm install`. Per `01-package-layout.md` §3.3, `@lit/react` is a **`dependency`** (the wrapper's
own engine, tiny), while `react`/`react-dom`/`@universal-material/web` are **peerDependencies**.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web` (the workspace
> root / web package). All paths are absolute. Use the verbatim PowerShell in §Verification.

### S1. Create the package manifest
`D:/Projects/universal-material-web/packages/react/package.json` (from `01-package-layout.md`
§3.3, verbatim — `@lit/react` is a dep, not a peer):
```jsonc
{
  "name": "@universal-material/react",
  "version": "0.1.0",
  "description": "React wrappers for @universal-material/web Material 3 web components.",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" }
  },
  "files": ["dist", "README.md"],
  "sideEffects": false,
  "scripts": {
    "generate": "node scripts/gen.mjs",
    "prebuild": "node scripts/gen.mjs",
    "build": "tsup",
    "build:watch": "tsup --watch",
    "test": "vitest run",
    "lint": "eslint src/**/*.ts"
  },
  "peerDependencies": {
    "@universal-material/web": "^3.10.0",
    "react": "^17 || ^18 || ^19",
    "react-dom": "^17 || ^18 || ^19"
  },
  "dependencies": {
    "@lit/react": "^1.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "happy-dom": "^15",
    "react": "^19",
    "react-dom": "^19",
    "react-hook-form": "^7",
    "tsup": "^8",
    "typescript": "~5.8.2",
    "vitest": "^2"
  }
}
```
> Notes: **Do NOT add `"@universal-material/web"` to `dependencies` or `devDependencies`.** It is
> the workspace-**ROOT** package, which npm does not symlink into `node_modules`; naming it in a
> workspace manifest with a `"*"` (or any) range makes npm try to resolve it against the registry
> and fail with **`ETARGET`** (the same failure mode the Angular task `04` hit — commit `d6157ae`).
> Build-time types come from the built root **`dist/`**, resolved via a tsconfig `paths` entry +
> tsup `alias` → `../../dist/index` (S2/S3 below), with web built first. The published web contract
> is the `^3.10.0` **peerDependency** only. `prebuild` runs the generator so a clean `npm run build`
> always regenerates from the current web manifest, while the committed `src/components/*.ts` keeps
> the package buildable without re-running it.

### S2. Create the tsconfig (extends shared base; standard decorators + jsx)
`D:/Projects/universal-material-web/packages/react/tsconfig.json` (`01-package-layout.md` §4 —
the base has `strict`/`moduleResolution`/`target ES2022`; React wrappers want **standard**
decorators and `jsx: react-jsx`, NOT web's `experimentalDecorators`/`useDefineForClassFields:false`):
```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "noEmit": true,
    // Resolve the bare web specifier to the built root dist (the docs-app pattern),
    // because npm does NOT symlink the workspace-root @universal-material/web into
    // node_modules. Web must be built first so ../../dist/index.d.ts exists.
    "paths": {
      "@universal-material/web":   ["../../dist/index"],
      "@universal-material/web/*": ["../../dist/*"]
    }
  },
  "include": ["src"]
}
```
> The `paths` entry is what makes `npx tsc --noEmit` (and the IDE) resolve `@universal-material/web`
> for the generated wrappers — there is no `node_modules/@universal-material/web` symlink for the
> root package. If `02-monorepo-scaffold.md` has not yet created `tsconfig.base.json`, temporarily
> inline the base compilerOptions and flag it in the PR — but `02` is a hard precondition.

### S3. Create the tsup config (esm + cjs + dts; external peers, web resolved from root dist)
`D:/Projects/universal-material-web/packages/react/tsup.config.ts` (`01-package-layout.md` §3.3,
§5 — externalize peers so they are not bundled twice; `react.md` §"Build tooling"):
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  // @universal-material/web stays EXTERNAL at runtime (it is a peer — never bundled).
  // Its IDENTIFIER must still resolve at build/dts time. There is no
  // node_modules/@universal-material/web symlink (it is the workspace-ROOT package, which
  // npm does not symlink), so point the bare specifier at the built root dist — the same
  // ../../dist mapping the tsconfig `paths` uses. tsup's dts pass reads tsconfig `paths`,
  // so the tsconfig entry from S2 covers types; this alias covers esbuild's own resolution.
  esbuildOptions(options) {
    options.alias = {
      ...(options.alias ?? {}),
      '@universal-material/web': '../../dist/index',
    };
  },
  external: ['react', 'react-dom', '@universal-material/web', '@lit/react'],
});
```
> **Web must be built first** so `../../dist/index` exists. The `alias` + `external` combination
> means esbuild can *resolve* the specifier (for type/dts and import-rewriting) while still leaving
> it as an external `import '@universal-material/web'` in the emitted ESM/CJS (the consumer's peer
> provides it). Do **not** rely on a node_modules symlink — there is none for the root package.

### S4. Write the generator `scripts/gen.mjs`
`D:/Projects/universal-material-web/packages/react/scripts/gen.mjs`. It implements the algorithm
in Context §"The generator's source of truth". Concretely:

1. Resolve the web `src/` dir: `path.resolve(__dirname, '../../../src')`
   (= `D:/Projects/universal-material-web/src`).
2. Recursively read every `*.ts`, regex out `HTMLElementTagNameMap` entries
   `/'(u-[a-z-]+)'\s*:\s*([A-Za-z0-9_]+)\s*;/g` → `Map<tag, className>` (expect 59 entries).
3. Define a **curated events map** (hard-coded, from `form-participation.md` §2.2 and this doc's
   contract table) keyed by tag:
   ```js
   const EVENTS = {
     'u-text-field': { onInput: ['input','InputEvent'], onChange: ['change','Event'] },
     'u-text-area':  { onInput: ['input','InputEvent'], onChange: ['change','Event'] },
     'u-search':     { onInput: ['input','InputEvent'], onChange: ['change','Event'] },
     'u-select':     { onInput: ['input','InputEvent'], onChange: ['change','Event'] },
     'u-datepicker':       { onInput: ['input','InputEvent'], onChange: ['change','Event'] },
     'u-range-datepicker': { onInput: ['input','InputEvent'], onChange: ['change','Event'] },
     'u-slider':     { onInput: ['input','InputEvent'], onChange: ['change','Event'] },
     'u-checkbox':   { onChange: ['change','Event'] },
     'u-checkbox-list-item': { onChange: ['change','Event'] },
     'u-radio':      { onChange: ['change','Event'] },
     'u-radio-list-item':    { onChange: ['change','Event'] },
     'u-switch':     { onChange: ['change','Event'] },
     'u-switch-list-item':   { onChange: ['change','Event'] },
     'u-typeahead':  { onInput: ['input','InputEvent'], onChange: ['change','Event'], onSelected: ['selected','CustomEvent'] },
     'u-chip-field': { onChange: ['change','Event'], onRemove: ['remove','CustomEvent'] },
     'u-button':     { onChange: ['change','Event'] }, // re-dispatched per CEM; harmless for non-inputs
   };
   ```
   Tags absent from `EVENTS` get **no** `events` map (emit `createComponent` without it).
4. For each `[tag, className]`, derive the React display name as `'U' + className`
   (`u-text-field`/`TextField` → `UTextField`; matches `react.md` §"Minimal code sketch") and emit
   `src/components/<tag>.ts`:
   ```ts
   // AUTO-GENERATED by scripts/gen.mjs — DO NOT EDIT.
   import * as React from 'react';
   import { createComponent, type EventName } from '@lit/react';
   import { TextField } from '@universal-material/web';

   export const UTextField = createComponent({
     react: React,
     tagName: 'u-text-field',
     elementClass: TextField,
     displayName: 'UTextField',
     events: {
       onInput: 'input' as EventName<InputEvent>,
       onChange: 'change' as EventName<Event>,
     },
   });
   ```
   - The side-effect registration is pulled in **once** by the barrel (S5), not per file, to avoid
     64 duplicate `import '@universal-material/web'` statements; importing the class also registers
     it, but the barrel's single bare import guarantees order.
5. Emit `src/index.ts` (S5).
6. Print a summary: `Generated N wrappers (expected 59).` and **exit non-zero if N !== 59** so a
   web-library element rename/addition fails the build loudly (this is the anti-drift guard).

> The generator emits **plain TypeScript** (no JSX) so it needs no JSX transform itself — it just
> writes `createComponent` calls. Keep the emitted code Prettier-clean (the root
> `prettier . --check` lints `packages/**` too — `01-package-layout.md` §1 comment on root lint).

### S5. The barrel `src/index.ts` (GENERATED by S4, step 5)
`D:/Projects/universal-material-web/packages/react/src/index.ts`:
```ts
// AUTO-GENERATED by scripts/gen.mjs — DO NOT EDIT.
import '@universal-material/web'; // side-effect: registers every <u-*> element once

export * from './components/u-text-field.js';
export * from './components/u-select.js';
// …one export per generated component…

// Re-export the @lit/react EventName helper for consumers typing bespoke events.
export type { EventName } from '@lit/react';
```
> Emit the per-component re-exports in a stable (alphabetical-by-tag) order so diffs are minimal
> across regenerations.

### S6. Run the generator and commit its output
```powershell
# --legacy-peer-deps may be required at the monorepo root (Angular devDep skew — see task 04).
npm install --legacy-peer-deps                # installs @lit/react/tsup/vitest (does NOT symlink web — it's the root package)
npm run generate -w @universal-material/react # reads ../../src tagNameMap (+ ../../dist/custom-elements.json); writes src/components/*.ts + src/index.ts
```
Commit `src/components/*.ts` and `src/index.ts` (they are part of the package, not `dist/`). The
generator reads the web library by **relative path** (`../../src`, `../../dist/custom-elements.json`),
not through a node_modules symlink — there is none for the workspace-root web package.

### S7. Write the tests (`test/*.test.tsx`)
Use `@testing-library/react` + `vitest` (happy-dom env). Create
`D:/Projects/universal-material-web/packages/react/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'happy-dom', globals: true },
  esbuild: { jsx: 'automatic' },
});
```
Tests (each imports the **generated** wrappers from `../src/index.js`):
- `test/controlled.test.tsx` — render `<UTextField value="hi" onInput={...} />`; assert the
  element's `.value` property is `"hi"` (property, not attribute — `hasAttribute('value')` is
  false), dispatch an `input` event and assert the `onInput` handler received it with
  `e.target.value`.
- `test/uncontrolled.test.tsx` — render `<form><UTextField name="email" /></form>`, set
  `.value`, read `new FormData(form).get('email')` and assert it round-trips (FACE submission).
  > **Caveat:** happy-dom/jsdom FACE support varies; if `FormData` does not pick up the
  > `ElementInternals` value in the test env, assert the element exposes `name` + `value` + has
  > `static formAssociated === true` on its constructor instead, and note the env limitation in a
  > comment. Do **not** weaken the assertion silently.
- `test/react-hook-form.test.tsx` — wrap `<UTextField>` in RHF `<Controller>`, fire `change`,
  assert `field.onChange` was called with `e.target.value` (the controlled path from `react.md`
  §3b).

### S8. Write the README
`D:/Projects/universal-material-web/packages/react/README.md` — a consumer-facing distillation of
`planning/research/react.md`. Required sections:
- Install: `npm i @universal-material/react @universal-material/web react react-dom`.
- One-line side-effect import note (the barrel already imports web; re-state for clarity).
- **Controlled** usage (`value`/`checked` in as property; read `e.target.value`/`e.target.checked`
  on `onInput`/`onChange`) — copy the per-component table from this doc's Context.
- **Uncontrolled** usage (give `name`, read `FormData` on submit — simplest with FACE).
- **react-hook-form**: `register`/uncontrolled (preferred) vs `Controller` (controlled), with the
  two snippets from `react.md` §3/§3b.
- The **checkbox/switch/radio** divergence (`checked` + `onChange` on `e.target.checked`, no
  `value`/`input` payload) and the **bespoke events** (`onSelected`/`onRemove` carry `e.detail`).
- **Next.js / SSR**: render wrappers in client components (`"use client"`); custom elements are
  client-only (`attachInternals()` in the constructor) — `dynamic(..., { ssr: false })` if
  `ElementInternals` throws during SSR (`react.md` Gotcha 9).
- Cross-link the live "Using with React" docs page (added by `11-docs-integration.md`).

---

## Acceptance criteria

1. `packages/react/package.json` declares `@universal-material/react@0.1.0`, `type: module`,
   `main`/`module`/`types` + an `exports` map with `import`/`require`/`types`, `sideEffects:false`,
   `@lit/react` as a **dependency**, and `react`/`react-dom`/`@universal-material/web ^3.10.0` as
   **peerDependencies** (matches `01-package-layout.md` §3.3).
2. `packages/react/scripts/gen.mjs` exists and, when run, reads the web library's
   `HTMLElementTagNameMap` blocks (NOT a hand-pasted tag list, NOT the stale CEM `name` field) and
   emits **one `createComponent(...)` wrapper per publicly-typed `u-*` element** (expected **59**),
   each with the correct `elementClass` import from `@universal-material/web` and the curated typed
   `events` map for the value-emitting inputs. The generator **exits non-zero if the count drifts
   from 59**.
3. The generated `src/components/*.ts` and `src/index.ts` are committed, import the real public
   class names (`TextField`, `Select`, `Checkbox`, … — verified against `src/index.ts` re-exports),
   and the barrel does a single side-effect `import '@universal-material/web'`.
4. `npm run build -w @universal-material/react` produces `dist/index.js` (ESM), `dist/index.cjs`
   (CJS), and `dist/index.d.ts` (types), with `react`/`react-dom`/`@universal-material/web`/
   `@lit/react` **externalized** (not bundled).
5. `npm test -w @universal-material/react` passes the controlled, uncontrolled, and
   react-hook-form specs.
6. `packages/react/README.md` documents controlled vs uncontrolled (given FACE), react-hook-form
   `register` vs `Controller`, the checkbox/switch/radio `checked`+`onChange` divergence, and the
   Next.js `"use client"`/SSR caveat.
7. **No web `src/`, `dist/`, `skills/`, or `.claude-plugin/` files changed** (the generator reads
   web; running `npm run analyze` regenerates `dist/custom-elements.json`, which is gitignored, so
   `git status` stays clean under tracked web paths).
8. `npm install` at root symlinks `node_modules/@universal-material/react` to `packages/react` (it
   is a `packages/*` **member**). Note `@universal-material/web` is **not** symlinked — it is the
   workspace-ROOT package; this package resolves it from the built root `dist/` via the tsconfig
   `paths` + tsup `alias` (S2/S3), and web carries **no** `dependencies`/`devDependencies` entry on
   this package's manifest (only the `^3.10.0` peer), avoiding npm `ETARGET`.

---

## Verification commands

> Run from `D:/Projects/universal-material-web` unless noted. PowerShell (Windows).

**V1 — workspace + deps resolve:**
```powershell
npm install --legacy-peer-deps                     # --legacy-peer-deps: Angular devDep skew at the root (task 04)
Test-Path node_modules/@universal-material/react   # expect True (workspace MEMBER symlink)
Test-Path node_modules/@universal-material/web     # expect False (root package — NOT symlinked; resolved from ../../dist)
Test-Path node_modules/@lit/react                  # expect True (installed dependency)
```

**V2 — generator runs and produces exactly 59 wrappers:**
```powershell
npm run generate -w @universal-material/react
(Get-ChildItem packages/react/src/components -Filter *.ts | Measure-Object).Count   # expect 59
node -e "const fs=require('fs');const s=fs.readFileSync('packages/react/src/index.ts','utf8');console.log('exports:',(s.match(/export \* from/g)||[]).length)"
```

**V3 — generated class names are real exports of the web library (no transcription error):**
```powershell
# Web must be BUILT FIRST so ../../dist/index.d.ts exists (the tsconfig `paths` target).
npm run build   # builds the root web package -> dist/
# Every imported class in the generated wrappers must exist in @universal-material/web's types.
npx tsc --noEmit -p packages/react/tsconfig.json
# expect: no "has no exported member" / "cannot find module '@universal-material/web'" errors
```

**V4 — build emits esm + cjs + dts with peers external:**
```powershell
npm run build -w @universal-material/react
Test-Path packages/react/dist/index.js ; Test-Path packages/react/dist/index.cjs ; Test-Path packages/react/dist/index.d.ts  # all True
# Confirm React is NOT inlined into the bundle:
Select-String -Path packages/react/dist/index.js -Pattern "from `"react`"|require\(`"react`"\)" -Quiet  # expect True (kept external as an import)
```

**V5 — tests pass:**
```powershell
npm test -w @universal-material/react
# expect: controlled.test.tsx, uncontrolled.test.tsx, react-hook-form.test.tsx all green
```

**V6 — package identity:**
```powershell
node -e "const p=require('./packages/react/package.json'); console.log(p.name,p.version,'main='+p.main,'types='+p.types,'litreact-dep='+(p.dependencies['@lit/react']??'(MISSING)'))"
# expect: @universal-material/react 0.1.0 main=./dist/index.cjs types=./dist/index.d.ts litreact-dep=^1.0.0
```

**V7 — web library untouched:**
```powershell
git status --porcelain src skills .claude-plugin package.json gulpfile.js
# expect: no output (dist/ is gitignored; analyze regenerating it does not show here)
```

---

## Rollback notes

- The entire deliverable lives under `D:/Projects/universal-material-web/packages/react/` (new
  directory) — it is **fully additive** to the web library. To roll back:
  `Remove-Item -Recurse -Force packages/react`, then `npm install` to drop the symlink. No web
  `src/`, `dist/`, build script, postinstall patch, `skills/`, or `.claude-plugin/` file is
  touched, so there is **zero** publish-time or runtime regression risk for existing
  `@universal-material/web` consumers.
- The generator only **reads** the web library and writes inside `packages/react/`; it never
  mutates `src/`. Running `npm run analyze` (to refresh `dist/custom-elements.json`) only
  rewrites a **gitignored** file — `git checkout` is not needed for it.
- No other package depends on `@universal-material/react` in phase 1 (it is consumer-facing only),
  so removing it cannot break the web, Angular, Vue, Svelte, or Solid builds. The only place that
  references it is the additive `build:all`/`test:all` fan-out added by `14-ci-pipeline.md`
  (guarded with `--if-present` / `-w … --if-present` per `01-package-layout.md` §3.1), which
  no-ops cleanly if the package is removed.

---

## Parallelizable in worktree? **yes** — why

This task **creates a brand-new disjoint directory** (`packages/react/**`) and edits **no shared
file**: it does not modify the web library `src/`, the build pipeline, `dist/`, `skills/`,
`.claude-plugin/`, the root `package.json` (the `build:all`/`test:all` fan-out entry is owned by
`14-ci-pipeline.md`, not this task), or any other package. It only **reads** the web library's
`src/` (the `HTMLElementTagNameMap` blocks) and `dist/` types at generate/build time, which is a
read-only dependency, not a write conflict. It is therefore independent of every sibling wrapper
task — Angular (`04`), Vue (`08`), Svelte (`09`), Solid (`10`) — each of which writes its own
`packages/<name>/**` tree. The only ordering constraint is the **precondition** that
`02-monorepo-scaffold.md` (workspaces + `tsconfig.base.json`) and `03-relocate-web-package.md`
(web stays at root with its `dist/` type surface) have landed — a precondition, not a
parallel-write hazard. No build-order coupling beyond "web is built/typed before React consumes
its types," which the root `build:all` already sequences (web first, then wrappers).
