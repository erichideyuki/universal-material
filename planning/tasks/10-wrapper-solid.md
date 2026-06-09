# Task 10 — SolidJS usage docs page ("Using with SolidJS")

> **Status:** ready to implement — **STRETCH / OPTIONAL.** Solid is not a primary consumer; ship only if there is appetite. **Phase-2 deliverable = the docs page ONLY** (Half A); it is low-cost and stands alone.
> **Architecture authority:** `planning/architecture/00-decision.md` (Vue/Svelte/Solid get DOCS PAGES + OPTIONAL types-only packages — **no runtime wrapper**); `planning/research/solid.md` (the full how-to, already corrected); `planning/research/form-participation.md` §2, §4 (why no wrapper is needed); `planning/current/03-web-docs-app.md` (docs-app surface map).
> **One-line scope:** Produce the *SolidJS* consumption deliverable for phase 2 — a "Using with SolidJS" docs page in the web docs app. There is **no runtime wrapper** for Solid; the research is decisive that Solid consumes `u-*` custom elements natively (16/16 on Custom Elements Everywhere). The optional types-only `@universal-material/solid` package is **DEFERRED** (out of scope for phase 2 — a documented follow-up, NOT built now).

---

## Scope (ONE unit only)

Deliver the SolidJS framework-usage surface for `@universal-material/web`:

1. **(Primary — the ONLY active phase-2 deliverable)** A docs page **"Using with SolidJS"** in the web docs app at
   `D:/Projects/universal-material-web/docs/`, covering: the side-effect registration import,
   the **props-vs-attributes heuristic** (`foo={x}` sets the *property* on a `-`-containing tag),
   the two real gotchas — **camelCase keys get lowercased** (use `prop:camelCaseName`) and
   **custom events need `on:exact-event-name`** — the `prop:` / `attr:` / `bool:` directives,
   the explicit two-way `value` pattern with a signal, the per-component value/event contract,
   the optional JSX-types story, and the SSR/Solid-Start client-only caveat.
2. **(DEFERRED — out of scope for phase 2; do NOT build now)**
   A types-only workspace package `packages/solid/` = `@universal-material/solid`
   (`package.json` with a `solid-js` peer, a `src/solid-shims.d.ts` `JSX.IntrinsicElements`
   augmentation, and a README). **Per the locked phase-2 decision, Solid ships a DOCS PAGE ONLY now; the optional types-only package is a documented follow-up, deferred to a later phase.** A cold agent running this task must **NOT** create `packages/solid/`. Part B below is retained only as the spec for that future follow-up — it is **not** part of this task's acceptance.

**This task does NOT:**
- Build a runtime `solid-element` / `defineComponent`-style wrapper package (explicitly rejected —
  `planning/research/solid.md` §"Do you need a wrapper? — No." and §"Official tooling": `solid-element`
  is for *authoring* web components in Solid, not *consuming* ours).
- Touch the web library `src/`, its build pipeline, `dist/`, `skills/`, or `.claude-plugin/`.
- Touch `packages/react`, `packages/angular`, `packages/vue`, or `packages/svelte`.
- Set up Changesets, CI, or release wiring (those are `13-versioning-and-release.md` /
  `14-ci-pipeline.md`).
- Add `vite-plugin-solid` or any Solid build tooling to **this** repo (Solid needs none of the
  Vue-style `isCustomElement` compile config — its JSX compiler handles `-`-containing tags natively;
  any consumer-side build notes are only **documented** here).

---

## Preconditions & Dependencies

This task is **content-only**. Its sole phase-2 deliverable is the docs page (Half A):

- **No hard dependency on `02-monorepo-scaffold.md`.** The docs page has **zero** dependency on the
  workspace. (The deferred `packages/solid/` package — Half B — would have required the workspaces
  skeleton from `02-monorepo-scaffold.md`, but Half B is **out of scope for phase 2**, so this task
  no longer depends on `02` at all.)
- **No dependency** on the React (`07-wrapper-react.md`), Angular (`04-relocate-angular-package.md`),
  Vue (`08-wrapper-vue.md`), or Svelte (`09-wrapper-svelte.md`) tasks. Nothing about Solid's
  deliverable references their code. (If those sibling framework pages land first, **reuse** the
  shared "Frameworks" nav headline and route directory they create — see Step A6 — but Solid does not
  *depend* on them.)
- **Soft dependency:** the web docs app must build/serve (`npm run docs` → :4200). It does today;
  this task only adds one page + one route + one nav item.

Do **Half A** and stop. **Half B (`packages/solid/`) is DEFERRED** — do not build it in phase 2.

---

## Context (enough to execute COLD)

### What @universal-material/web is, mechanically
- `@universal-material/web@3.9.0` (next publish `3.10.0`) is a **pure-ESM** Material 3 Lit
  component library. Components register as custom elements under the **`u-` tag prefix** via
  `@customElement('u-...')`, with an unprefixed PascalCase class (`u-button` → `class Button`,
  `u-select` → `class Select`). The class barrel is `D:/Projects/universal-material-web/src/index.ts`,
  which does side-effect registration imports (e.g. `import './button/button.js'`) then re-exports the
  classes. **Importing `@universal-material/web` once registers every `<u-*>` element** — this is the
  side-effect import Solid consumers need in their app entry (`main.tsx`).
- The published package's types entry exports every component class (e.g. `Button`, `Select`,
  `Checkbox`), which the Solid `JSX.IntrinsicElements` augmentation imports as the element type.
- There are exactly **64** `@customElement('u-...')` declarations across `src/` (verified by grepping
  `@customElement('u-` over `D:/Projects/universal-material-web/src` — 64 occurrences across 64 files).
  The web build also emits a manifest at `D:/Projects/universal-material-web/dist/custom-elements.json`
  (produced by the `analyze` script via `@custom-elements-manifest/analyzer`), which is the codegen
  source for the optional types package.

### Why Solid needs NO runtime wrapper (the decisive research finding)
- Every input-like `u-*` element is a **Form-Associated Custom Element (FACE)**: it sets
  `static formAssociated = true`, calls `attachInternals()`, and pushes value via
  `ElementInternals.setFormValue(...)`. Verified per component in
  `planning/research/form-participation.md` §2 and `planning/current/02-web-form-contracts.md`.
- SolidJS scores a **perfect 16/16** on
  [Custom Elements Everywhere](https://custom-elements-everywhere.com/libraries/solid/results/results.html)
  (0 failures, 0 caveats). Its JSX compiler treats any tag containing a `-` as a **custom element** and
  assigns `foo={x}` as a **JS property** by default (falling back to an attribute only when no such
  property exists) — exactly right for Lit reactive properties, so objects/arrays/numbers survive
  intact with no `JSON.stringify` dance. Native event listening is available via `on:eventname`.
- Therefore the entire Solid deliverable is **documentation** (+ optional ambient JSX types). The
  full how-to, with every gotcha and source link, is `planning/research/solid.md` — **read it before
  writing the page; the page is a distilled, example-driven version of it.**

### The two load-bearing Solid gotchas the docs MUST teach (from `planning/research/solid.md`)
1. **camelCase property keys get lowercased.** Solid's compiler lowercases the *bare* prop key before
   assigning, even on custom elements (it can't statically know the element's property names). So
   `<u-some-thing someProp={x} />` writes `el.someprop = x` and never reaches `someProp`. **Fix:** use
   `prop:someProp={x}` (exact casing preserved) for any camelCase or non-string property. Bare
   `kebab-case="string"` is fine for plain string attributes (Lit maps `some-prop` attribute ↔
   `someProp` property).
2. **Custom events need `on:exact-event-name`.** Solid's delegated `onFoo` handlers cover only a
   built-in set of common DOM events and are case-insensitive/lowercased — they will **not** catch a
   library `CustomEvent`. **Fix:** use `on:` with the **verbatim** dispatch name. `on:` is a native,
   non-delegated, **case-sensitive** `addEventListener` (`on:selection-change` ≠ `on:selectionChange`).

The directive cheat-sheet (Lit-inspired spellings, from research §"Props vs. attributes"):

| Directive | Effect | Use for |
| --- | --- | --- |
| `prop:foo={x}` or `.foo={x}` | force a **JS property** | camelCase props, complex values, disambiguation |
| `attr:foo={x}` | force an **HTML attribute** (string; `null`/`undefined` removes it) | reflected string attrs, SSR-visible attrs |
| `bool:foo={x}` or `?foo={x}` | boolean attribute (present when truthy) | presence-style boolean attrs |

### The exact per-component value/event contract Solid docs must reflect (CORRECTED)
From `planning/current/02-web-form-contracts.md` + `planning/research/form-participation.md` §2.3
(verified against `src/`). Solid has **no two-way sugar** — binding is explicit: write the property in
with `prop:value={signal()}`, read it back out in an event handler. **Critically, the CORRECTED
contract is that value inputs use native `input`/`change` with the value on `e.target.value`** (or
`e.currentTarget.value`) — *not* `e.detail.value`. `on:` is **only mandatory for genuine
`CustomEvent`s** (e.g. `u-typeahead`'s `selected`, `u-chip-field`'s `remove`); native
`input`/`change` are in Solid's delegated set, so `onInput`/`onChange` also work for those.

| Component(s) | Two-way prop (write with `prop:`) | Read value out from | Recommended Solid binding |
| --- | --- | --- | --- |
| `u-text-field`, `u-text-area`, `u-search` | `value: string` | native `input` → `e.target.value` | `prop:value={v()} onInput={e => setV(e.currentTarget.value)}` |
| `u-datepicker`, `u-range-datepicker` | `value: string` (ISO) | `input` + `change` → `e.target.value` | `prop:value` + `onInput`/`onChange` |
| `u-select` | `value: string` (no attribute) + `selectedIndex: number` | user-pick value on `e.target.value`; `input` (composed) + `change` (bubbles, **not** composed) | `prop:value={v()} on:change={e => setV((e.currentTarget as HTMLSelectElement).value)}` |
| `u-checkbox`, `u-switch`, `u-radio` (+ `*-list-item`) | `checked: boolean` | native `input` + `change` → `e.target.checked` | `prop:checked={c()} on:change={e => setC((e.currentTarget as HTMLInputElement).checked)}` |
| `u-slider` | `value: number` (single) OR `valueStart`/`valueEnd: number` (range) | `input` (composed) + `change` (composed) → `e.target.value` (number) | `prop:value={n()} onInput={e => setN(+(e.currentTarget as any).value)}` |
| `u-chip-field` | `value: any[]` | `change` (bubbles, not composed) → `e.target.value`; **`remove` is a real `CustomEvent`** | `prop:value={rows()} on:change={e => setRows((e.currentTarget as any).value)} on:remove={e => …}` |
| `u-typeahead` | `value: any` | `input` (composed) + `change` (not composed); **`selected` is a real `CustomEvent`** | `prop:value={v()} on:input={…}` + `on:selected={e => …}` |
| `u-button-field` | `value: string` (setter) | **none** (display-only, set programmatically) | one-way `prop:value` only; not a form input |
| `u-field` | (no value prop; slots a native control) | the slotted native `<input>`'s events | bind the slotted native `<input>` |

> **Mental model to print verbatim in the page** (distilled from research §"Two-way value binding" and
> §"Events"): **On a `u-*` custom element, two-way `value` ≡ `prop:value={x()}` in +
> `on:input`/`on:change` reading `e.currentTarget.value` out (or `onInput`/`onChange` — native events
> are delegated). Use `prop:camelCaseName` for any camelCase/non-string property. Use
> `on:exact-event-name` (case-sensitive, verbatim) ONLY for genuine `CustomEvent`s — `u-typeahead`'s
> `selected`, `u-chip-field`'s `remove` — which are not in Solid's delegated set.**

### How the web docs app works (where the page slots)
Surface map: `planning/current/03-web-docs-app.md`. Concretely:
- The docs app is Angular 20, standalone, **hash-routed**, served by `npm run docs` on **:4200**.
  Routes: `D:/Projects/universal-material-web/docs/src/app/app.routes.ts`.
- Pages live under `docs/src/app/<section>/<name>/` as a standalone component: `<name>.component.ts`
  (imports `examples/*.html` as **text strings** — `docs/angular.json` registers
  `"loader": { ".html": "text" }`), `<name>.component.html` (uses the `docs-title`, `docs-example`,
  `docs-apis-table` primitives), `<name>.component.scss` (`:host { display: block; }`).
- **Reference page to copy the shape from:**
  `D:/Projects/universal-material-web/docs/src/app/components/badges/badges.component.ts` (a minimal
  page; its template is `badge.component.html`). Its `.ts` imports example HTML strings and assigns
  them to fields; the `.html` feeds them to `<docs-example [html]="usageHtml" ...>`.
- `@docs/*` resolves to `docs/src/app/*` (tsconfig path in `docs/tsconfig.json`); lazy routes use
  `loadComponent: () => import('@docs/...').then(m => m.XComponent)`.
- **The nav is `D:/Projects/universal-material-web/docs/src/app/docs/shell/shell.component.html`**
  (NOTE: it is `shell.component.html`, not `app.component.html` — `CLAUDE.md` still uses the old name).
  Nav items are `<u-navigation-rail-item slot="expanded" routerLink="..." docsLinkActive>` grouped
  under `<u-navigation-rail-headline slot="expanded">…</u-navigation-rail-headline>` headings —
  **Get started, Foundations, Colors, Layout, Components**. Items are **alphabetical within their
  group** by visible label, case-insensitive. The `docsLinkActive` directive
  (`docs/src/app/docs/link-active.directive.ts`) reflects an `active` **attribute** onto the host
  rather than toggling a class.

There is currently **no** `docs/src/app/frameworks/` directory — the Vue task (`08-wrapper-vue.md`)
creates it first. If Vue/React/Svelte landed before Solid, **reuse** that `frameworks/` directory and
the "Frameworks" nav headline; otherwise create them here.

### The optional `packages/solid/` package shape (when workspaces exist)
A types-only sibling to `packages/vue/`, mirroring `08-wrapper-vue.md` Part B:
```
packages/solid/                            # @universal-material/solid (OPTIONAL, types-only)
├── package.json                           # types-only, solid-js peer, no main/module
├── README.md                              # prop:/attr:/bool:, on: rules, contract table, typing snippet
└── src/solid-shims.d.ts                   # JSX.IntrinsicElements augmentation for u-* tags
```
It is **not a runtime package**: no `main`/`module`, only a `types` entry. Changesets simply produces
no changeset for it until it changes. It is so trivial it needs no `tsconfig` unless you choose
`tsc --emitDeclarationOnly`.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web`.
> All file paths are absolute. The docs app is the verification surface at :4200.

### PART A — "Using with SolidJS" docs page (do this regardless of workspaces state)

**A1. Create the example HTML/TSX snippets.** These are **shown as code only** (`[renderExample]="false"`),
since they reference a Solid TSX toolchain that the Angular docs app cannot render live. Create directory
`D:/Projects/universal-material-web/docs/src/app/frameworks/solid/examples/` with these files (verbatim
content distilled from `planning/research/solid.md` — do **not** invent API):

- `main-import.html` — the side-effect registration import:
  ```tsx
  // main.tsx — side-effecting import registers all <u-*> via customElements.define
  import '@universal-material/web'
  import { render } from 'solid-js/web'
  import App from './App'

  render(() => <App />, document.getElementById('root')!)
  ```
- `props-vs-attrs.html` — the heuristic + directive cheat-sheet (research §"Props vs. attributes"):
  bare `foo={x}` sets the property on a `-`-tag; `prop:`/`.` force a property, `attr:` forces an
  attribute, `bool:`/`?` a boolean attribute. Include the GOTCHA #1 camelCase-lowercasing note:
  ```tsx
  // WRONG — Solid writes el.someprop = x (lowercased) → never reaches someProp
  <u-some-thing someProp={obj} />
  // RIGHT — exact casing preserved for camelCase / non-string properties
  <u-some-thing prop:someProp={obj} />
  // plain string attribute — bare kebab-case is fine (Lit maps it to the property)
  <u-button variant="filled" />
  ```
- `events.html` — GOTCHA #2 + the corrected contract: native `input`/`change` work via delegated
  `onInput`/`onChange`, but genuine `CustomEvent`s need `on:exact-name`:
  ```tsx
  // Native input/change ARE delegated — onInput/onChange work, value on currentTarget.value
  <u-text-field onInput={e => setText((e.currentTarget as HTMLInputElement).value)} />
  // u-select user-pick value is on target.value; change is not composed → bind on the element
  <u-select on:change={e => setChoice((e.currentTarget as HTMLSelectElement).value)} />
  // Genuine CustomEvents need on: with the EXACT name (NOT delegated, case-sensitive):
  <u-typeahead on:selected={e => pick(e.detail)} />
  <u-chip-field on:remove={e => removeRow(e.detail)} />
  ```
- `two-way.html` — the explicit signal two-way pattern (research §"Two-way value binding" / §"Sketch"):
  ```tsx
  import { createSignal } from 'solid-js'

  export default function App() {
    const [value, setValue] = createSignal('a')
    return (
      <u-select
        prop:value={value()}
        on:change={e => setValue((e.currentTarget as HTMLSelectElement).value)}
      >
        <u-option value="a">A</u-option>
        <u-option value="b">B</u-option>
      </u-select>
    )
  }
  ```
- `typescript.html` — the optional `JSX.IntrinsicElements` augmentation (research §"Sketch" step 2),
  importing element classes from `@universal-material/web`:
  ```tsx
  // solid-shims.d.ts
  import type { JSX } from 'solid-js'

  type SolidProps<T> = Partial<{ [K in keyof T as `prop:${string & K}`]: T[K] }> &
    JSX.HTMLAttributes<T> & {
      // u-* value inputs fire native input/change (value on target.value);
      // add on:<exact-name> ONLY for genuine CustomEvents (e.g. u-typeahead `selected`).
      'on:input'?: (e: Event) => void
      'on:change'?: (e: Event) => void
    }

  declare module 'solid-js' {
    namespace JSX {
      interface IntrinsicElements {
        'u-button': SolidProps<import('@universal-material/web').Button>
        'u-select': SolidProps<import('@universal-material/web').Select>
        // …one entry per <u-*> element, ideally code-generated from the manifest
      }
    }
  }
  ```

> Keep snippets faithful to `planning/research/solid.md`. Where the research's illustrative sketch
> used `e.detail` for *value* inputs, **prefer `e.currentTarget.value` / `e.target.value`** per the
> CORRECTED contract above (`u-select`/`u-text-field`/etc. expose value on the element/native input;
> `e.detail` is reserved for genuine `CustomEvent`s like `selected`/`remove`).

**A2. Create the page component**
`D:/Projects/universal-material-web/docs/src/app/frameworks/solid/solid.component.ts`:
```ts
import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import mainImportHtml from './examples/main-import.html';
import propsVsAttrsHtml from './examples/props-vs-attrs.html';
import eventsHtml from './examples/events.html';
import twoWayHtml from './examples/two-way.html';
import typescriptHtml from './examples/typescript.html';

@Component({
  selector: 'docs-solid',
  templateUrl: './solid.component.html',
  styleUrl: './solid.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class SolidComponent {
  mainImportHtml = mainImportHtml;
  propsVsAttrsHtml = propsVsAttrsHtml;
  eventsHtml = eventsHtml;
  twoWayHtml = twoWayHtml;
  typescriptHtml = typescriptHtml;
}
```

**A3. Create the page template**
`D:/Projects/universal-material-web/docs/src/app/frameworks/solid/solid.component.html`. Use
`<docs-title kind="foundation" title="Using with SolidJS">` (a "Get started"/foundation kind, not a
component) with an intro `<ng-content>`-style description, then a series of
`<docs-example [renderExample]="false" [html]="..." sectionTitle="...">` blocks with prose. **Set
`[renderExample]="false"`** on every example (the snippets are TSX, not live-renderable Angular HTML —
the Angular docs app cannot execute Solid). Sections, in order:
1. Intro prose: Solid consumes `u-*` natively (16/16 on Custom Elements Everywhere); documentation-only;
   **no runtime wrapper** (and `solid-element` is the wrong tool — it's for *authoring* web components).
2. "Register the components" → `mainImportHtml`. Note the bare side-effecting `import` must not be
   tree-shaken (it has side effects, so it won't be).
3. "Props vs. attributes (and the camelCase gotcha)" → `propsVsAttrsHtml` + the directive cheat-sheet
   table (render the `prop:`/`attr:`/`bool:` table from this doc's Context as HTML in the prose) + the
   "camelCase keys get lowercased → use `prop:camelCaseName`" rule.
4. "Listening to events" → `eventsHtml` + the GOTCHA #2 one-liner (custom events need `on:exact-name`,
   case-sensitive; native `input`/`change` are delegated so `onInput`/`onChange` also work). Note
   shadow-DOM events must be `composed: true` to escape (ours are).
5. "Two-way `value` binding" → `twoWayHtml` + the mental-model one-liner + the per-component value/event
   contract table (render the CORRECTED table from this doc's Context as HTML in the prose).
6. "TypeScript typing (optional)" → `typescriptHtml` + a note that the augmentation can be hand-written
   or code-generated from `dist/custom-elements.json`, and (if Half B ships) is published as
   `@universal-material/solid`.
7. "SSR / Solid Start" → short prose: register client-side only; `customElements` is undefined on the
   server, so guard the registration import (Solid Start: import in a client-only entry / under an
   `isServer` guard). Mirrors research §Gotchas.

**A4. Create the page styles**
`D:/Projects/universal-material-web/docs/src/app/frameworks/solid/solid.component.scss`:
```scss
:host {
  display: block;
}
```

**A5. Register the route** in
`D:/Projects/universal-material-web/docs/src/app/app.routes.ts`, inside the `DocsShellComponent`
`children` array (the `path: ''` block), near the other framework siblings if present:
```ts
{
  path: 'frameworks/solid',
  loadComponent: () => import('@docs/frameworks/solid/solid.component').then(m => m.SolidComponent)
},
```

**A6. Add the nav item** in
`D:/Projects/universal-material-web/docs/src/app/docs/shell/shell.component.html`. If a
**`<u-navigation-rail-headline slot="expanded">Frameworks</u-navigation-rail-headline>` group** already
exists (added by the Vue/React/Svelte tasks), reuse it and place "SolidJS" **alphabetically** (React,
**SolidJS**, Svelte, Vue). Otherwise add the "Frameworks" headline group (after "Get started" /
"Foundations"). The item:
```html
<u-navigation-rail-item slot="expanded"
  routerLink="frameworks/solid"
  docsLinkActive
  >SolidJS
  <span class="material-symbols-outlined" slot="icon">deployed_code</span>
</u-navigation-rail-item>
```
(Choose any sensible Material Symbol; `deployed_code` is a reasonable "framework" glyph and matches the
Vue task's choice for visual consistency.)

**A7. Do NOT run `gulp docs:apis`.** This page documents framework usage, not a single component's API,
so a `<docs-apis-table key="...">` is **not** appropriate (it keys off a single lowercased class name).
Render the per-component value/event contract table as plain HTML in the template (step A3.5). There is
no new component class, so `apis.ts` does not change.

### PART B — DEFERRED (out of scope for phase 2): types-only package `packages/solid/`

> **DO NOT DO PART B IN PHASE 2.** Per the locked decision, Solid ships a **docs page only** now; the
> optional types-only `@universal-material/solid` package is a **documented follow-up, deferred to a
> later phase.** A cold agent running task 10 must **NOT** create `packages/solid/`. The steps below
> are preserved verbatim **only as the future follow-up spec** — they are not part of this task's
> acceptance and should be skipped entirely.

**B1. Create `D:/Projects/universal-material-web/packages/solid/package.json`** (mirrors
`08-wrapper-vue.md` Part B; types-only, `0.1.0`):
```jsonc
{
  "name": "@universal-material/solid",
  "version": "0.1.0",
  "description": "TypeScript JSX.IntrinsicElements typings for using @universal-material/web with SolidJS.",
  "license": "MIT",
  "types": "./src/solid-shims.d.ts",
  "exports": {
    ".": { "types": "./src/solid-shims.d.ts" }
  },
  "files": ["src", "README.md"],
  "peerDependencies": {
    "@universal-material/web": "^3.10.0",
    "solid-js": "^1"
  }
}
```
- **No `main`/`module`** (no runtime JS). **No `build` script** (hand-authored `.d.ts`). If you prefer
  generating from the manifest, add `"scripts": { "build": "node scripts/gen.mjs" }` reading
  `../../dist/custom-elements.json` — but the hand-authored `.d.ts` is the recommended phase-1 path
  (one `JSX.IntrinsicElements` entry per `@customElement`).

**B2. Create `D:/Projects/universal-material-web/packages/solid/src/solid-shims.d.ts`** — the
`JSX.IntrinsicElements` augmentation. Start from the `SolidProps<>` helper in `examples/typescript.html`
(step A1) and add **one entry per `u-*` element**. Generate the element list from the web library's
`@customElement` decls (**64** declarations across `src/`) — read them out of
`D:/Projects/universal-material-web/dist/custom-elements.json` (or grep `@customElement('u-` over `src/`)
so the list is complete and the imported class names match `src/index.ts`'s re-exports. For the genuine
`CustomEvent` emitters, type the extra handlers (`u-typeahead` → `'on:selected'`, `u-chip-field` →
`'on:remove'`). Skeleton:
```ts
import type { JSX } from 'solid-js'
import type { Button, Select, Checkbox, Typeahead, ChipField /* …all classes… */ } from '@universal-material/web'

type SolidProps<T> = Partial<{ [K in keyof T as `prop:${string & K}`]: T[K] }> &
  JSX.HTMLAttributes<T> & {
    'on:input'?: (e: Event) => void
    'on:change'?: (e: Event) => void
  }

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'u-button': SolidProps<Button>
      'u-select': SolidProps<Select>
      'u-checkbox': SolidProps<Checkbox>
      'u-typeahead': SolidProps<Typeahead> & { 'on:selected'?: (e: CustomEvent) => void }
      'u-chip-field': SolidProps<ChipField> & { 'on:remove'?: (e: CustomEvent) => void }
      // …one entry per <u-*> element (64 total)…
    }
  }
}

export {}
```

**B3. Create `D:/Projects/universal-material-web/packages/solid/README.md`** — a condensed version of
the docs page (the side-effect import, the `prop:`/`attr:`/`bool:` directive rules + camelCase gotcha,
the `on:exact-event-name` custom-event rule, the per-component contract table, the typing import).
Cross-link the live docs page → "Using with SolidJS". This README is what npm renders.

**B4. Install + verify the workspace picks it up:**
```powershell
npm install
```
Confirm `node_modules/@universal-material/solid` is a symlink to `packages/solid`.

---

## Acceptance criteria

**Part A (docs page) — required:**
1. Navigating to `http://localhost:4200/#/frameworks/solid` renders the "Using with SolidJS" page with
   all sections (register import, props-vs-attributes + camelCase gotcha, events + `on:` gotcha, two-way
   `value`, TypeScript, SSR/Solid Start).
2. The page appears in the left nav (a "SolidJS" `u-navigation-rail-item`, alphabetically placed within a
   shared "Frameworks" group) and `docsLinkActive` highlights it when active.
3. Every code snippet is **syntax-highlighted and shown** (not live-rendered: `[renderExample]="false"`),
   with no broken `innerHTML`-rendered TSX in the preview area.
4. The page accurately states: **no runtime wrapper** (and `solid-element` is for authoring, not
   consuming); the props-vs-attributes heuristic; **camelCase keys get lowercased → use
   `prop:camelCaseName`**; **custom events need `on:exact-event-name`** (case-sensitive, verbatim) while
   native `input`/`change` work via delegated `onInput`/`onChange` with value on `e.target.value`; the
   per-component contract (checkbox/switch/radio read `e.target.checked`; `u-typeahead`'s `selected` and
   `u-chip-field`'s `remove` are genuine `CustomEvent`s needing `on:`; `u-button-field` is display-only).
5. The docs app builds clean: `cd docs ; npx ng build --configuration development` succeeds with the new
   route/component.
6. No web `src/`, `dist/`, `skills/`, or `.claude-plugin/` files changed.

**Part B (types-only package) — DEFERRED, NOT part of phase-2 acceptance:**
Part B is **out of scope for phase 2** (locked decision: Solid ships a docs page only now). A phase-2
run must **not** create `packages/solid/`, and criteria 7–10 below do **not** apply. They are retained
solely as the acceptance spec for the future follow-up that ships the optional types package; verify
them only if/when that follow-up is greenlit.
7. *(follow-up only)* `packages/solid/package.json` declares `@universal-material/solid@0.1.0`, types-only (no
   `main`/`module`), `solid-js ^1` + `@universal-material/web ^3.10.0` peers.
8. *(follow-up only)* `packages/solid/src/solid-shims.d.ts` augments `solid-js`'s `JSX.IntrinsicElements` with **one entry
   per `u-*` element** (all 64 `@customElement` tags), importing classes that actually exist in the web
   library's type exports (matches `src/index.ts` re-exports), with `on:selected` typed on `u-typeahead`
   and `on:remove` typed on `u-chip-field`.
9. *(follow-up only)* `npm install` at root symlinks `node_modules/@universal-material/solid`.
10. *(follow-up only)* A throwaway type-check (see Verification V5) of a `.tsx`-shaped consumer resolves `<u-button>` /
    `<u-select>` etc. as typed intrinsic elements (no "JSX element type has no construct/call signature"
    or "Property does not exist on JSX.IntrinsicElements" error).

---

## Verification commands

> Run from `D:/Projects/universal-material-web` unless noted (PowerShell on Windows). The dev server
> (`npm run docs`) is usually already running on :4200 — do **not** restart it unless asked.

**V1 — docs page route + component compile (Part A):**
```powershell
cd docs ; npx ng build --configuration development
```
Expect success and no unresolved `@docs/frameworks/solid/solid.component` import.

**V2 — visual check at :4200 (Part A):** open `http://localhost:4200/#/frameworks/solid` in the
connected browser (`mcp__Claude_in_Chrome__navigate` then `get_page_text`). Confirm all sections render,
code blocks are highlighted, and the nav item is present and highlights when active. (Per `CLAUDE.md`
cardinal rule: visually evaluate, don't trust the build alone.)

**V3 — example files are valid text imports (Part A):**
```powershell
Get-ChildItem docs/src/app/frameworks/solid/examples
```
Expect: `main-import.html`, `props-vs-attrs.html`, `events.html`, `two-way.html`, `typescript.html` — all
referenced in `solid.component.ts`.

**V4 — package identity (Part B):**
```powershell
node -e "const p=require('./packages/solid/package.json'); console.log(p.name, p.version, 'types='+p.types, 'main='+(p.main??'(none)'))"
# expect: @universal-material/solid 0.1.0 types=./src/solid-shims.d.ts main=(none)
npm ls @universal-material/solid   # shows the workspace symlink
```

**V5 — types augmentation resolves (Part B):** create a throwaway
`packages/solid/_typecheck.tsx` with `import './src/solid-shims';` and a small JSX block using a
`u-*` tag (e.g. `<u-button variant="filled" />` and `<u-select prop:value={'a'} />`), then
`npx tsc --noEmit --jsx preserve --jsxImportSource solid-js packages/solid/_typecheck.tsx`; delete the
throwaway after. Expect the augmentation to compile against `@universal-material/web`'s exported classes.

**V6 — web library untouched:**
```powershell
git status --porcelain src dist skills .claude-plugin
# expect: no output (nothing changed under those paths)
```

---

## Rollback notes

- **Part A is fully additive and isolated** to `docs/`. To roll back: delete
  `docs/src/app/frameworks/solid/` (and `docs/src/app/frameworks/` if no sibling framework page exists),
  revert the single route entry in `docs/src/app/app.routes.ts`, and revert the nav-item (and
  "Frameworks" headline, if you added it) in `docs/src/app/docs/shell/shell.component.html`. No build
  artifacts, no generated files (`apis.ts` is **not** regenerated for this page).
  `git checkout -- docs/src/app/app.routes.ts docs/src/app/docs/shell/shell.component.html` +
  `Remove-Item -Recurse docs/src/app/frameworks/solid` reverses everything.
- **Part B is fully additive** under `packages/solid/`. To roll back: `Remove-Item -Recurse
  packages/solid`, then `npm install` to drop the symlink. No other package references
  `@universal-material/solid` (it is consumer-facing only), so removal cannot break the web, Angular,
  React, Vue, or Svelte builds.
- Neither part modifies the web build pipeline, `dist/`, the postinstall patch, or any published web
  contract — so there is no publish-time or runtime regression risk for existing consumers.

---

## Parallelizable in worktree? **yes** — why

This task is **content-only and touches a disjoint file set**: `docs/src/app/frameworks/solid/**`
(new) plus two surgical additions to `docs/src/app/app.routes.ts` and
`docs/src/app/docs/shell/shell.component.html`. It does **not** modify the web library `src/`, the
build pipeline, `dist/`, `skills/`, `.claude-plugin/`, or any package — and in phase 2 it creates
**no** `packages/solid/` directory at all (Part B is **deferred**, out of scope). The only shared
files it edits (the docs routes file and shell template) take **append-only** edits — a new route
object and a new nav item — which conflict trivially-resolvably with the sibling framework tasks
(React `07`, Vue `08`, Svelte `09`) that append their own entries to the same two files; coordinate
the "Frameworks" headline once and the rest is independent. No build-order coupling: Solid has **no
runtime wrapper** to compile, so it never blocks or is blocked by the web → wrapper build chain. (It
is also flagged **STRETCH/optional**, so it can be dropped entirely without affecting any other task.
If the deferred Part B is ever greenlit as a follow-up, its `packages/solid/` work needs the
`02-monorepo-scaffold.md` workspaces skeleton present — a precondition, not a parallel-write conflict —
and creates files nobody else writes.)
