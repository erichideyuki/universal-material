# 06 — Angular Demo Docs App & StackBlitz Integration

Map of the Angular demo app that documents the **`@universal-material/angular`** wrapper
library, plus the dormant StackBlitz "open in editor" integration that Task 6 can revive.

> **Two repos, easy to confuse.** This document is about
> `D:/Projects/universal-material-angular/` (the **Angular wrapper** workspace, served on
> **port 4280**). That workspace *vendors* the web-components repo as a git submodule at
> `universal-material-angular/universal-material-web/` (which is the repo this planning doc
> lives in, served on **port 4200**). Paths below are all under
> `D:/Projects/universal-material-angular/` unless stated otherwise.

---

## 1. Workspace overview

- **Workspace root**: `D:/Projects/universal-material-angular/`
- **`package.json`** (`name: universal-material-angular`, `version: 0.0.0`, `private`):
  - Angular **20.3.x** (standalone APIs, new control-flow `@if`/`@for`/`@switch`).
  - **`@stackblitz/sdk` `^1.3.0`** is declared as a dependency (line 30) — the only thing
    that keeps the dormant StackBlitz code compilable.
  - `@universal-material/core ^2.0.1-alpha.47` — the *old* CSS/SCSS core (still pulled in
    for legacy `.u-card-elevated` / `.u-toolbar` classes used by dead code + global styles).
  - `@stackblitz/sdk`, `dompurify`, `highlight.js`, `ngx-highlight-js`, `ngx-mask`,
    `swiper`, `@lit-labs/virtualizer`, `@lit/context`, `lit`, `animated-scroll-to`.
  - `raw-loader ^4.0.2` (devDep) — historically how `*.html` were imported as text; the
    **current** build uses the Angular `loader` map instead (see §6).
- **Scripts**: `start` = `ng serve demo --port 4280`. `prestart`/`prebuild`/`pretest` all run
  `npm run build:web` first (builds the vendored web submodule into its `dist/`).
- **`scripts/build-web.mjs`**: builds the **`universal-material-web/` git submodule** (sass→ts,
  tsc→dist) so the workspace can resolve `@universal-material/web` via the tsconfig path map.
  Skips if `dist/index.js` already present (force with `FORCE_WEB_BUILD=1`). This is *why*
  the demo can `import { ThemeBuilder } from '@universal-material/web'` — see §5.

### Path aliases (`tsconfig.json` `compilerOptions.paths`)
| Alias | Resolves to | Used by |
| --- | --- | --- |
| `@universal-material/angular` | `src` (the wrapper lib source) | example component pages |
| `@universal-material/web` | `universal-material-web/dist/index` | `theme.service.ts` (`ThemeBuilder`) |
| `@docs/*` | `demo/src/app/*` | docs primitives cross-imports (e.g. `@docs/docs/example/...`) |

### Routing & bootstrap
- **`demo/src/app/app.config.ts`** — `provideRouter(routes, withHashLocation())` (hash routing,
  so fragments are `#/checkbox#usage`), `provideZonelessChangeDetection()`,
  `provideEnvironmentNgxMask()`.
- **`demo/src/app/app.routing.ts`** — flat route table, 10 component pages, default
  `redirectTo: 'checkbox'`. **No** standalone "screen route" entries yet (see §3 gap).
- **`demo/src/app/app.component.ts` / `.html`** — root just renders `<docs-shell>` and calls
  `ThemeService.initialize()` in its constructor.
- **`demo/src/index.html`** — base `<base href="/">`, Roboto + Roboto Mono + Material Symbols
  fonts, a stray `highlight.min.js` from jsDelivr CDN (ngx-highlight-js also bundles hljs).

---

## 2. Docs primitives port (LIVE) — `demo/src/app/docs/*`

These were ported from the web-repo's own Angular docs app
(`universal-material-web/docs/src/app/docs/*`). They render the demo shell and per-component
pages. All are **standalone** components/directives.

### `docs/shell/shell.component.ts` + `.html` (`<docs-shell>`)
The whole app chrome. Built entirely from **web components** (`u-navigation-rail`,
`u-top-app-bar`, `u-icon-button`, `u-menu`, `u-menu-item`, `u-ripple`) with
`CUSTOM_ELEMENTS_SCHEMA`. Contains:
- **Top app bar** (`size="small"`, `[scrollContainer]="pageLayout"`) with menu toggle, brand
  mark (inline SVG logo), theme-**color** picker menu (8 presets + custom `<input type=color>`
  wired to `theme.$themeColorChange`), theme-**mode** menu (System/Light/Dark), RTL toggle,
  and a GitHub link.
- **Navigation rail** as the left nav, grouped by `<u-navigation-rail-headline>`:
  - **"Forms controls"**: Checkbox, Chip field, Datepicker, Radio, Search, Select, Slider,
    Text fields, Typeahead (9 items).
  - **"Components"**: Tab bar (1 item).
  - Each `<u-navigation-rail-item routerLink="..." docsLinkActive>` with a Material Symbols icon.
  - A footer GitHub link showing `v{{ version }}` — `version = '3.6.2'` is **hard-coded** in
    `shell.component.ts` (≠ the `'3.6.2'`/other versions elsewhere; not read from package.json).
- **Page layout**: `<div class="page-layout" #pageLayout>` is the scroll container; holds
  `<router-outlet>` inside `.u-container.chapter` and `<docs-toc class="page-toc">` beside it.

### `docs/title/title.component.ts` + `.html` (`<docs-title>`)
Page header. Inputs: `title`, `kind` (`'component'|'utility'|'layout'|'content'|'foundation'`
→ badge label+icon via `KIND_META`), `tag` (comma-separated tag names rendered as
`<u-…>` code chips). Renders an `<h4 class="u-display-m article-title">` whose anchor uses
`docsAnchorScroll`; `ngOnChanges` recomputes `anchorHash` via `titleToHash`. Projected content
becomes the description.

### `docs/example/example.component.ts` + `.html` (`<docs-example>`)
The example block: heading + description + (optional) live preview + highlighted code.
Inputs:
- `html` (setter) — the raw example HTML string; bypasses sanitizer via `DomSanitizer`
  (`bypassSecurityTrustHtml`) into `htmlSafe`, also stored raw in `_html` for the `<pre>`.
- `renderExample` (default `true`) — when `true`, the preview is the `[innerHTML]` of the
  sanitized HTML; when `false`, projects `<ng-content select="[example]">` (the live Angular
  demo component). **Every current component page uses `[renderExample]="false"`** with a
  `<div example><app-…-example>` child, because the examples need Angular bindings
  (`[(ngModel)]`, event handlers) that raw innerHTML can't run.
- `sectionTitle` — section heading text (→ `anchorHash`).
- `screenRoute` (optional) — renders an "Open as screen" CTA linking to a standalone route.
  **Declared but UNUSED** by every current page (no page passes it, and no such routes exist —
  see §3 gap).
- `fluid` (bool/string transform) — edge-to-edge preview.
- `alignment` (`'start'|'center'|'end'|'stretch'|'between'`, default `start`) — flex alignment
  of demo items.
- Code is rendered with `ngx-highlight-js` (`highlightChildren` + `[highlight-js] lang="html"`).

### `docs/toc/toc.component.ts` + `.html` (`<docs-toc>`)
"On this page" right-rail TOC. Scans `.chapter .article-title a[href^="#"]`, builds entries
(`depth 0` for `h4`/`docs-title`, `depth 1` for `h5`/`docs-example` section titles), assigns
ids, and tracks the active section by listening to scroll on `.page-layout`. Rebuilds on
`NavigationEnd` and via a `MutationObserver` on `.chapter`. Handles initial deep-link scroll
from `location.hash` (the second `#` in hash-routed URLs) and `history.replaceState` on click.
Runs scroll handlers outside Angular zone (`runOutsideAngular`), re-enters via `zone.run`.

### `docs/link-active.directive.ts` (`[docsLinkActive]`)
Subclasses `RouterLinkActive`; instead of toggling a CSS class it sets/removes the boolean
**`active` attribute** on the host — because `<u-navigation-rail-item>` reads `active` as an
attribute, not a class.

### `docs/shared/anchor-scroll.directive.ts` (`a[docsAnchorScroll]`)
Intercepts clicks on `href="#…"` anchors so the hash router doesn't treat the fragment as a
route; smooth-scrolls the `.page-layout` container to the target `.article-title` and updates
the URL fragment via `history.replaceState`.

### `docs/shared/title-to-hash.ts`
`titleToHash(title)` → `'#' + title.split(' ').join('-').toLowerCase()` (or `null`).

### `docs/shared/theme.service.ts` (`ThemeService`, root-provided) — LIVE & important
- Imports **`ThemeBuilder` from `@universal-material/web`** (the vendored submodule) — this is
  the one runtime coupling between the demo and the web library beyond the custom elements.
- `themeColorPresets` (8 colors), `themeColor` default `#6750a4`, `currentThemeMode` persisted
  in `localStorage`.
- `setThemeColor(color)` → `ThemeBuilder.create(color).build()` → injects the resulting CSS
  text into a `<style id="theme-styles">`. Persists to `localStorage`.
- `setThemeMode` toggles `u-light`/`u-dark` on `<html>`; `applyThemeMode` honors
  `prefers-color-scheme` for Auto. `toggleRtl` flips `localStorage.direction` + `location.reload()`.

### `docs/submenu/submenu.component.ts` + `.html` (`<docs-submenu>`) — **DEAD**
A trivial `role="group"` wrapper with a `label` input. **Not imported anywhere** (grep shows
only self-references). Ported but unused; safe to delete. (A byte-identical copy also exists in
the vendored `universal-material-web/docs/src/app/docs/submenu/`.)

---

## 3. Per-component example pages (LIVE) — `demo/src/app/components/*`

10 component folders, each a consistent two-file-pair pattern. Folders:
`checkbox`, `chip-field`, `datepicker`, `radio`, `search`, `select`, `slider`, `text-field`,
`typeahead`, `tab-bar`.

**Pattern (using `checkbox` as the canonical example):**

1. **Page component** — `components/<name>/<name>.component.ts`:
   ```ts
   import { ExampleComponent } from '@docs/docs/example/example.component';
   import { TitleComponent } from '@docs/docs/title/title.component';
   import { CheckboxExampleComponent } from './checkbox-example/checkbox-example.component';
   // @ts-ignore
   import htmlCode from './checkbox-example/checkbox-example.component.html';   // imported as TEXT
   @Component({ standalone: true,
     imports: [ExampleComponent, TitleComponent, CheckboxExampleComponent],
     schemas: [CUSTOM_ELEMENTS_SCHEMA] })
   export class CheckboxComponent { htmlCode = htmlCode; }
   ```
2. **Page template** — `<name>.component.html`:
   ```html
   <docs-title title="Checkbox" tag="u-checkbox, u-switch">…</docs-title>
   <docs-example [html]="htmlCode" [renderExample]="false" sectionTitle="Usage">
     <div example><app-checkbox-example></app-checkbox-example></div>
   </docs-example>
   ```
   So the **shown code** is the example component's HTML file imported as a string, while the
   **rendered demo** is the live Angular `<app-…-example>` component (`renderExample=false`).
3. **Example component** — `components/<name>/<name>-example/<name>-example.component.{ts,html,scss}`:
   standalone, imports `FormsModule` + **`UniversalMaterialModule` from
   `@universal-material/angular`** (the wrapper lib) + `CUSTOM_ELEMENTS_SCHEMA`, holds the demo
   state (e.g. `agree = false`).

All 10 pages call `docs-title` + `docs-example`; none pass `screenRoute`, `fluid`, or
`alignment` (grep: 31 primitive usages across the 10 page templates, all the basic shape).
Some folders also carry `.spec.ts` (datepicker, slider).

**Gap for Task 6 / future work**: `<docs-example screenRoute>` and the "Open as screen" CTA are
fully implemented in the primitive but **no route or page wires them up** — there is no
standalone (shell-less) demo route in `app.routing.ts`. If a component needs full-viewport
evaluation, the route + a `screenRoute="…"` binding still need to be added.

---

## 4. Dead / unused code (NOT wired into the live app)

Confirmed dead by grep (only self-references + their own `.spec.ts`; never imported by
`app.routing.ts`, `docs-shell`, or any component page):

### `demo/src/app/example/*` — the OLD `app-example` + StackBlitz machinery
This is the **previous-generation** example wrapper, superseded by `docs/example/`. It is the
home of the StackBlitz integration that Task 6 wants to revive.
- **`example/example.component.ts`** (`selector: 'app-example'`) — a card with a "show code"
  tab bar (HTML/TS/SCSS) and an **"open in new"** button calling `createProject()` →
  `StackBlitzService.createProject({ htmlCode, tsCode, cssCode, name })`. Inputs:
  `title`, `dashName`, `htmlCode`, `tsCode`, `cssCode`. Uses legacy `.u-card-elevated`/`.u-toolbar`
  CSS classes from `@universal-material/core`.
- **`example/example.component.html`** — the card/tab-bar/highlight UI (uses `u-tab-bar`,
  `u-tab`, `u-icon-button`, `mdi` icons).
- **`example/example.component.spec.ts`** — references `ExampleComponent` (keeps spec count up,
  otherwise dead).
- **`example/replace-all.ts`** — `replaceAll(str, search, replace)` string util used by the
  StackBlitz service for `$example-component-name` token substitution.
- **`example/stackblitz/*`** — see §5.

### `demo/src/app/navigation/*` — OLD left-nav (`<app-navigation>`) — **DEAD**
Replaced by the `u-navigation-rail` inside `docs-shell`. `NavigationComponent` is an empty
class; `navigation.component.html`/`.scss` hold the old plain-router-link drawer. Only
self-referenced (+ its `.spec.ts`). The vendored `migration/tasks/*.md` still *mention*
`navigation/navigation.component.html` line numbers, but those are stale migration notes for a
file that's no longer wired in.

> **Cleanup candidates for Task 6 (or a follow-up):** if StackBlitz is rebuilt against the new
> `docs/example/` primitive, the entire `example/` and `navigation/` folders can be deleted,
> and `@universal-material/core` may be droppable (verify no remaining `.u-card-*`/`.u-toolbar`
> usage in live pages first).

---

## 5. EXISTING StackBlitz pattern (DEAD but revivable) — `demo/src/app/example/stackblitz/*`

This is the integration Task 6 can revive. It uses the official **`@stackblitz/sdk`** to open a
generated Angular CLI project in a new StackBlitz tab.

### `stackblitz/stack-blitz.service.ts` (`StackBlitzService`, root-provided)
The core. `createProject(project: Project)`:
1. Assembles a virtual file map from **template files imported as text** (via the build
   `loader` map, see §6) — `angular.json`, `src/main.ts`, `src/index.html`,
   `src/app/app.component.{html,ts}`, `src/app/app.module.ts`.
2. Token-replaces `$example-component-name` → `project.name` (dash-case) and
   `$ExampleComponentName` → PascalCase across every template (`replaceAll` + `getPascalCaseProjectName`).
3. Writes the user's three code blocks as
   `src/app/<name>.component.{ts,scss,html}`.
4. Calls **`StackBlitzSDK.openProject({ title, description, template: 'angular-cli', files,
   dependencies })`**.
   - **Pinned deps are STALE**: `@universal-material/core: '2.0.0-alpha.20'` and
     **`@universal-material/angular: '2.0.1-alpha.47'`** — these would need updating to whatever
     the wrapper publishes, and the project still targets the *old* core CSS, not the new
     `@universal-material/web` package.

### `stackblitz/project.model.ts`
`interface Project { name; cssCode; tsCode; htmlCode }`.

### Template files (imported as strings by the service)
- **`stackblitz/main.ts`** — classic `platformBrowser().bootstrapModule(AppModule)` (NgModule
  bootstrap, **not** standalone).
- **`stackblitz/app/app.module.ts`** — declares `AppComponent` + `$ExampleComponentNameComponent`,
  imports `BrowserModule, FormsModule, UniversalMaterialModule`.
- **`stackblitz/app/app.component.ts`** — `selector: app-root`, `standalone: false`,
  external template.
- **`stackblitz/app/app.component.html`** — **empty file** (0 bytes); the real app shell HTML
  is hard-coded inline in the service (`<div class="u-container"><app-$example-component-name>`).
- **`stackblitz/app/$example-component-name.component.ts`** — placeholder component
  (`template: ''`) overwritten per-example.
- **`stackblitz/index.html`** — links the old **MDI CDN** stylesheet (`materialdesignicons`),
  not the new web fonts.
- **`stackblitz/angular.json`** — Angular CLI config; styles point to
  `node_modules/@universal-material/web/css/universal-material.css` (note: this path is the
  *only* spot already referencing the new `@universal-material/web` CSS, though the deps block
  pins the old `@universal-material/angular`/`core` — inconsistent and needs reconciling).

### What Task 6 needs to do to revive it
1. **Re-wire a UI trigger** — the new `docs/example/` primitive has no "open in StackBlitz"
   button; add one (mirroring the old `app-example` card's open-in-new icon) and call
   `StackBlitzService.createProject(...)`.
2. **Feed it the three code blocks** — current pages only import the example's `.html` as text;
   StackBlitz needs `.ts` and `.scss` too (the old `app-example` took all three as inputs).
3. **Modernize the generated project** — standalone bootstrap (or keep NgModule), correct/new
   font + CSS links, and **bump the pinned dependency versions** (`@universal-material/angular`
   / drop `core` in favor of `@universal-material/web`).
4. **Reconcile the package** — decide whether the StackBlitz project consumes
   `@universal-material/angular` (the wrapper) or `@universal-material/web` (the elements);
   today the templates mix both.

---

## 6. Build / dev wiring relevant to the docs app

- **Dev server**: `ng serve demo --port 4280` (`npm start`). `prestart` runs `build:web` to
  build the vendored web submodule first.
- **Importing files as text**: `angular.json` → demo build `options.loader` maps
  `".html": "text"` and `".scss": "text"`. This is how `import htmlCode from './…html'`
  (example pages) and the StackBlitz template imports work. (`raw-loader` is still a devDep but
  the esbuild-based `@angular/build` uses the `loader` map instead.)
- **Global styles** (`angular.json` demo `styles`): MDI font scss, `@universal-material/core`
  CSS (legacy), `highlight.js` atelier-sulphurpool-light theme, the **vendored**
  `universal-material-web/scss/universal-material.scss`, and `demo/src/styles.scss`.
- **`demo/src/styles.scss`**: docs layout globals — `.article-title`, `.hljs` background,
  monospace code font, Material Symbols helpers, small utility classes (`.d-flex`, `.p-2`, …),
  `.rtl`. (Top of file is a big block of commented-out legacy theme SCSS.)
- **Aliases** resolve via root `tsconfig.json` `paths` (see §1); demo `tsconfig.app.json`
  `extends` it.

---

## 7. Quick reference — file inventory

| Path (under `D:/Projects/universal-material-angular/`) | Status | Role |
| --- | --- | --- |
| `package.json` | live | Angular 20 workspace; `@stackblitz/sdk` dep; `start`=port 4280 |
| `tsconfig.json` | live | path aliases `@universal-material/{angular,web}`, `@docs/*` |
| `angular.json` | live | demo build: `loader` text imports, global styles, port |
| `scripts/build-web.mjs` | live | builds vendored web submodule → its dist/ |
| `demo/src/index.html` | live | fonts, base href, app-root |
| `demo/src/styles.scss` | live | docs layout globals |
| `demo/src/app/app.config.ts` | live | hash router, zoneless, ngx-mask |
| `demo/src/app/app.routing.ts` | live | 10 component routes (no screen routes) |
| `demo/src/app/app.component.{ts,html}` | live | renders `<docs-shell>`, inits theme |
| `demo/src/app/docs/shell/*` | live | app chrome (rail + top app bar + theme menus) |
| `demo/src/app/docs/title/*` | live | `<docs-title>` page header |
| `demo/src/app/docs/example/*` | live | `<docs-example>` example block |
| `demo/src/app/docs/toc/*` | live | `<docs-toc>` on-this-page nav |
| `demo/src/app/docs/link-active.directive.ts` | live | `[docsLinkActive]` → `active` attr |
| `demo/src/app/docs/shared/anchor-scroll.directive.ts` | live | `a[docsAnchorScroll]` smooth scroll |
| `demo/src/app/docs/shared/title-to-hash.ts` | live | slug helper |
| `demo/src/app/docs/shared/theme.service.ts` | live | `ThemeBuilder` from `@universal-material/web` |
| `demo/src/app/docs/submenu/*` | **dead** | `<docs-submenu>` never imported |
| `demo/src/app/components/*/` (×10) | live | per-component page + example pair |
| `demo/src/app/example/example.component.*` | **dead** | OLD `app-example` card (StackBlitz trigger) |
| `demo/src/app/example/replace-all.ts` | dead (used only by stackblitz svc) | token replace util |
| `demo/src/app/example/stackblitz/*` | **dead** | StackBlitz SDK integration to revive (Task 6) |
| `demo/src/app/navigation/*` | **dead** | OLD `<app-navigation>` drawer |
