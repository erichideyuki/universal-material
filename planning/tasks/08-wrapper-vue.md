# Task 08 — Vue 3 usage docs page ("Using with Vue 3")

> **Status:** ready to implement. **Phase-2 deliverable = the docs page ONLY.**
> **Architecture authority:** `planning/architecture/00-decision.md` §5, §11.3; `planning/architecture/01-package-layout.md` §1, §3.4; `planning/research/vue.md` (the full how-to).
> **One-line scope:** Produce the *Vue 3* consumption deliverable for phase 2 — a "Using with Vue 3" docs page in the web docs app. There is **no runtime wrapper** for Vue; the research is decisive that Vue 3 consumes `u-*` custom elements natively. The optional types-only `@universal-material/vue` package is **DEFERRED** (out of scope for phase 2 — a documented follow-up, NOT built now).

---

## Scope (ONE unit only)

Deliver the Vue 3 framework-usage surface for `@universal-material/web`:

1. **(Primary — the ONLY active phase-2 deliverable)** A docs page **"Using with Vue 3"** in the web docs app at
   `D:/Projects/universal-material-web/docs/`, covering: the `isCustomElement` compiler
   config, side-effect import, prop/DOM-property binding, event listening, the `v-model`
   expansion rules, TypeScript typing via `GlobalComponents`, and SSR/Nuxt client-only
   caveat.
2. **(DEFERRED — out of scope for phase 2; do NOT build now)** A types-only
   workspace package `packages/vue/` = `@universal-material/vue` (`package.json` with
   `vue` peer, a `vue-shims.d.ts` `GlobalComponents` augmentation, and a README). **Per the locked phase-2 decision, Vue ships a DOCS PAGE ONLY now; the optional types-only package is a documented follow-up, deferred to a later phase.** A cold agent running this task must **NOT** create `packages/vue/`. Part B below is retained only as the spec for that future follow-up — it is **not** part of this task's acceptance.

**This task does NOT:**
- Build a runtime `defineComponent` wrapper package (explicitly rejected — see research §"Wrappers vs documentation-only").
- Touch the web library `src/`, its build pipeline, `dist/`, `skills/`, or `.claude-plugin/`.
- Touch `packages/react`, `packages/angular`, `packages/svelte`, or `packages/solid`.
- Set up Changesets, CI, or release wiring (those are the monorepo-foundation tasks).
- Add `@vitejs/plugin-vue` or any Vue build tooling to **this** repo (all Vue build config lives in the *consumer's* app and is only **documented** here).

---

## Preconditions & Dependencies

This task is **content-only**. Its sole phase-2 deliverable is the docs page (Part A):

- **No hard dependency on `02-monorepo-scaffold.md`.** The docs page has **zero** dependency on
  the workspace. (The deferred `packages/vue/` package — Part B — would have required the
  workspaces skeleton from `02-monorepo-scaffold.md`, but Part B is **out of scope for phase 2**,
  so this task no longer depends on `02` at all.)
- **No dependency** on the React, Angular, Svelte, or Solid tasks. Nothing about Vue's
  deliverable references their code.
- **Soft dependency:** the web docs app must build/serve (`npm run docs` → :4200). It does
  today; this task only adds one page + one route + one nav item.

Do **Part A** and stop. **Part B (`packages/vue/`) is DEFERRED** — do not build it in phase 2.

---

## Context (enough to execute COLD)

### What @universal-material/web is, mechanically
- `@universal-material/web@3.9.0` (next publish `3.10.0`) is a **pure-ESM** Material 3 Lit
  component library. Components register as custom elements under the **`u-` tag prefix**
  via `@customElement('u-...')`, with an unprefixed PascalCase class
  (`u-button` → `class Button`, `u-select` → `class Select`). The class barrel is
  `D:/Projects/universal-material-web/src/index.ts`, which does side-effect registration
  imports (e.g. `import './button/button.js'`) then re-exports the classes. **Importing
  `@universal-material/web` once registers every `<u-*>` element** — this is the side-effect
  import Vue consumers need in `main.ts`.
- The published package's types entry exports every component class (e.g. `Button`,
  `Select`, `Checkbox`), which the Vue `GlobalComponents` augmentation imports as the
  element type.

### Why Vue needs NO runtime wrapper (the decisive research finding)
- Every input-like `u-*` element is a **Form-Associated Custom Element (FACE)**: it sets
  `static formAssociated = true`, calls `attachInternals()`, and pushes value via
  `ElementInternals.setFormValue(...)`. Verified per component in
  `planning/research/form-participation.md` §2 and `planning/current/02-web-form-contracts.md`.
- Vue 3 has first-class custom-element interop: it binds props as DOM properties (via an
  `in`-operator heuristic), listens to native/custom events with `@event`, and `v-model`
  works on custom elements using the **native-element expansion** (`:value` + `@input`),
  **not** the component `modelValue`/`update:modelValue` expansion.
- Therefore the entire Vue deliverable is **documentation** (+ optional ambient types). The
  full how-to, with every gotcha and source link, is `planning/research/vue.md` — **read it
  before writing the page; the page is a distilled, example-driven version of it.**

### The exact per-component value/event contract Vue docs must reflect
From `planning/current/02-web-form-contracts.md` (verified against `src/`). The
`v-model="x"` sugar (`:value` + `@input` reading `$event.target.value`) **only "just
works"** for components matching the native-input contract. Table the page must get right:

| Component(s) | Two-way prop | Live event (where value lives) | `v-model="x"` works directly? | Recommended Vue binding |
| --- | --- | --- | --- | --- |
| `u-text-field`, `u-text-area`, `u-search` | `value: string` | native `input` (composed), value on `$event.target.value` | **Yes** | `v-model="text"` |
| `u-datepicker`, `u-range-datepicker` | `value: string` | `input` (composed) + `change`; value on `$event.target.value` | **Yes** (use `.lazy` for change-only) | `v-model="date"` |
| `u-select` | `value: string` (+ `selectedIndex: number`) | `input` (composed) + `change` (bubbles, **not** composed); user-pick value on `$event.target.value` | **Yes** for `value`; but `change` is not composed (hear it on the element) | `v-model="choice"` or `:value` + `@input` |
| `u-checkbox`, `u-switch`, `u-radio` (+ `*-list-item`) | `checked: boolean` | native `input` (composed) + `change` (re-dispatched, **not** composed); value on `$event.target.checked` | **No** (no `value`/`input` payload at `target.value`) | `:checked="x" @change="x = $event.target.checked"` |
| `u-slider` | `value: number` (single) OR `valueStart`/`valueEnd: number` (range) | `input` (bubbles, composed) + `change` (bubbles, **composed**) | Partially — `value` is a number, lives on `$event.target.value` | `v-model.number="n"` (single) / explicit for range |
| `u-chip-field` | `value: any[]` | `change` (bubbles, not composed) + native `input` while typing | **No** (array value, not at `target.value`) | `:value="rows" @change="rows = $event.target.value"` |
| `u-typeahead` | `value: any` | `input` (composed) + `change` (not composed) | Depends on payload; lead with explicit | `:value` + `@input`/`@change` |
| `u-button-field` | `value: string` (setter) | **none** (display-only, set programmatically) | **No** (no value-change event) | one-way `:value` only; not a form input |
| `u-field` | (no value prop; slots a native control) | none of its own | n/a | bind the slotted native `<input>` |

> Mental model to print verbatim in the page (from research §"v-model code sketch"):
> **On a `u-*` custom element, `v-model="x"` ≡ `:value="x" @input="x = $event.target.value"`.
> If the component doesn't expose `value` + `input`, bind `:prop` and `@event` explicitly
> (or `v-model:arg` only when the element emits `update:arg` — which `u-*` elements do not).**

### How the web docs app works (where the page slots)
Surface map: `planning/current/03-web-docs-app.md`. Concretely:
- The docs app is Angular 20, standalone, **hash-routed**, served by `npm run docs` on
  **:4200**. Routes: `D:/Projects/universal-material-web/docs/src/app/app.routes.ts`.
- Pages live under `docs/src/app/<section>/<name>/` as a standalone component:
  `<name>.component.ts` (imports `examples/*.html` as **text strings** — `docs/angular.json`
  registers `"loader": { ".html": "text" }`), `<name>.component.html` (uses the
  `docs-title`, `docs-example`, `docs-apis-table` primitives), `<name>.component.scss`
  (`:host { display: block; }`).
- **Reference page to copy the shape from:**
  `docs/src/app/components/badges/badges.component.ts` (a minimal page). Its `.ts` imports
  example HTML strings and assigns them to fields; the `.html` feeds them to
  `<docs-example [html]="usageHtml" ...>`.
- The nav is `docs/src/app/docs/shell/shell.component.html`:
  `<u-navigation-rail-item slot="expanded" routerLink="..." docsLinkActive>` items grouped
  under `<u-navigation-rail-headline slot="expanded">…</u-navigation-rail-headline>`
  headings — **Get started** (line ~176, has "Installation" → `routerLink=""`),
  **Foundations**, **Colors**, **Layout**, **Components**. Items are **alphabetical within
  their group** by visible label.
- `@docs/*` resolves to `docs/src/app/*` (tsconfig path); lazy routes use
  `loadComponent: () => import('@docs/...').then(m => m.XComponent)`.

There is currently **no** `docs/src/app/frameworks/` directory — this task creates the first
framework-usage page. Put it under a new `frameworks/` section.

### The optional `packages/vue/` package shape (when workspaces exist)
From `planning/architecture/01-package-layout.md` §1 and §3.4:
```
packages/vue/                              # @universal-material/vue (OPTIONAL, types-only)
├── package.json                           # §3.4 — types-only, vue peer, no main/module
├── README.md                              # isCustomElement, v-model rules, typing snippet
└── src/vue-shims.d.ts                     # GlobalComponents augmentation for u-* tags
```
It is **not a runtime package**: no `main`/`module`, only a `types` entry. The `.changeset`
config has `"ignore": []` and Changesets simply produces no changeset for it until it
changes. The web `tsconfig.base.json` (added by the foundation task) is the shared base;
this package is so trivial it needs no `tsconfig` unless you choose `tsc --emitDeclarationOnly`.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web`.
> All file paths are absolute. The docs app is the verification surface at :4200.

### PART A — "Using with Vue 3" docs page (do this regardless of workspaces state)

**A1. Create the example HTML snippets** (shown-and-rendered? — see A4 note; these are
*shown as code only*, since they reference a Vue toolchain that the Angular docs app cannot
render live). Create directory
`D:/Projects/universal-material-web/docs/src/app/frameworks/vue/examples/` and these files
(verbatim content distilled from `planning/research/vue.md`):

- `vite-config.html` — the `isCustomElement` Vite snippet:
  ```ts
  // vite.config.ts
  import { defineConfig } from 'vite'
  import vue from '@vitejs/plugin-vue'

  export default defineConfig({
    plugins: [
      vue({
        template: {
          compilerOptions: {
            // Treat every <u-*> tag as a custom element
            isCustomElement: (tag) => tag.startsWith('u-'),
          },
        },
      }),
    ],
  })
  ```
- `main-import.html` — the side-effect import:
  ```ts
  // main.ts
  import { createApp } from 'vue'
  import App from './App.vue'
  import '@universal-material/web' // registers all <u-*> custom elements
  createApp(App).mount('#app')
  ```
- `binding.html` — prop binding + event listening + the `.prop`/`.attr` escape hatches
  (research §2, §3).
- `v-model.html` — the four `v-model` cases from research §"v-model code sketch" (App.vue):
  native-contract `v-model`, the explicit `:value`+`@input` equivalent, checkbox
  `:checked`+`@change`, select on `$event.target.value`.
- `typescript.html` — the `vue-shims.d.ts` `GlobalComponents` augmentation (research §5),
  importing element classes from `@universal-material/web`.

> Keep snippets faithful to `planning/research/vue.md`; do not invent API. Where the
> research used `$event.detail.value`, **prefer `$event.target.value`** for select per the
> verified contract in `02-web-form-contracts.md` (u-select's user-pick value is read off the
> element/native input, and `change` is not composed) — note this divergence from the
> research's illustrative `detail` example in a comment in the snippet.

**A2. Create the page component**
`D:/Projects/universal-material-web/docs/src/app/frameworks/vue/vue.component.ts`:
```ts
import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import viteConfigHtml from './examples/vite-config.html';
import mainImportHtml from './examples/main-import.html';
import bindingHtml from './examples/binding.html';
import vModelHtml from './examples/v-model.html';
import typescriptHtml from './examples/typescript.html';

@Component({
  selector: 'docs-vue',
  templateUrl: './vue.component.html',
  styleUrl: './vue.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class VueComponent {
  viteConfigHtml = viteConfigHtml;
  mainImportHtml = mainImportHtml;
  bindingHtml = bindingHtml;
  vModelHtml = vModelHtml;
  typescriptHtml = typescriptHtml;
}
```

**A3. Create the page template**
`D:/Projects/universal-material-web/docs/src/app/frameworks/vue/vue.component.html`. Use
`<docs-title kind="foundation" title="Using with Vue 3">` (a "Get started"/foundation kind,
not a component) and a series of `<docs-example [renderExample]="false" [html]="..."
sectionTitle="...">` blocks with prose. **Set `[renderExample]="false"`** on every example
(the snippets are TS/`.vue`, not live-renderable Angular HTML — the Angular docs app cannot
execute Vue). Sections, in order:
1. Intro prose: Vue 3 consumes `u-*` natively; documentation-only; no runtime wrapper needed.
2. "Configure the compiler (`isCustomElement`)" → `viteConfigHtml`. Note it is **compile-time**.
3. "Register the components" → `mainImportHtml`.
4. "Binding props and listening to events" → `bindingHtml`.
5. "The `v-model` story" → `vModelHtml` + the mental-model one-liner + the per-component
   contract table (render the table from this doc's Context as HTML in the prose).
6. "TypeScript typing" → `typescriptHtml`.
7. "SSR / Nuxt" → short prose: import client-side only (Nuxt `.client.ts` plugin /
   `<ClientOnly>`), `customElements` is undefined on the server (research §Gotchas 7).

**A4. Create the page styles**
`D:/Projects/universal-material-web/docs/src/app/frameworks/vue/vue.component.scss`:
```scss
:host {
  display: block;
}
```

**A5. Register the route** in
`D:/Projects/universal-material-web/docs/src/app/app.routes.ts`, inside the
`DocsShellComponent` `children` array (the `path: ''` block at ~line 54), e.g. near the
other top-level "get started" siblings:
```ts
{
  path: 'frameworks/vue',
  loadComponent: () => import('@docs/frameworks/vue/vue.component').then(m => m.VueComponent)
},
```

**A6. Add the nav item** in
`D:/Projects/universal-material-web/docs/src/app/docs/shell/shell.component.html`. Add a
**new `<u-navigation-rail-headline slot="expanded">Frameworks</u-navigation-rail-headline>`
group** (place it after "Get started" / "Foundations" — pick a logical slot; if a
"Frameworks" headline is added by a sibling React task, reuse it and keep items
alphabetical: React, Solid, Svelte, **Vue**). The item:
```html
<u-navigation-rail-item slot="expanded"
  routerLink="frameworks/vue"
  docsLinkActive
  >Vue
  <span class="material-symbols-outlined" slot="icon">deployed_code</span>
</u-navigation-rail-item>
```
(Choose any sensible Material Symbol; `deployed_code` is a reasonable "framework" glyph.)

**A7. (Optional but recommended) Add an APIs/contract table.** This page documents
framework usage, not a single component's API, so a `<docs-apis-table key="...">` is **not**
appropriate (it keys off a single lowercased class name). Instead render the per-component
value/event contract table as plain HTML in the template (step A3.5). Do **not** run
`gulp docs:apis` for this page — there is no new component class.

### PART B — DEFERRED (out of scope for phase 2): types-only package `packages/vue/`

> **DO NOT DO PART B IN PHASE 2.** Per the locked decision, Vue ships a **docs page only** now; the
> optional types-only `@universal-material/vue` package is a **documented follow-up, deferred to a
> later phase.** A cold agent running task 08 must **NOT** create `packages/vue/`. The steps below
> are preserved verbatim **only as the future follow-up spec** — they are not part of this task's
> acceptance and should be skipped entirely.

**B1. Create `D:/Projects/universal-material-web/packages/vue/package.json`** (from
`01-package-layout.md` §3.4):
```jsonc
{
  "name": "@universal-material/vue",
  "version": "0.1.0",
  "description": "TypeScript GlobalComponents typings for using @universal-material/web with Vue 3.",
  "license": "MIT",
  "types": "./src/vue-shims.d.ts",
  "exports": {
    ".": { "types": "./src/vue-shims.d.ts" }
  },
  "files": ["src", "README.md"],
  "peerDependencies": {
    "@universal-material/web": "^3.10.0",
    "vue": "^3"
  }
}
```
- **No `main`/`module`** (no runtime JS). **No `build` script** (hand-authored `.d.ts`). If
  you prefer generating from `custom-elements.json`, add `"scripts": { "build": "node
  scripts/gen.mjs" }` reading `../../dist/custom-elements.json` — but the hand-authored
  `.d.ts` is the recommended phase-1 path (one `GlobalComponents` entry per `@customElement`).

**B2. Create `D:/Projects/universal-material-web/packages/vue/src/vue-shims.d.ts`** — the
`GlobalComponents` augmentation. Start from research §5's `DefineCustomElement<>` helper and
add **one entry per `u-*` element**. Generate the element list from the web library's
`@customElement` decls (64 declarations across `src/`) — read them out of
`D:/Projects/universal-material-web/dist/custom-elements.json` (or grep
`@customElement('u-` over `src/`) so the list is complete and the imported class names match
`src/index.ts`'s re-exports. Skeleton:
```ts
import type { HTMLAttributes, PublicProps, EmitFn } from 'vue'
import type { Button, Select, Checkbox /* …all classes… */ } from '@universal-material/web'

type EventMap = { [event: string]: Event }
type VueEmit<T extends EventMap> = EmitFn<{ [K in keyof T]: (event: T[K]) => void }>

type DefineCustomElement<
  ElementType extends HTMLElement,
  Events extends EventMap = {},
  SelectedAttributes extends keyof ElementType = keyof ElementType,
> = new () => ElementType & {
  $props: HTMLAttributes & Partial<Pick<ElementType, SelectedAttributes>> & PublicProps
  $emit: VueEmit<Events>
}

declare module 'vue' {
  interface GlobalComponents {
    'u-button': DefineCustomElement<Button, { click: MouseEvent }>
    'u-select': DefineCustomElement<Select, { input: Event; change: Event }>
    'u-checkbox': DefineCustomElement<Checkbox, { change: Event }>
    // …one entry per <u-*> element…
  }
}

export {}
```

**B3. Create `D:/Projects/universal-material-web/packages/vue/README.md`** — a condensed
version of the docs page (the `isCustomElement` Vite/Nuxt/webpack config, the `v-model`
rules, the per-component contract table, the typing import). Cross-link the live docs page
at `https://universal-material.github.io` → "Using with Vue 3". This README is what npm
renders.

**B4. Install + verify the workspace picks it up:**
```powershell
npm install
```
Confirm `node_modules/@universal-material/vue` is a symlink to `packages/vue`.

---

## Acceptance criteria

**Part A (docs page) — required:**
1. Navigating to `http://localhost:4200/#/frameworks/vue` renders the "Using with Vue 3"
   page with all sections (compiler config, import, binding, `v-model`, TypeScript, SSR).
2. The page appears in the left nav (a "Vue" `u-navigation-rail-item`, alphabetically placed
   if a "Frameworks" group is shared) and `docsLinkActive` highlights it when active.
3. Every code snippet is **syntax-highlighted and shown** (not live-rendered:
   `[renderExample]="false"`), with no `[Vue warn]`-style content or broken
   `innerHTML`-rendered Vue markup.
4. The page accurately states: **no runtime wrapper**, the `u-` `isCustomElement` predicate,
   `v-model="x"` ≡ `:value` + `@input` reading `$event.target.value`, and the per-component
   contract (checkbox/switch/radio use `:checked` + `@change` on `$event.target.checked`;
   chip-field/typeahead need explicit binding; button-field is display-only).
5. The docs app builds clean: `cd docs && ng build` (or `npm run docs:build` if present)
   succeeds with the new route/component.
6. No web `src/`, `dist/`, `skills/`, or `.claude-plugin/` files changed.

**Part B (types-only package) — DEFERRED, NOT part of phase-2 acceptance:**
Part B is **out of scope for phase 2** (locked decision: Vue ships a docs page only now). A
phase-2 run must **not** create `packages/vue/`, and criteria 7–10 below do **not** apply. They
are retained solely as the acceptance spec for the future follow-up that ships the optional types
package; verify them only if/when that follow-up is greenlit.
7. *(follow-up only)* `packages/vue/package.json` declares `@universal-material/vue@0.1.0`, types-only (no
   `main`/`module`), `vue ^3` + `@universal-material/web ^3.10.0` peers.
8. *(follow-up only)* `packages/vue/src/vue-shims.d.ts` augments `vue`'s `GlobalComponents` with **one entry per
   `u-*` element** (all 64 `@customElement` tags), importing classes that actually exist in
   the web library's type exports (matches `src/index.ts` re-exports).
9. *(follow-up only)* `npm install` at root symlinks `node_modules/@universal-material/vue`.
10. *(follow-up only)* A throwaway type-check (see Verification V5) of a `.vue`-shaped consumer resolves
    `<u-button>` etc. as typed components (no "failed to resolve component" type error).

---

## Verification commands

> Run from `D:/Projects/universal-material-web` unless noted. The dev server (`npm run
> docs`) is usually already running on :4200 — do **not** restart it unless asked.

**V1 — docs page route + component compile (Part A):**
```powershell
# Build the docs app to confirm the new lazy route + component type-check.
cd docs ; npx ng build --configuration development
```
Expect success and no unresolved `@docs/frameworks/vue/vue.component` import.

**V2 — visual check at :4200 (Part A):** open
`http://localhost:4200/#/frameworks/vue` in the connected browser
(`mcp__Claude_in_Chrome__navigate` then `get_page_text`). Confirm all sections render, code
blocks are highlighted, and the nav item is present and highlights when active. (Per
`CLAUDE.md` cardinal rule: visually evaluate, don't trust the build alone.)

**V3 — example files are valid text imports (Part A):** confirm each `examples/*.html`
exists and is imported in `vue.component.ts`:
```powershell
Get-ChildItem docs/src/app/frameworks/vue/examples
```

**V4 — package identity (Part B):**
```powershell
node -e "const p=require('./packages/vue/package.json'); console.log(p.name, p.version, 'types='+p.types, 'main='+(p.main??'(none)'))"
# expect: @universal-material/vue 0.1.0 types=./src/vue-shims.d.ts main=(none)
npm ls @universal-material/vue   # shows the workspace symlink
```

**V5 — types augmentation resolves (Part B):** create a throwaway
`packages/vue/_typecheck.ts` with `import './src/vue-shims';` and a small block that uses a
`GlobalComponents` key, then `npx tsc --noEmit -p packages/vue` (or a one-off
`npx tsc --noEmit packages/vue/_typecheck.ts --moduleResolution node`); delete the throwaway
after. Expect the augmentation to compile against `@universal-material/web`'s exported
classes.

**V6 — web library untouched:**
```powershell
git status --porcelain src dist skills .claude-plugin
# expect: no output (nothing changed under those paths)
```

---

## Rollback notes

- **Part A is fully additive and isolated** to `docs/`. To roll back: delete
  `docs/src/app/frameworks/vue/` (and `docs/src/app/frameworks/` if no sibling framework
  page exists), revert the single route entry in `docs/src/app/app.routes.ts`, and revert
  the nav-item (and "Frameworks" headline, if you added it) in
  `docs/src/app/docs/shell/shell.component.html`. No build artifacts, no generated files
  (`apis.ts` is **not** regenerated for this page). `git checkout -- docs/src/app/app.routes.ts
  docs/src/app/docs/shell/shell.component.html` + `Remove-Item -Recurse
  docs/src/app/frameworks/vue` reverses everything.
- **Part B is fully additive** under `packages/vue/`. To roll back: `Remove-Item -Recurse
  packages/vue`, then `npm install` to drop the symlink. No other package references
  `@universal-material/vue` (it is consumer-facing only), so removal cannot break the web,
  Angular, or React builds.
- Neither part modifies the web build pipeline, `dist/`, the postinstall patch, or any
  published web contract — so there is no publish-time or runtime regression risk for
  existing consumers.

---

## Parallelizable in worktree? **yes** — why

This task is **content-only and touches a disjoint file set**: `docs/src/app/frameworks/vue/**`
(new) plus two surgical additions to `docs/src/app/app.routes.ts` and
`docs/src/app/docs/shell/shell.component.html`. It does **not** modify the web library `src/`, the
build pipeline, `dist/`, `skills/`, `.claude-plugin/`, or any package — and in phase 2 it creates
**no** `packages/vue/` directory at all (Part B is **deferred**, out of scope). The only shared
files it edits (the docs routes file and shell template) take **append-only** edits — a new route
object and a new nav item — which conflict trivially-resolvably with sibling framework tasks
(React/Svelte/Solid) that append their own entries to the same two files; coordinate the
"Frameworks" headline once and the rest is independent. No build-order coupling: Vue has no runtime
wrapper to compile, so it never blocks or is blocked by the web → wrapper build chain. (If the
deferred Part B is ever greenlit as a follow-up, its `packages/vue/` work needs the workspaces
skeleton present — a precondition, not a parallel-write conflict — and creates files nobody else
writes.)
