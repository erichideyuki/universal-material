# Task 11 — Per-framework docs pages in the existing web docs app

> **Status:** ready to implement (after task 03).
> **Architecture authority:** `planning/architecture/00-decision.md` §11.3, §11.4 (open decisions on docs-page scope + framework-usage section), §"Wrapper surface table" (lines 44–46); `planning/architecture/01-package-layout.md` §1 (lines 107–128 — "Framework-usage pages … added as new pages … a new `docs/src/app/frameworks/` section"); `planning/current/03-web-docs-app.md` (the docs-app surface map) and §9 (Pointers for the per-framework docs effort); `planning/current/06-angular-demo-and-stackblitz.md` (the Angular wrapper demo this page supersedes).
> **One-line scope:** Stand up the **"Frameworks" nav group + section scaffold** in the web docs app (`docs/`) and define the **single canonical recipe** for adding a per-framework "Using with X" page, then ship the **"Using with Angular"** page as the first concrete instance (the Angular wrapper now lives in `packages/angular`). This task owns the shared scaffold; tasks 07/08/09/10 each append exactly one page using the recipe defined here — they do **not** re-derive the nav.

---

## Scope (ONE unit only)

Deliver the **per-framework documentation surface** inside the existing web docs app at
`D:/Projects/universal-material-web/docs/`:

1. **(Primary, load-bearing) The "Frameworks" section scaffold + canonical recipe.** Create
   the `docs/src/app/frameworks/` directory, add a **"Frameworks"** `<u-navigation-rail-headline>`
   nav group to the shell, and document the **single canonical "how to add a framework usage
   page" recipe** (route + nav item + page-component shape + `[renderExample]="false"` for
   non-Angular snippets) — this recipe is the contract that tasks **07 (React)**, **08 (Vue)**,
   **09 (Svelte)**, **10 (Solid)** reuse verbatim. This **RESOLVES REVIEW P2-1** (stop
   re-deriving the nav in every wrapper task).
2. **(Primary) The "Using with Angular" page** at `docs/src/app/frameworks/angular/`, the
   first concrete instance of the recipe — and the **only** active framework page this task
   ships (React/Vue/Svelte/Solid pages are owned by tasks 07/08/09/10, which each append one
   page using this recipe). It documents consuming
   **`@universal-material/angular`** (the publishable library that now lives in `packages/angular/`
   after the subtree fold) — install, the `UniversalMaterialModule` import, and template binding
   with `[(ngModel)]`/reactive forms. **Its example snippets are SOURCED FROM the RETIRED Angular
   demo's migrated example pages** at `D:/Projects/universal-material-angular/demo/src/app/components/*`
   (checkbox, chip-field, datepicker, radio, search, select, slider, tab-bar, text-field, typeahead).
   Per the locked decision the Angular **demo app is RETIRED** — there is **no** :4280 demo to link
   out to; the migrated example pages become the source material distilled into this docs page.
3. **(Required housekeeping — RESOLVES REVIEW P2-2) Normalize the badges page naming
   inconsistency** so the new pages and any copy-from-template start from a clean convention:
   the existing `docs/src/app/components/badges/` folder mixes `badges.component.ts`
   (plural) with `templateUrl: './badge.component.html'` (singular). **Fix the file name to
   `badges.component.html`** and update the `templateUrl` so the per-framework pages copy a
   self-consistent `<name>.component.{ts,html,scss}` shape, and so future copies don't
   propagate the singular/plural mismatch.

**This task does NOT:**
- Build any runtime wrapper package (React is task 07; Vue/Svelte/Solid types packages are
  tasks 08/09/10). This task only creates the **docs scaffold + recipe** and the **Angular
  page**.
- Write the React/Vue/Svelte/Solid **pages** — those are owned by tasks 07/08/09/10
  respectively, each of which **appends one route + one nav item + one page folder** using the
  recipe defined here. (08-wrapper-vue.md already references "a new `frameworks/` section" —
  this task creates that section so Vue's task only appends.)
- Revive the StackBlitz integration (that is task **12-stackblitz-examples.md**, which depends
  on this task). This page may link out to the existing Angular demo workspace, but wires no
  StackBlitz "open in editor" button.
- Touch the web library `src/`, its build pipeline, `dist/`, `skills/`, or `.claude-plugin/`.
- Modify `gulp docs:apis` or `docs/src/app/apis.ts` (these pages document framework *usage*,
  not a new component class — no `<docs-apis-table>` is added).

---

## Preconditions & Dependencies

- **Hard dependency: `03-relocate-web-package.md`.** This task assumes the monorepo skeleton
  exists and the web library is configured as the workspace-root coordinator (web stays at
  root; `docs/` is unchanged and still resolves `@universal-material/web` → `../dist/index`
  via the tsconfig path map). The "Using with Angular" page references
  `@universal-material/angular` as a workspace package at `packages/angular/` — but the page is
  **pure documentation prose + non-rendered code snippets**, so it does not *import* or *build*
  against that package; it only needs the docs app to build. If task 04
  (`04-relocate-angular-package.md`, the subtree fold) has not landed yet, the page can still be
  written (the snippets are `[renderExample]="false"` text) — just note in the PR that the
  `packages/angular/` install instructions describe the post-fold state.
- **No dependency** on tasks 05, 06, 07, 13, 14. The page set is content-only and touches a
  disjoint file set (`docs/src/app/frameworks/**` + two append-only edits).
- **Coordination contract with tasks 07/08/09/10:** those four sibling tasks each append to the
  **same two shared files** this task creates/edits — `docs/src/app/app.routes.ts` (one new
  route object) and `docs/src/app/docs/shell/shell.component.html` (one new
  `<u-navigation-rail-item>` under the "Frameworks" headline). This task **creates the
  "Frameworks" headline once**; the siblings reuse it and keep items **alphabetical** (Angular,
  React, Solid, Svelte, Vue). The append-only nature makes conflicts trivially resolvable.
- **Soft dependency:** the web docs app must build/serve (`npm run docs` → :4200). It does
  today; this task adds a section, two pages' worth of plumbing (scaffold + Angular page), and
  renames one existing file.

---

## Context (enough to execute COLD)

> A fresh agent with zero chat memory must be able to run this. Every path below is absolute
> under `D:/Projects/universal-material-web` (the web repo, docs served on **:4200**) or
> `D:/Projects/universal-material-angular` (the **RETIRED** standalone Angular demo workspace —
> read-only here as the source material for the "Using with Angular" page; it is not run/served).
> Do not invent file names — the ones cited here were read from disk.

### What the docs app is, mechanically (from `planning/current/03-web-docs-app.md`)
- The docs app is **Angular 20**, standalone, **hash-routed**, **zoneless**, served by
  `npm run docs` on **:4200**. It consumes the library source via a tsconfig path map
  (`@universal-material/web` → `../dist/index`).
- **Routes:** `D:/Projects/universal-material-web/docs/src/app/app.routes.ts`. Two top-level
  branches: `screens/*` (full-viewport, shell-less demos) and `''` → `DocsShellComponent` with
  a `children` array (~50 entries, all `components/*`, `utilities/*`, `layout/*`, `content/*`,
  and `''` → `IntroductionComponent`). The shell-children array is the `path: ''` block — its
  `children` array opens at **line 56** and the trailing `path: ''` → `IntroductionComponent`
  entry is at **lines 233–236**. New framework routes go in this `children` array.
- **`.html`-as-text loader:** `docs/angular.json` registers `"loader": { ".html": "text" }`, so
  `import x from './examples/foo.html'` returns the file's **source string**. This is how every
  page imports its example snippets.
- **`@docs/*` → `docs/src/app/*`** (tsconfig path); lazy routes use
  `loadComponent: () => import('@docs/...').then(m => m.XComponent)`.

### The page primitives (the building blocks this recipe uses)
All under `docs/src/app/docs/`:
- **`docs-title`** — `docs/src/app/docs/title/title.component.ts`. Inputs: `title` (string),
  `kind: 'component' | 'utility' | 'layout' | 'content' | 'foundation'` (default `component`),
  `tag` (comma-separated tag names). For a framework-usage page use **`kind="foundation"`**
  (renders a "Foundation" badge with the `foundation` icon) and **omit `tag`** (the page is not
  about one element). Projected content (`<ng-content>`) becomes the description.
- **`docs-example`** — `docs/src/app/docs/example/example.component.ts`. Inputs: `html`
  (setter — the shown code string), `sectionTitle`, `renderExample` (default **`true`**),
  `screenRoute?`, `fluid`, `alignment`. **The dual SHOWN/RENDERED contract:** when
  `renderExample=true`, the same `[html]` string is both `innerHTML`-rendered live **and**
  syntax-highlighted as code; when `renderExample=false`, the live area instead projects
  `<ng-content select="[example]">` and `[html]` only supplies the shown code. **For every
  per-framework page, set `[renderExample]="false"`** — the snippets are framework-specific
  (`.tsx`, `.vue`, `.svelte`, Angular templates with bindings) that the Angular docs app cannot
  execute as inert `innerHTML`. **The one exception:** Angular *template* HTML using `u-*` tags
  IS renderable as inert HTML, but it loses the Angular bindings (`[(ngModel)]` etc.) — so for
  the Angular page keep `[renderExample]="false"` too, to show the bindings as written rather
  than rendering a dead version.
- **`docs-apis-table`** — `docs/src/app/docs/apis-table/apis-table.component.ts`. Keys off a
  single lowercased component-class name from the generated `docs/src/app/apis.ts`. **Not used
  on framework pages** (they document usage, not a component's API), so **do not** run
  `gulp docs:apis` for this task.

### The reference page to copy the shape from (and the naming bug to fix first)
`docs/src/app/components/badges/` is the minimal page template. Its files on disk **today**:
```
docs/src/app/components/badges/
├── badge.component.html        # <-- SINGULAR (the bug: templateUrl points here)
├── badges.component.scss       # plural
├── badges.component.ts         # plural; @Component templateUrl: './badge.component.html'
└── examples/
    ├── usage.html
    └── static.html
```
`badges.component.ts` line 11 reads `templateUrl: './badge.component.html'` while the folder,
`.ts`, and `.scss` are all plural `badges`. **This is REVIEW P2-2.** Task step 0 renames the
template to `badges.component.html` and updates the `templateUrl` so the convention is
self-consistent (`<name>.component.{ts,html,scss}`) before any framework page is copied from
it. The `.ts` shape to mirror (post-rename):
```ts
import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import installHtml from './examples/install.html';   // imported as TEXT via the loader map

@Component({
  selector: 'docs-<name>',
  templateUrl: './<name>.component.html',
  styleUrl: './<name>.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]   // NO ApisTableComponent on framework pages
})
export class <Name>Component {
  installHtml = installHtml;
}
```

### The nav shell (where the "Frameworks" group slots)
`docs/src/app/docs/shell/shell.component.html`. The nav is a flat list of
`<u-navigation-rail-item slot="expanded" routerLink="..." docsLinkActive>` items grouped under
`<u-navigation-rail-headline slot="expanded">…</u-navigation-rail-headline>` headings. The
existing headline groups, **in document order**, are:
- **"Get started"** (line 176) — has "Installation" → `routerLink=""`.
- **"Foundations"** (line 189) — Typography.
- **"Colors"** (line 201).
- **"Layout"** (line 243).
- **"Components"** (line 285) — ~40 items, alphabetical by visible label (Badges → Typeahead),
  ending with a `<div slot="expanded" class="u-divider">` and a GitHub footer link (lines
  616–631).

Place the **new "Frameworks" headline immediately after the "Get started" group and before
"Foundations"** (a consumption guide belongs near "Get started"; this keeps it above the
Material foundations/component reference). Items within it are **alphabetical by visible
label**: Angular, React, Solid, Svelte, Vue. This task adds only **Angular**; siblings 07/08/09/10
insert their items into this same group in alphabetical position.

### What the "Using with Angular" page must say (LOCKED: the demo is retired; this page is its successor)
- The Angular wrapper is **`@universal-material/angular`**, now folded into the monorepo at
  `D:/Projects/universal-material-web/packages/angular/` (task 04, **library-only fold** — the demo
  app is NOT folded). It exposes **`UniversalMaterialModule`** which provides the
  `ControlValueAccessor`s so `u-*` form elements work with `[(ngModel)]` and reactive forms.
- **LOCKED DECISION — the Angular demo app is RETIRED.** It is **not** folded into the monorepo and
  there is **no** running :4280 demo to link out to. Its **migrated example pages are the SOURCE
  MATERIAL** for this "Using with Angular" page: read the verified usages from
  `D:/Projects/universal-material-angular/demo/src/app/components/*`
  (checkbox, chip-field, datepicker, radio, search, select, slider, tab-bar, text-field, typeahead)
  — these are the `UniversalMaterialModule` import, `[(ngModel)]` template bindings, and
  reactive-forms wirings that the docs page distills into its `[renderExample]="false"` snippets.
  Task 04 preserves these pages (untouched standalone repo + `pre-monorepo-archive` git tag), so
  they remain reachable even after the demo is stripped from `packages/angular`.
- **Sourcing note:** pull each snippet from the corresponding demo example component (e.g. the
  checkbox `[(ngModel)]` usage from `demo/src/app/components/checkbox/*-example/*.component.{ts,html}`).
  If task 04 has already stripped the demo, recover the same files from the standalone repo or from
  the grafted git history (`git show` against `packages/angular/demo/...` before its removal commit).
  Do **not** link to a live demo (there is none); instead, distil the examples inline and, optionally,
  link to the standalone repo on GitHub as historical reference.

### Why non-Angular framework snippets are non-rendered (the recipe invariant)
Vue/Svelte/Solid/React consume `u-*` elements natively (per the wrapper-surface table in
`00-decision.md` lines 44–46 and `planning/research/{vue,svelte,solid}.md`), but their **code
is in their own syntax** and their toolchains live in the *consumer's* app. The Angular docs
app cannot compile a `.vue`/`.svelte`/`.tsx` snippet, so every per-framework example is **shown
as highlighted code only** (`[renderExample]="false"`). This is the single rule tasks 07/08/09/10
must all honor — it is the reason the recipe exists.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web`. All file paths
> are absolute. The dev server (`npm run docs` → :4200) is usually already running — do **not**
> restart it unless asked.

### STEP 0 — Normalize the badges page naming (RESOLVES P2-2; do this first)

Rename the singular template to plural and update the reference:
```powershell
git mv docs/src/app/components/badges/badge.component.html docs/src/app/components/badges/badges.component.html
```
Then edit `D:/Projects/universal-material-web/docs/src/app/components/badges/badges.component.ts`
line 11, changing `templateUrl: './badge.component.html'` → `templateUrl: './badges.component.html'`.
No other file references `badge.component.html` (verify with the grep in Verification V0). This
leaves the badges page self-consistent so the framework pages copy a clean convention.

### STEP 1 — Define the canonical "add a framework usage page" recipe (the shared contract)

This is the recipe tasks **07/08/09/10** reuse verbatim. To add a page for framework `<fw>`
(lowercase, e.g. `react`, `vue`, `svelte`, `solid`) with display label `<Label>` (e.g. `React`,
`Vue`, `Svelte`, `Solid`):

1. **Create** `docs/src/app/frameworks/<fw>/` with four pieces:
   - `examples/*.html` — one file per snippet, framework-syntax source (imported as text).
   - `<fw>.component.ts` — standalone component, `selector: 'docs-<fw>'`, imports
     `ExampleComponent` + `TitleComponent`, assigns each imported snippet string to a field.
   - `<fw>.component.html` — `<docs-title kind="foundation" title="Using with <Label>">…</docs-title>`
     followed by one `<docs-example [renderExample]="false" [html]="…" sectionTitle="…">` per
     snippet.
   - `<fw>.component.scss` — `:host { display: block; }`.
2. **Register the route** in `docs/src/app/app.routes.ts`, inside the `DocsShellComponent`
   `children` array (the `path: ''` block, just **before** the trailing `path: ''` →
   `IntroductionComponent` entry at lines 233–236):
   ```ts
   {
     path: 'frameworks/<fw>',
     loadComponent: () => import('@docs/frameworks/<fw>/<fw>.component').then(m => m.<Label>Component)
   },
   ```
3. **Add the nav item** under the **"Frameworks"** headline in
   `docs/src/app/docs/shell/shell.component.html`, in **alphabetical position** among
   Angular/React/Solid/Svelte/Vue:
   ```html
   <u-navigation-rail-item slot="expanded"
     routerLink="frameworks/<fw>"
     docsLinkActive
     ><Label>
     <span class="material-symbols-outlined" slot="icon">deployed_code</span>
   </u-navigation-rail-item>
   ```
   (`deployed_code` is the agreed shared "framework/package" glyph; a task may pick a more
   brand-appropriate Material Symbol if preferred, but `deployed_code` is the default so the
   group reads consistently.)
4. **`[renderExample]="false"` on every example** — non-negotiable for non-Angular pages (their
   code is not Angular-renderable). The Angular page also uses it (to preserve binding syntax in
   the shown code).
5. **No `<docs-apis-table>`, no `gulp docs:apis`** — framework pages document usage, not a
   component class.

> Tasks 07/08/09/10 should reference this recipe by section ("Task 11 STEP 1") and **only**
> create their `frameworks/<fw>/` folder + append their one route + one nav item. They must not
> re-create the "Frameworks" headline (this task owns it) or re-derive nav placement.

### STEP 2 — Create the "Frameworks" section scaffold + nav group

**2a.** Create the directory `D:/Projects/universal-material-web/docs/src/app/frameworks/`
(it will hold one subfolder per framework). The Angular page (STEP 3) is the first occupant.

**2b.** Add the **"Frameworks" headline group** to
`D:/Projects/universal-material-web/docs/src/app/docs/shell/shell.component.html`, inserted
**immediately after the "Get started" group's `Installation` item closes (after line 187) and
before the `<u-navigation-rail-headline slot="expanded">Foundations</u-navigation-rail-headline>`
at line 189**:
```html
    <u-navigation-rail-headline slot="expanded">Frameworks</u-navigation-rail-headline>
    <u-navigation-rail-item slot="expanded"
      routerLink="frameworks/angular"
      docsLinkActive
      >Angular
      <span
        class="material-symbols-outlined"
        slot="icon"
        >deployed_code</span
      >
    </u-navigation-rail-item>
```
(Siblings 07/08/09/10 append React/Solid/Svelte/Vue items into this group in alphabetical order.)

### STEP 3 — Create the "Using with Angular" page (first concrete instance of the recipe)

**3a. Example snippets** — create
`D:/Projects/universal-material-web/docs/src/app/frameworks/angular/examples/` with:

- `install.html` — install + module import:
  ```bash
  # Both the elements and the Angular wrapper:
  npm install @universal-material/web @universal-material/angular
  ```
- `module.html` — register the wrapper module (standalone component shown; mirror the demo's
  `UniversalMaterialModule` import from `06-angular-demo-and-stackblitz.md` §3):
  ```ts
  // app or component imports
  import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
  import { FormsModule } from '@angular/forms';
  import { UniversalMaterialModule } from '@universal-material/angular';
  import '@universal-material/web'; // registers all <u-*> custom elements

  @Component({
    selector: 'app-example',
    standalone: true,
    imports: [FormsModule, UniversalMaterialModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './example.component.html',
  })
  export class ExampleComponent {
    agree = false;
  }
  ```
- `ngmodel.html` — template binding with `[(ngModel)]` (the wrapper's CVAs make `u-*` form
  elements work with `ngModel` and reactive forms):
  ```html
  <u-checkbox [(ngModel)]="agree">I agree</u-checkbox>

  <u-text-field [(ngModel)]="name" label="Name"></u-text-field>

  <u-select [(ngModel)]="choice">
    <u-select-option value="a">A</u-select-option>
    <u-select-option value="b">B</u-select-option>
  </u-select>
  ```
- `reactive.html` — reactive-forms equivalent:
  ```ts
  form = new FormGroup({
    agree: new FormControl(false),
    name: new FormControl(''),
  });
  ```
  ```html
  <form [formGroup]="form">
    <u-checkbox formControlName="agree">I agree</u-checkbox>
    <u-text-field formControlName="name" label="Name"></u-text-field>
  </form>
  ```

> **Source these snippets from the RETIRED demo's migrated example pages** at
> `D:/Projects/universal-material-angular/demo/src/app/components/*/*-example/*-example.component.{ts,html}`
> — they are the verified `[(ngModel)]`/reactive-forms usages and are the agreed source material for
> this page (the demo app itself is retired and not folded). If task 04 already stripped the demo from
> `packages/angular`, recover the same files from the untouched standalone repo or the grafted git
> history (see Context). Verify the exact `UniversalMaterialModule` export name against
> `packages/angular/` once the fold (task 04) has landed; if it has not, note the assumption in the PR.

**3b. Page component**
`D:/Projects/universal-material-web/docs/src/app/frameworks/angular/angular.component.ts`:
```ts
import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import installHtml from './examples/install.html';
import moduleHtml from './examples/module.html';
import ngModelHtml from './examples/ngmodel.html';
import reactiveHtml from './examples/reactive.html';

@Component({
  selector: 'docs-angular',
  templateUrl: './angular.component.html',
  styleUrl: './angular.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class AngularComponent {
  installHtml = installHtml;
  moduleHtml = moduleHtml;
  ngModelHtml = ngModelHtml;
  reactiveHtml = reactiveHtml;
}
```

**3c. Page template**
`D:/Projects/universal-material-web/docs/src/app/frameworks/angular/angular.component.html`.
Use `<docs-title kind="foundation" title="Using with Angular">` and `<docs-example
[renderExample]="false" …>` blocks, in order:
1. Intro prose: Angular consumes `u-*` elements via the **`@universal-material/angular`**
   wrapper (now a workspace package at `packages/angular/`), which provides the
   `ControlValueAccessor`s for `[(ngModel)]`/reactive forms; the raw elements also work with
   `CUSTOM_ELEMENTS_SCHEMA`.
2. "Install" → `installHtml`.
3. "Register the module" → `moduleHtml`.
4. "Template-driven forms (`ngModel`)" → `ngModelHtml`.
5. "Reactive forms" → `reactiveHtml`.
6. A closing prose block noting the per-component examples are distilled from the (now retired)
   Angular demo's migrated pages, optionally with a plain `<a>` to the standalone Angular **repo on
   GitHub** as historical reference. **Do NOT promise a live demo** (the demo app is retired — there
   is no :4280 workspace to link to).

**3d. Page styles**
`D:/Projects/universal-material-web/docs/src/app/frameworks/angular/angular.component.scss`:
```scss
:host {
  display: block;
}
```

**3e. Register the route** in
`D:/Projects/universal-material-web/docs/src/app/app.routes.ts`, in the `DocsShellComponent`
`children` array, just **before** the trailing `path: ''` → `IntroductionComponent` entry
(lines 233–236):
```ts
{
  path: 'frameworks/angular',
  loadComponent: () => import('@docs/frameworks/angular/angular.component').then(m => m.AngularComponent)
},
```
(The nav item was already added in STEP 2b.)

---

## Acceptance criteria

1. **Badges naming fixed (P2-2):** `docs/src/app/components/badges/badges.component.html` exists,
   `badge.component.html` does not, and `badges.component.ts` references
   `templateUrl: './badges.component.html'`. The badges page still renders unchanged at
   `http://localhost:4200/#/components/badges`.
2. **"Frameworks" nav group exists** in `docs/src/app/docs/shell/shell.component.html` as a
   `<u-navigation-rail-headline>Frameworks</u-navigation-rail-headline>`, placed between "Get
   started" and "Foundations", containing an **Angular** `<u-navigation-rail-item>` (room for
   alphabetical React/Solid/Svelte/Vue siblings).
3. **The recipe (STEP 1) is documented in this file** as the single source of truth for adding a
   per-framework page — tasks 07/08/09/10 can follow it without re-deriving nav placement or the
   `[renderExample]="false"` rule (RESOLVES P2-1).
4. **Navigating to `http://localhost:4200/#/frameworks/angular`** renders the "Using with
   Angular" page with all sections (install, module, `ngModel`, reactive forms, demo link), each
   code snippet **syntax-highlighted and shown but not live-rendered** (`[renderExample]="false"`),
   and the nav item highlights (`docsLinkActive` → `active` attribute) when active.
5. **The Angular page accurately states:** the wrapper is `@universal-material/angular` at
   `packages/angular/`; it provides CVAs so `u-*` form elements bind with `[(ngModel)]`/reactive
   forms; raw elements work with `CUSTOM_ELEMENTS_SCHEMA`; and its examples are **distilled from the
   RETIRED Angular demo's migrated pages** (`D:/Projects/universal-material-angular/demo/src/app/components/*`).
   It does **NOT** promise or link to a live :4280 demo (the demo app is retired — locked decision);
   any link is at most a historical pointer to the standalone repo on GitHub.
6. **The docs app builds clean:** `cd docs ; npx ng build --configuration development` succeeds
   with the new route + component and no unresolved `@docs/frameworks/angular/angular.component`
   import.
7. **No web `src/`, `dist/`, `skills/`, `.claude-plugin/`, or `apis.ts` files changed**, and
   `gulp docs:apis` was **not** run for this task.

---

## Verification commands

> Run from `D:/Projects/universal-material-web` unless noted. The dev server (`npm run docs`) is
> usually already running on :4200 — do **not** restart it unless asked.

**V0 — badges rename is complete and dangling-reference-free:**
```powershell
Test-Path docs/src/app/components/badges/badges.component.html   # expect: True
Test-Path docs/src/app/components/badges/badge.component.html    # expect: False
# No file may still reference the singular template:
Select-String -Path docs/src/app/**/*.ts -Pattern "badge\.component\.html" -SimpleMatch
# expect: no matches
```

**V1 — docs app builds with the new route + component:**
```powershell
cd docs ; npx ng build --configuration development
```
Expect success and no unresolved `@docs/frameworks/angular/angular.component` import.

**V2 — visual check at :4200** (per CLAUDE.md cardinal rule — don't trust the build alone):
open `http://localhost:4200/#/frameworks/angular` in the connected browser
(`mcp__Claude_in_Chrome__navigate` then `get_page_text`). Confirm all sections render, code
blocks are highlighted (not live-rendered), the snippets reflect the retired demo's
`[(ngModel)]`/reactive-forms usages (and there is **no** "live demo on :4280" promise), and the
**Angular** nav item appears under a **Frameworks** headline and highlights when active. Also re-open
`http://localhost:4200/#/components/badges` to confirm the rename didn't break that page.

**V3 — example files exist and are imported:**
```powershell
Get-ChildItem docs/src/app/frameworks/angular/examples
# expect: install.html, module.html, ngmodel.html, reactive.html
Select-String -Path docs/src/app/frameworks/angular/angular.component.ts -Pattern "examples/"
# expect: four import lines
```

**V4 — route + nav wiring present:**
```powershell
Select-String -Path docs/src/app/app.routes.ts -Pattern "frameworks/angular"
Select-String -Path docs/src/app/docs/shell/shell.component.html -Pattern "Frameworks","frameworks/angular"
# expect: route object + the Frameworks headline + the Angular nav item
```

**V5 — web library + generated docs artifacts untouched:**
```powershell
git status --porcelain src dist skills .claude-plugin docs/src/app/apis.ts
# expect: no output (nothing changed under those paths)
```

---

## Rollback notes

- **The framework section is fully additive and isolated** to `docs/`. To roll back the Angular
  page + scaffold: `Remove-Item -Recurse docs/src/app/frameworks/angular` (and
  `docs/src/app/frameworks/` if no sibling framework page exists yet), then revert the single
  route entry in `docs/src/app/app.routes.ts` and the "Frameworks" headline + Angular nav item in
  `docs/src/app/docs/shell/shell.component.html`:
  ```powershell
  git checkout -- docs/src/app/app.routes.ts docs/src/app/docs/shell/shell.component.html
  Remove-Item -Recurse docs/src/app/frameworks/angular
  ```
- **The badges rename (STEP 0) is reversible** with `git mv` back to `badge.component.html` and
  restoring the `templateUrl`, but there is no reason to — it only removes an inconsistency.
- No build artifacts, no generated files (`apis.ts` is **not** regenerated for these pages), no
  web `src/`/`dist/` changes. This task only **reads** the retired Angular demo's example pages as
  source material — it does not modify or delete the standalone repo (its retirement and library-only
  fold are owned by task 04). There is no publish-time or runtime regression risk for existing
  consumers — this task changes only the docs app's nav and pages.

---

## Parallelizable in worktree? **partly (yes, with one coordination point)** — why

This task is **content-only and touches a near-disjoint file set**: it creates
`docs/src/app/frameworks/` + `docs/src/app/frameworks/angular/**` (new), renames one file under
`docs/src/app/components/badges/`, and makes two surgical edits to `docs/src/app/app.routes.ts`
and `docs/src/app/docs/shell/shell.component.html`. It does **not** modify the web library
`src/`, the build pipeline, `dist/`, `skills/`, `.claude-plugin/`, the wrapper packages, or
`apis.ts`. The only shared-file edits are **append-only** (a new route object; a new "Frameworks"
headline + one nav item).

**The one coordination point** is precisely why this task exists: tasks 07/08/09/10 each append
their own route + nav item to the **same two shared files** under the **same "Frameworks"
headline** that this task creates. To avoid a four-way merge conflict over who first introduces
the headline, **this task must land before (or its headline-creation must be merged ahead of) the
sibling framework-page additions** — which is the whole point of defining the canonical recipe
here (RESOLVES P2-1). Once the "Frameworks" group exists, the siblings' edits are independent,
alphabetically-ordered single-line appends that conflict only trivially. The task has no
build-order coupling (no wrapper to compile) beyond its `03-relocate-web-package.md` precondition,
so it can run in a worktree in parallel with the wrapper-build tasks — it only needs the docs app
to build.
