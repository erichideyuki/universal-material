# Task 09 — Svelte usage docs page ("Using with Svelte")

> **Status:** ready to implement. **Phase-2 deliverable = the docs page ONLY.**
> **Architecture authority:** `planning/architecture/00-decision.md` §5, §11.3; `planning/architecture/01-package-layout.md` §1, §3.4; `planning/research/svelte.md` (the full how-to); `planning/research/form-participation.md` §2.3, §5 (the corrected value/event contract).
> **One-line scope:** Produce the *Svelte* consumption deliverable for phase 2 — a "Using with Svelte" docs page in the web docs app. There is **no runtime wrapper** for Svelte; the research is decisive that Svelte 4 and Svelte 5 consume `u-*` custom elements natively (Svelte has the *best* out-of-the-box custom-element support of any target framework). The optional types-only `@universal-material/svelte` package is **DEFERRED** (out of scope for phase 2 — a documented follow-up, NOT built now).

---

## Scope (ONE unit only)

Deliver the Svelte framework-usage surface for `@universal-material/web`:

1. **(Primary — the ONLY active phase-2 deliverable)** A docs page **"Using with Svelte"** in the web docs app at
   `D:/Projects/universal-material-web/docs/`, covering: the eager **side-effect import**
   (client-only in SvelteKit), the **prop-in / event-out** pattern (`on:input` / `on:change`
   reading `e.target.value` / `e.target.checked`), the **`bind:value` limitation** on custom
   elements + the thin `.svelte` wrapper escape hatch, the `prop in node` property/attribute
   heuristic + upgrade-timing gotcha, TypeScript typing via `svelte/elements`
   (`SvelteHTMLElements`), and the SvelteKit SSR client-only guard.
2. **(DEFERRED — out of scope for phase 2; do NOT build now)** A types-only
   workspace package `packages/svelte/` = `@universal-material/svelte` (`package.json` with
   a `svelte` peer, a `src/svelte.d.ts` `SvelteHTMLElements` augmentation, and a README). **Per the locked phase-2 decision, Svelte ships a DOCS PAGE ONLY now; the optional types-only package is a documented follow-up, deferred to a later phase.** A cold agent running this task must **NOT** create `packages/svelte/`. Part B below is retained only as the spec for that future follow-up — it is **not** part of this task's acceptance.

**This task does NOT:**
- Build a runtime wrapper package or ship the optional thin `.svelte` `bind:value` wrappers as
  a published artifact (they are *documented* as a consumer escape hatch, not shipped — see
  research §"Recovering a `bind:`-like ergonomic"). The library never enables the Svelte
  compiler's `customElement: true` option (that is for *authoring* Svelte custom elements, not
  *consuming* ours — research §"Build tooling").
- Touch the web library `src/`, its build pipeline, `dist/`, `skills/`, or `.claude-plugin/`.
- Touch `packages/react`, `packages/angular`, `packages/vue`, or `packages/solid`.
- Set up Changesets, CI, or release wiring (those are the monorepo-foundation tasks).
- Add `@sveltejs/vite-plugin-svelte` or any Svelte build tooling to **this** repo (Svelte
  needs **no** build config to consume `u-*` — there is nothing to add; it is only documented
  here that none is required).

---

## Preconditions & Dependencies

This task is **content-only**. Its sole phase-2 deliverable is the docs page (Part A):

- **No hard dependency on `02-monorepo-scaffold.md`.** The docs page has **zero** dependency on
  the workspace. (The deferred `packages/svelte/` package — Part B — would have required the
  workspaces skeleton from `02-monorepo-scaffold.md`, but Part B is **out of scope for phase 2**,
  so this task no longer depends on `02` at all.)
- **No dependency** on the Angular, React, Vue, or Solid tasks (`03`/`04`, `07`, `08`, `10`).
  Nothing about Svelte's deliverable references their code. (`08-wrapper-vue.md` is the
  *structural exemplar* this task mirrors, not a build dependency.)
- **Soft dependency:** the web docs app must build/serve (`npm run docs` → :4200). It does
  today; this task only adds one page + one route + one nav item.

Do **Part A** and stop. **Part B (`packages/svelte/`) is DEFERRED** — do not build it in phase 2.

---

## Context (enough to execute COLD)

A fresh agent with zero chat memory can run this from the facts below. All paths are absolute
under `D:/Projects/universal-material-web` (this repo) unless noted.

### What @universal-material/web is, mechanically
- `@universal-material/web@3.9.0` (next publish `3.10.0`) is a **pure-ESM** Material 3 Lit
  component library. Components register as custom elements under the **`u-` tag prefix**
  via `@customElement('u-...')`, with an unprefixed PascalCase class
  (`u-button` → `class Button`, `u-select` → `class Select`). The class barrel is
  `D:/Projects/universal-material-web/src/index.ts`, which does side-effect registration
  imports (e.g. `import './button/button.js'`) then re-exports the classes. **Importing
  `@universal-material/web` once registers every `<u-*>` element** — this is the eager
  side-effect import Svelte consumers need in their entry / root `+layout`.
- There are exactly **64** `@customElement('u-*')` declarations across `src/` (verified by
  grepping `@customElement('u-` over `src/`). The published package's types entry re-exports
  every component class (e.g. `Button`, `Select`, `Checkbox`), which the optional Svelte
  ambient `.d.ts` can import as the element type.

### Why Svelte needs NO runtime wrapper (the decisive research finding)
Full how-to with every gotcha and source link: `planning/research/svelte.md` — **read it
before writing the page; the page is a distilled, example-driven version of it.** Summary:
- Every input-like `u-*` element is a **Form-Associated Custom Element (FACE)**: it sets
  `static formAssociated = true`, calls `attachInternals()`, and pushes value via
  `ElementInternals.setFormValue(...)`. Verified per component in
  `planning/research/form-participation.md` §2 and `planning/current/02-web-form-contracts.md`.
  So **value submission + constraint validation are free** inside a real `<form>` — Svelte
  renders real DOM `<form>` elements, so it gets this with zero adapter code.
- **Props vs attributes is automatic** in Svelte via the `prop in node` heuristic: if a JS
  property with that name exists on the *live element instance*, Svelte assigns the
  **property** (so `value`/`checked` reach the IDL setters; objects/arrays/`Date` pass by
  reference, no `JSON.stringify`); otherwise it sets an **attribute**.
- **Events use `on:eventname`**, which compiles to `addEventListener('eventname', …)` and
  works for any event name (`input`, `change`, `remove`, `selected`, `open`, `close`).
- Therefore the entire Svelte deliverable is **documentation** (+ optional ambient types).

### The CORRECTED per-component value/event contract the docs MUST reflect
From `planning/research/form-participation.md` §2.3 and §5, verified against `src/`. **This is
the load-bearing correction: read the value off the EVENT TARGET, not `e.detail`.** The
research's `svelte.md` bind sketch uses `e.target.value` for `u-field`/`u-text-field` (correct),
but for some examples it illustratively reads `e.detail` (e.g. `on:selected={(e) => pick(e.detail)}`).
For the **value/change contract**, the canonical, verified rule is:

> **Read the value from `e.target.value` (text/select/slider) or `e.target.checked`
> (checkbox/switch/radio) — NOT `e.detail.value`.** `e.detail` only carries a payload for the
> few genuine `CustomEvent`s like `u-typeahead`'s `selected` and `u-chip`'s `remove`; the
> form value itself always lives on the element's own IDL property surfaced at `e.target`.

| Component(s) | Two-way prop | Live event (where value lives) | Recommended Svelte read-back |
| --- | --- | --- | --- |
| `u-text-field`, `u-text-area`, `u-search` | `value: string` | native `input` (bubbles + composed); also `change` | `on:input={(e) => v = e.target.value}` |
| `u-datepicker`, `u-range-datepicker` | `value: string` (ISO) | host re-dispatches `input` (composed) + `change` | `on:change={(e) => v = e.target.value}` |
| `u-select` | `value: string` (+ `selectedIndex`) | `input` (composed) + `change` (bubbles, **not** composed) | `on:input={(e) => v = e.target.value}` (bind on the element; `change` is not composed) |
| `u-checkbox`, `u-switch`, `u-radio` (+ `*-list-item`) | `checked: boolean` | `change` re-dispatched (native parity, **not** composed) | `on:change={(e) => on = e.target.checked}` (read **`.checked`**, not `.value`) |
| `u-slider` | `value: number` (single) / `valueStart`+`valueEnd` (range) | `input` (bubbles + composed) + `change` (bubbles + composed) | `on:input={(e) => n = e.target.value}` (single); explicit for range |
| `u-chip-field` | `value: any[]` | `change` (bubbles, not composed); `input` while typing | `on:change={(e) => rows = e.target.value}` (array) |
| `u-typeahead` | `value: any` | `input` (composed) + `change` + `selected` (`CustomEvent` w/ `detail`) | `on:input`/`on:change` for value via `e.target.value`; `on:selected={(e) => pick(e.detail)}` for the pick payload |
| `u-button-field` | `value: string` (setter, display-only) | **none** (set programmatically) | one-way `{value}` prop only; not a value-emitting input |
| `u-chip` | (UI affordance, not a field) | `change`, `remove` (`CustomEvent`) | `on:remove={(e) => removeChip(e)}` — read `e.detail` for the payload |
| `u-field` | (no value prop; slots a native control) | none of its own | bind the slotted native `<input>` |

> **Mental model to print verbatim in the page** (from `svelte.md` §"bind:value support"):
> **`bind:value` does NOT work on third-party custom elements.** It is reserved for native
> form elements and Svelte components. On a `u-*` element, write the value as a normal prop
> (`{value}` / `value={x}`) and read changes back with `on:input` / `on:change` off
> `e.target.value` (or `.checked`). To recover a true `bind:value`, wrap once in a thin
> `.svelte` component (`bind:` *does* work on Svelte components — see the escape hatch below).

### Two gotchas the page must call out (from `svelte.md` §"How Svelte binds…" + §Gotchas)
1. **Upgrade timing.** The `prop in node` heuristic reads the live instance, so the element
   must already be **defined** (`customElements.define` has run) when Svelte sets data.
   Otherwise `prop in node` is `false` and Svelte silently sets an **attribute**, mangling
   objects into `[object Object]`. **Fix: import/register the library eagerly** (top-level /
   root-layout side-effect import), or set objects via `bind:this` + `$effect` (Svelte 5) /
   `onMount` (Svelte 4), or a `use:setProperties` action.
2. **SSR (SvelteKit) breaks on a top-level import** — `customElements` / `HTMLElement` are
   browser-only; a server-side top-level `import '@universal-material/web'` throws
   `HTMLElement is not defined`. **Fix: import client-side only** — inside `onMount`, or guard
   with `import { browser } from '$app/environment'; if (browser) await import('@universal-material/web');`,
   or `export const ssr = false;` on the page as a last resort.

### The thin `.svelte` `bind:value` escape hatch (documented, not shipped)
From `svelte.md` §"Recovering a `bind:`-like ergonomic" — a consumer-side convenience the page
documents (it is **not** a published package artifact):
```svelte
<!-- UField.svelte (in the consumer app) -->
<script lang="ts">
  export let value = '';
</script>
<u-field {value} on:input={(e) => (value = (e.target as HTMLInputElement).value)} {...$$restProps}>
  <slot />
</u-field>

<!-- App.svelte -->
<UField bind:value={name} />   <!-- bind: works because UField is a Svelte component -->
```

### TypeScript typing (the only "tooling" artifact)
From `svelte.md` §"Typing custom elements in Svelte" — augment `svelte/elements`'
`SvelteHTMLElements` interface (the modern, recommended approach; `svelteHTML.IntrinsicElements`
is the older alternative). One entry per `u-*` tag. Without it, `<u-field>` still **renders and
works** — you just lose attribute/event autocompletion and get "unknown element" type noise. So
typing is DX sugar, not a correctness requirement.

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
- The nav is `docs/src/app/docs/shell/shell.component.html`. Items are
  `<u-navigation-rail-item slot="expanded" routerLink="..." docsLinkActive>` grouped under
  `<u-navigation-rail-headline slot="expanded">…</u-navigation-rail-headline>` headings.
  Verified line numbers: **Get started** (headline L176, "Installation" → `routerLink=""`,
  `[routerLinkActiveOptions]="{ exact: true }"`), **Foundations** (L189), **Colors** (L201),
  **Layout** (L243), **Components** (L285). Items are **alphabetical within their group** by
  visible label, case-insensitive.
- `@docs/*` resolves to `docs/src/app/*` (tsconfig path); lazy routes use
  `loadComponent: () => import('@docs/...').then(m => m.XComponent)`. In `app.routes.ts` the
  shell children live in the `path: ''` block (the `DocsShellComponent` `children` array,
  which begins at ~line 56).

There is currently **no** `docs/src/app/frameworks/` directory — the framework-usage section
is new. The sibling Vue task (`08-wrapper-vue.md`) creates `docs/src/app/frameworks/vue/` and a
**"Frameworks"** `<u-navigation-rail-headline>`. **If that headline already exists when you
run, REUSE it** and keep items alphabetical (React, Solid, **Svelte**, Vue → Svelte sits
before Vue). If it does not exist yet, create the "Frameworks" headline group (place it after
"Get started"). Either way the edits to the two shared files (`app.routes.ts`,
`shell.component.html`) are **append-only** and conflict trivially-resolvably with the sibling
framework tasks.

### The optional `packages/svelte/` package shape (when workspaces exist)
From `planning/architecture/01-package-layout.md` §1 and §3.4:
```
packages/svelte/                           # @universal-material/svelte (OPTIONAL, types-only)
├── package.json                           # §3.4 — types-only, svelte peer, no main/module
├── README.md                              # eager registration, bind:value recipe, typing
└── src/svelte.d.ts                         # SvelteHTMLElements augmentation for u-* tags
```
It is **not a runtime package**: no `main`/`module`, only a `types` entry. Per §3.4 the Svelte
peer is `"svelte": "^4 || ^5"`. The `.changeset` config has `"ignore": []` and Changesets
simply produces no changeset for it until it changes. This package is trivial enough to need no
`tsconfig` unless you choose `tsc --emitDeclarationOnly`.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web`.
> All file paths are absolute. The docs app is the verification surface at :4200.

### PART A — "Using with Svelte" docs page (do this regardless of workspaces state)

**A1. Create the example HTML snippets** (these are *shown as code only* — they reference a
Svelte toolchain the Angular docs app cannot render live). Create directory
`D:/Projects/universal-material-web/docs/src/app/frameworks/svelte/examples/` and these files
(verbatim content distilled from `planning/research/svelte.md` — keep snippets faithful, do not
invent API):

- `register.html` — the eager, client-only side-effect import (SvelteKit-safe):
  ```ts
  // src/routes/+layout.ts (SvelteKit) — register once, client-only
  import { browser } from '$app/environment'

  if (browser) {
    // registers every <u-*> custom element
    await import('@universal-material/web')
  }
  ```
  Add a second variant comment for a plain Vite SPA (top-level import is fine there):
  ```ts
  // src/main.ts (plain Vite SPA — no SSR, top-level is safe)
  import '@universal-material/web'
  ```
- `binding.html` — prop-in / event-out, the four read-back cases off `e.target` (NOT
  `e.detail`), including the checkbox `.checked` case:
  ```svelte
  <script lang="ts">
    // Svelte 5 runes (Svelte 4: `let name = ''` / `let agreed = false`)
    let name = $state('')
    let agreed = $state(false)
  </script>

  <!-- WRITE: value flows in as a property; READ: e.target.value (NOT e.detail) -->
  <u-text-field
    value={name}
    on:input={(e) => (name = (e.target as HTMLInputElement).value)}
  />

  <!-- checkbox/switch/radio read e.target.CHECKED, not .value -->
  <u-checkbox
    checked={agreed}
    on:change={(e) => (agreed = (e.target as HTMLInputElement).checked)}
  />

  <!-- u-select: value lives on e.target.value; change is not composed, so bind on the element -->
  <u-select value={name} on:input={(e) => (name = (e.target as HTMLSelectElement).value)}>
    <u-option value="a">A</u-option>
    <u-option value="b">B</u-option>
  </u-select>

  <!-- genuine CustomEvent payloads DO live on e.detail -->
  <u-typeahead value={name} on:selected={(e) => (name = e.detail)} />
  ```
- `bind-value.html` — the `bind:value` limitation + the thin `.svelte` wrapper escape hatch
  (the two snippets from the Context "escape hatch" section: `UField.svelte` exporting `value`,
  then `<UField bind:value={name} />`). Lead with a comment:
  `<!-- bind:value does NOT work on u-* custom elements; wrap once to recover it -->`.
- `objects.html` — the upgrade-timing gotcha + forcing a property via `bind:this` + `$effect`
  (Svelte 5) / `onMount` (Svelte 4), and the `use:setProperties` action from `svelte.md`
  §"Forcing property vs attribute":
  ```svelte
  <script>
    // Always assign as a JS property, bypassing the prop-in-node heuristic
    function setProperties(node, props) {
      const apply = () => Object.entries(props).forEach(([k, v]) => (node[k] = v))
      apply()
      return { update(next) { props = next; apply() } }
    }
  </script>

  <u-typeahead use:setProperties={{ items: ['Amy', 'Bill'], value: selected }} />
  ```
- `typescript.html` — the `svelte/elements` `SvelteHTMLElements` augmentation (research
  §"Option A"), one entry per `u-*` element (show 2–3 representative entries + a `// … one
  entry per u-* element` comment):
  ```ts
  // src/universal-material-web.d.ts (in the consumer app, or shipped via @universal-material/svelte)
  import type { HTMLAttributes } from 'svelte/elements'

  declare module 'svelte/elements' {
    export interface SvelteHTMLElements {
      'u-button': HTMLAttributes<HTMLElement> & {
        variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated'
        disabled?: boolean
      }
      'u-text-field': HTMLAttributes<HTMLElement> & {
        value?: string
        label?: string
        'on:input'?: (e: InputEvent) => void
        'on:change'?: (e: Event) => void
      }
      // … one entry per u-* element
    }
  }

  export {}
  ```

**A2. Create the page component**
`D:/Projects/universal-material-web/docs/src/app/frameworks/svelte/svelte.component.ts`:
```ts
import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import registerHtml from './examples/register.html';
import bindingHtml from './examples/binding.html';
import bindValueHtml from './examples/bind-value.html';
import objectsHtml from './examples/objects.html';
import typescriptHtml from './examples/typescript.html';

@Component({
  selector: 'docs-svelte',
  templateUrl: './svelte.component.html',
  styleUrl: './svelte.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class SvelteComponent {
  registerHtml = registerHtml;
  bindingHtml = bindingHtml;
  bindValueHtml = bindValueHtml;
  objectsHtml = objectsHtml;
  typescriptHtml = typescriptHtml;
}
```

**A3. Create the page template**
`D:/Projects/universal-material-web/docs/src/app/frameworks/svelte/svelte.component.html`. Use
`<docs-title kind="foundation" title="Using with Svelte">` (a "Get started"/foundation kind,
not a component) and a series of `<docs-example [renderExample]="false" [html]="..."
sectionTitle="...">` blocks with prose. **Set `[renderExample]="false"`** on every example (the
snippets are `.svelte`/TS, not live-renderable Angular HTML — the Angular docs app cannot
execute Svelte). Sections, in order:
1. Intro prose: Svelte 4 and Svelte 5 consume `u-*` natively (best-in-class custom-element
   support — no `@lit/react`-style shim); documentation-only; no runtime wrapper, no Vite
   plugin, no build config needed. The `customElement: true` Svelte compiler option is for
   *authoring* custom elements and must **not** be enabled.
2. "Register the components (eager, client-only in SvelteKit)" → `registerHtml` + the
   upgrade-timing rationale (register before first render so `prop in node` is true).
3. "Binding props and listening to events" → `bindingHtml` + the mental-model one-liner +
   the per-component contract table (render the table from this doc's Context as HTML in the
   prose). **Emphasize: read `e.target.value` / `e.target.checked`, NOT `e.detail`** (except
   for genuine `CustomEvent` payloads like `u-typeahead`'s `selected` / `u-chip`'s `remove`).
4. "The `bind:value` story" → `bindValueHtml` + prose: `bind:` is reserved for native form
   elements and Svelte components; on `u-*` use prop-in + `on:input`/`on:change`; recover a
   true `bind:value` via a thin `.svelte` wrapper.
5. "Objects, arrays & upgrade timing" → `objectsHtml` + the `prop in node` heuristic and the
   `[object Object]` failure mode if the element isn't upgraded yet.
6. "TypeScript typing" → `typescriptHtml` + the `svelte/elements` augmentation note (DX sugar,
   not required for correctness).
7. "SSR / SvelteKit" → short prose: import client-side only (`onMount` / `if (browser)` /
   `export const ssr = false` last resort); `customElements` is undefined on the server
   (research §Gotchas 4).

**A4. Create the page styles**
`D:/Projects/universal-material-web/docs/src/app/frameworks/svelte/svelte.component.scss`:
```scss
:host {
  display: block;
}
```

**A5. Register the route** in
`D:/Projects/universal-material-web/docs/src/app/app.routes.ts`, inside the
`DocsShellComponent` `children` array (the `path: ''` block; children start at ~line 56):
```ts
{
  path: 'frameworks/svelte',
  loadComponent: () => import('@docs/frameworks/svelte/svelte.component').then(m => m.SvelteComponent)
},
```

**A6. Add the nav item** in
`D:/Projects/universal-material-web/docs/src/app/docs/shell/shell.component.html`. **If a
"Frameworks" `<u-navigation-rail-headline slot="expanded">Frameworks</u-navigation-rail-headline>`
group already exists** (created by the sibling Vue/React task), add the Svelte item inside it,
keeping items alphabetical (React, Solid, **Svelte**, Vue → Svelte goes immediately before
Vue). **Otherwise create the headline group** (place it after the "Get started" block, which
ends at L187). The item (mirror the existing item markup exactly — note the `slot="icon"` span
and `docsLinkActive`):
```html
<u-navigation-rail-item slot="expanded"
  routerLink="frameworks/svelte"
  docsLinkActive
  >Svelte
  <span
    class="material-symbols-outlined"
    slot="icon"
    >deployed_code</span
  >
</u-navigation-rail-item>
```
(`deployed_code` is a reasonable "framework" glyph; use the same icon convention the sibling
framework items use so the group is visually consistent.)

**A7. No APIs/contract table needed.** This page documents framework usage, not a single
component's API, so a `<docs-apis-table key="...">` is **not** appropriate (it keys off a
single lowercased class name). Render the per-component value/event contract table as plain HTML
in the template (step A3.3). Do **not** run `gulp docs:apis` for this page — there is no new
component class.

### PART B — DEFERRED (out of scope for phase 2): types-only package `packages/svelte/`

> **DO NOT DO PART B IN PHASE 2.** Per the locked decision, Svelte ships a **docs page only** now;
> the optional types-only `@universal-material/svelte` package is a **documented follow-up, deferred
> to a later phase.** A cold agent running task 09 must **NOT** create `packages/svelte/`. The steps
> below are preserved verbatim **only as the future follow-up spec** — they are not part of this
> task's acceptance and should be skipped entirely.

**B1. Create `D:/Projects/universal-material-web/packages/svelte/package.json`** (from
`01-package-layout.md` §3.4; Svelte peer is `^4 || ^5`):
```jsonc
{
  "name": "@universal-material/svelte",
  "version": "0.1.0",
  "description": "TypeScript SvelteHTMLElements typings for using @universal-material/web with Svelte 4 & 5.",
  "license": "MIT",
  "types": "./src/svelte.d.ts",
  "exports": {
    ".": { "types": "./src/svelte.d.ts" }
  },
  "files": ["src", "README.md"],
  "peerDependencies": {
    "@universal-material/web": "^3.10.0",
    "svelte": "^4 || ^5"
  }
}
```
- **No `main`/`module`** (no runtime JS). **No `build` script** (hand-authored `.d.ts`). If you
  prefer generating the element list from `custom-elements.json`, add `"scripts": { "build":
  "node scripts/gen.mjs" }` reading `../../dist/custom-elements.json` — but the hand-authored
  `.d.ts` is the recommended phase-1 path (one `SvelteHTMLElements` entry per `@customElement`).

**B2. Create `D:/Projects/universal-material-web/packages/svelte/src/svelte.d.ts`** — the
`SvelteHTMLElements` augmentation. Add **one entry per `u-*` element** (all 64). Generate the
element list from the web library's `@customElement` decls — read them out of
`D:/Projects/universal-material-web/dist/custom-elements.json` (or grep `@customElement('u-`
over `src/`, which returns 64 hits) so the list is complete. Skeleton:
```ts
import type { HTMLAttributes } from 'svelte/elements'

declare module 'svelte/elements' {
  export interface SvelteHTMLElements {
    'u-button': HTMLAttributes<HTMLElement> & {
      variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated'
      disabled?: boolean
    }
    'u-text-field': HTMLAttributes<HTMLElement> & {
      value?: string
      label?: string
      'on:input'?: (e: InputEvent) => void
      'on:change'?: (e: Event) => void
    }
    'u-checkbox': HTMLAttributes<HTMLElement> & {
      checked?: boolean
      'on:change'?: (e: Event) => void
    }
    'u-select': HTMLAttributes<HTMLElement> & {
      value?: string
      'on:input'?: (e: Event) => void
      'on:change'?: (e: Event) => void
    }
    // … one entry per <u-*> element (64 total)
  }
}

export {}
```
> Optionally `import type { Button, Select, … } from '@universal-material/web'` and intersect
> `Partial<Button>` etc. to surface real reactive-property types instead of hand-listing each
> prop — but the simple `HTMLAttributes<HTMLElement> & { … }` form above is the phase-1
> recommendation and needs no class imports. **Do not** invent props/events not present in the
> contract table or in `src/` — keep entries minimal and accurate.

**B3. Create `D:/Projects/universal-material-web/packages/svelte/README.md`** — a condensed
version of the docs page: the eager client-only registration snippet, the prop-in /
`on:input`/`on:change` read-back rule (`e.target.value` / `.checked`, NOT `e.detail`), the
`bind:value` limitation + thin `.svelte` wrapper recipe, the per-component contract table, and
the `svelte/elements` typing import / `types` reference. Cross-link the live docs page
("Using with Svelte"). This README is what npm renders.

**B4. Install + verify the workspace picks it up:**
```powershell
npm install
```
Confirm `node_modules/@universal-material/svelte` is a symlink to `packages/svelte`.

---

## Acceptance criteria

**Part A (docs page) — required:**
1. Navigating to `http://localhost:4200/#/frameworks/svelte` renders the "Using with Svelte"
   page with all sections (register, binding, `bind:value`, objects/timing, TypeScript, SSR).
2. The page appears in the left nav (a "Svelte" `u-navigation-rail-item`, alphabetically placed
   if a "Frameworks" group is shared — Svelte before Vue) and `docsLinkActive` highlights it
   when active.
3. Every code snippet is **syntax-highlighted and shown** (not live-rendered:
   `[renderExample]="false"`), with no broken `innerHTML`-rendered Svelte markup.
4. The page accurately states: **no runtime wrapper / no build config**, the eager **client-only**
   registration, **`bind:value` does NOT work on `u-*`** (prop-in + `on:input`/`on:change`),
   the read-back rule reads **`e.target.value` / `e.target.checked` (NOT `e.detail`)** for the
   form value while `e.detail` is reserved for genuine `CustomEvent` payloads, the `prop in
   node` upgrade-timing gotcha, the thin `.svelte` `bind:value` escape hatch, and the SSR
   client-only guard.
5. The docs app builds clean: `cd docs ; npx ng build --configuration development` succeeds with
   the new route/component.
6. No web `src/`, `dist/`, `skills/`, or `.claude-plugin/` files changed.

**Part B (types-only package) — DEFERRED, NOT part of phase-2 acceptance:**
Part B is **out of scope for phase 2** (locked decision: Svelte ships a docs page only now). A
phase-2 run must **not** create `packages/svelte/`, and criteria 7–10 below do **not** apply. They
are retained solely as the acceptance spec for the future follow-up that ships the optional types
package; verify them only if/when that follow-up is greenlit.
7. *(follow-up only)* `packages/svelte/package.json` declares `@universal-material/svelte@0.1.0`, types-only (no
   `main`/`module`), `svelte ^4 || ^5` + `@universal-material/web ^3.10.0` peers.
8. *(follow-up only)* `packages/svelte/src/svelte.d.ts` augments `svelte/elements`' `SvelteHTMLElements` with **one
   entry per `u-*` element** (all 64 `@customElement` tags), with accurate props/events drawn
   from the contract table / `src/` (no invented API).
9. *(follow-up only)* `npm install` at root symlinks `node_modules/@universal-material/svelte`.
10. *(follow-up only)* A throwaway type-check (see Verification V5) resolves `<u-text-field>` / `<u-checkbox>` etc.
    as typed elements via the augmentation (no "unknown element" type error).

---

## Verification commands

> Run from `D:/Projects/universal-material-web` unless noted. The dev server (`npm run docs`)
> is usually already running on :4200 — do **not** restart it unless asked.

**V1 — docs page route + component compile (Part A):**
```powershell
# Build the docs app to confirm the new lazy route + component type-check.
cd docs ; npx ng build --configuration development
```
Expect success and no unresolved `@docs/frameworks/svelte/svelte.component` import.

**V2 — visual check at :4200 (Part A):** open
`http://localhost:4200/#/frameworks/svelte` in the connected browser
(`mcp__Claude_in_Chrome__navigate` then `get_page_text`). Confirm all sections render, code
blocks are highlighted, and the nav item is present and highlights when active. (Per `CLAUDE.md`
cardinal rule: visually evaluate, don't trust the build alone.)

**V3 — example files are valid text imports (Part A):**
```powershell
Get-ChildItem docs/src/app/frameworks/svelte/examples
# expect: register.html, binding.html, bind-value.html, objects.html, typescript.html
```

**V4 — package identity (Part B):**
```powershell
node -e "const p=require('./packages/svelte/package.json'); console.log(p.name, p.version, 'types='+p.types, 'main='+(p.main??'(none)'), 'svelte='+p.peerDependencies.svelte)"
# expect: @universal-material/svelte 0.1.0 types=./src/svelte.d.ts main=(none) svelte=^4 || ^5
npm ls @universal-material/svelte   # shows the workspace symlink
```

**V5 — types augmentation resolves (Part B):** create a throwaway
`packages/svelte/_typecheck.ts` that imports the augmentation and references a
`SvelteHTMLElements` key, then type-check it:
```powershell
npx tsc --noEmit packages/svelte/src/svelte.d.ts --moduleResolution bundler --skipLibCheck
Remove-Item packages/svelte/_typecheck.ts -ErrorAction SilentlyContinue
```
Expect the augmentation to compile against `svelte/elements` (with `svelte` installed in the
workspace). If `svelte` is not installed at the root, this check is informational only — the
`.d.ts` is consumed in the *consumer's* app where `svelte/elements` resolves.

**V6 — web library untouched:**
```powershell
git status --porcelain src dist skills .claude-plugin
# expect: no output (nothing changed under those paths)
```

---

## Rollback notes

- **Part A is fully additive and isolated** to `docs/`. To roll back: delete
  `docs/src/app/frameworks/svelte/` (and `docs/src/app/frameworks/` if no sibling framework page
  exists), revert the single route entry in `docs/src/app/app.routes.ts`, and revert the
  nav-item (and "Frameworks" headline, if you added it) in
  `docs/src/app/docs/shell/shell.component.html`. No build artifacts, no generated files
  (`apis.ts` is **not** regenerated for this page).
  `git checkout -- docs/src/app/app.routes.ts docs/src/app/docs/shell/shell.component.html` +
  `Remove-Item -Recurse docs/src/app/frameworks/svelte` reverses everything.
- **Part B is fully additive** under `packages/svelte/`. To roll back:
  `Remove-Item -Recurse packages/svelte`, then `npm install` to drop the symlink. No other
  package references `@universal-material/svelte` (it is consumer-facing only), so removal
  cannot break the web, Angular, React, or Vue builds.
- Neither part modifies the web build pipeline, `dist/`, the postinstall patch, or any published
  web contract — so there is no publish-time or runtime regression risk for existing consumers.

---

## Parallelizable in worktree? **yes** — why

This task is **content-only and touches a disjoint file set**: `docs/src/app/frameworks/svelte/**`
(new) plus two surgical additions to `docs/src/app/app.routes.ts` and
`docs/src/app/docs/shell/shell.component.html`. It does **not** modify the web library `src/`, the
build pipeline, `dist/`, `skills/`, `.claude-plugin/`, or any package — and in phase 2 it creates
**no** `packages/svelte/` directory at all (Part B is **deferred**, out of scope). The only shared
files it edits (the docs routes file and shell template) take **append-only** edits — a new route
object and a new nav item — which conflict trivially-resolvably with the sibling framework tasks
(`07-wrapper-react.md`, `08-wrapper-vue.md`, `10-wrapper-solid.md`) that append their own entries
to the same two files; coordinate the "Frameworks" headline once (whoever runs first creates it;
the rest reuse it and keep items alphabetical) and the rest is independent. No build-order coupling:
Svelte has no runtime wrapper to compile, so it never blocks or is blocked by the web → wrapper
build chain. (If the deferred Part B is ever greenlit as a follow-up, its `packages/svelte/` work
needs the workspaces skeleton from `02-monorepo-scaffold.md` present — a precondition, not a
parallel-write conflict — and creates files nobody else writes.)
