# 03 — Web Docs App (Angular, served at :4200)

> Surface map of the **canonical docs site** for `@universal-material/web`. This is the primary
> visual-evaluation surface (see `CLAUDE.md` → "Cardinal rule" and "Verifying in the browser").
> Task 6 (per-framework docs) will extend this app, so this doc explains every primitive a new
> page or a new framework variant would touch.

Root: `D:/Projects/universal-material-web/docs` — an Angular 20 standalone app, hash-routed, served
on port 4200 by `npm run docs`. It consumes the **library source** via a tsconfig path mapping
(`@universal-material/web` → `../dist/index`), so the docs always render the freshly-`tsc`-compiled
components, not a published bundle.

---

## 1. How it boots & is served

| Concern | Where | Notes |
| --- | --- | --- |
| Dev server | `package.json` script `docs` → `run-p build:watch docs:serve` | Runs library `gulp scripts:watch` **and** `cd docs && ng serve` in parallel. |
| Pre-build | `package.json` script `predocs` → `run-p analyze docs:apis script:sass-to-ts` | Generates `apis.ts`, the custom-elements manifest, and `*.styles.ts` before serving. |
| Angular builder | `docs/angular.json` → `@angular/build:application` (esbuild-based) | `browser: src/main.ts`, polyfills `zone.js`, default config = `development` for `serve`. |
| HTML/MD as text | `docs/angular.json` → `"loader": { ".html": "text", ".md": "text" }` | **Key mechanism**: `import x from './examples/foo.html'` returns the file's *source string*. This is the Angular-20 native replacement for `raw-loader` (still a devDependency in `package.json` but the builder loader is what's actually used). |
| Entry HTML | `docs/src/index.html` | Loads Google Fonts (Roboto, Roboto Mono, Material Symbols Outlined) and the `element-internals-polyfill@1.3.9` from unpkg. Body is just `<docs-root>`. |
| App config | `docs/src/app/app.config.ts` | `provideZonelessChangeDetection()`, `provideRouter(routes, withHashLocation())`, `provideHighlightOptions(...)`, `provideMarkdown()`, `provideHttpClient()`. **Zoneless** + **hash routing** are both load-bearing (see §4, §6). |
| Root component | `docs/src/app/app.component.ts` (`docs-root`) | Just `<router-outlet>`; its constructor calls `ThemeService.initialize()` once. |

`tsconfig` path aliases (`docs/tsconfig.json`):
- `@docs/*` → `src/app/*` (used by every lazy `loadComponent` import and primitive import).
- `@universal-material/web` → `../dist/index`, `@universal-material/web/config` → `../dist/config`.

---

## 2. Two-tier routing & the shell

`docs/src/app/app.routes.ts` has **two top-level branches**:

1. **`screens/*`** — standalone full-viewport demos (e.g. `scaffold-basic`, `scaffold-list-detail`,
   `scaffold-with-top-bar`, 11 entries). These render **without the docs shell** — no nav rail, no
   TOC — so a component that needs the full viewport (scaffold, app-bar interactions, FAB anchoring)
   can be evaluated fairly. They are reached via the "Open as screen" CTA (see §3, `screenRoute`).
2. **`''` (DocsShellComponent)** — everything else is a *child route* rendered inside the shell's
   `<router-outlet>`. ~50 children grouped by path prefix: `components/*`, `utilities/*`, `layout/*`,
   `content/*`, plus `''` → `IntroductionComponent` (the install/landing page).

Every page route uses lazy `loadComponent: () => import('@docs/...').then(m => m.XComponent)`.

### The shell — `docs/src/app/docs/shell/shell.component.{ts,html,scss}`

The shell is the persistent chrome. Its template (`shell.component.html`) is built **entirely from
the library's own components** (dogfooding):

- Outer `<u-navigation-rail #navigation>` is the left nav. It hosts a `<u-top-app-bar>` (the header
  bar) in its default slot and the nav links in `slot="expanded"`.
- **Top app bar** contains: a hamburger `<u-icon-button>` that toggles `navigation.toggleDrawer`, the
  brand mark (SVG logo + "Universal Material" wordmark, links to `/`), and trailing icons: a
  **theme-color picker** (`<u-menu>` with `themeColorPresets` swatches + a native `<input type="color">`
  bound to `theme.themeColor`), a **light/dark/auto** `<u-menu>`, an **RTL toggle**, and a GitHub link.
- **Nav links** are `<u-navigation-rail-item slot="expanded" routerLink="..." docsLinkActive>` grouped
  under `<u-navigation-rail-headline>` headings: *Get started, Foundations, Colors, Layout, Components*.
  Each item has a `<span slot="icon" class="material-symbols-outlined">`. A footer link shows the
  package version (`v{{ version }}`, imported from root `package.json`) and "MIT".
- **Content area**: `<div class="page-layout" #pageLayout>` wraps `<div class="u-container chapter">
  <router-outlet></router-outlet></div>` and `<docs-toc class="page-toc">`. `.page-layout` is the
  **scroll container** (the TOC and several primitives query `.page-layout` / `.chapter` by selector —
  see §6). `#pageLayout` is passed to `<u-top-app-bar [scrollContainer]="pageLayout">` so the bar
  collapses on scroll.

> **Adding a component page** (per `CLAUDE.md` → "Docs page conventions"): (1) add a route in
> `app.routes.ts`; (2) add a `<u-navigation-rail-item routerLink="components/...">` in
> `shell.component.html` — **alphabetical within its headline group** by the visible label,
> case-insensitive; (3) add a `<docs-apis-table key="...">`; (4) re-run `gulp docs:apis`.
> NOTE: `CLAUDE.md` still phrases this as "`<u-drawer-item>` in `app.component.html`" — the current
> reality is `<u-navigation-rail-item>` in `shell.component.html`. Same intent, renamed surface.

`docs/src/app/docs/link-active.directive.ts` (`docsLinkActive`) extends Angular's `RouterLinkActive`
and, instead of toggling a CSS class, reflects an `active` **attribute** onto the host element (so the
`u-navigation-rail-item` web component picks up its own active styling).

---

## 3. The docs primitives (the reusable page widgets)

All under `docs/src/app/docs/`. Each is a standalone Angular component imported per-page.

### `docs-title` — page header — `docs/src/app/docs/title/title.component.{ts,html}`
- Inputs: `title` (string), `kind: 'component'|'utility'|'layout'|'content'|'foundation'` (default
  `component`), `tag` (comma-separated tag names, e.g. `"u-datepicker, u-range-datepicker"`).
- Renders a kind badge (icon + label from `KIND_META`), an `<h4 class="u-display-m article-title">`
  whose anchor `href` is `titleToHash(title)`, the tags as `<code>&lt;u-foo&gt;</code>`, and the
  projected description via `<ng-content>`.
- `ngContent` description sits in `.title-description`.

### `docs-example` — the SHOWN + RENDERED block — `docs/src/app/docs/example/example.component.{ts,html,scss}`
**This is the core of how an example is both displayed as code and rendered live.** Inputs:
- `html: string` (setter) — the example source. Stored as `_html` (raw, for the code block) and
  `htmlSafe = sanitizer.bypassSecurityTrustHtml(html)` (for live render).
- `sectionTitle: string` — section heading; its anchor is `titleToHash(sectionTitle)`.
- `renderExample = true` — whether to live-render the imported HTML.
- `screenRoute?: string` — when set, replaces the live preview with an "Open as screen" CTA link
  (`[routerLink]="screenRoute"`) to a `screens/*` route (for full-viewport demos).
- `fluid` (boolean, coerced) — edge-to-edge preview, stretches demo to full width.
- `alignment: 'start'|'center'|'end'|'stretch'|'between'` (default `start`) — flex alignment of the
  preview, emitted as `[attr.data-align]` and consumed by `example.component.scss`.

**The dual SHOWN/RENDERED mechanism** (`example.component.html`):
```html
<div class="example-preview">
  @if (renderExample) {
    <div [innerHTML]="htmlSafe"></div>   <!-- RENDERED: same HTML, live -->
  } @else {
    <ng-content select="[example]"></ng-content>  <!-- interactive playground -->
  }
</div>
<div class="example-code">
  <pre><code [highlight]="_html!" language="html"></code></pre>  <!-- SHOWN: syntax-highlighted source -->
</div>
```
- **Default case** (`renderExample=true`): the *same* imported HTML string is both
  `innerHTML`-rendered (live) and fed to `[highlight]` (shown as code). One source of truth →
  the rendered demo can never drift from the displayed code.
- **Interactive playground** (`renderExample="false"`): the live area is `<ng-content select="[example]">`,
  so the page projects a real Angular template (with bindings/state) via `<div example>...</div>`, while
  `[html]` still supplies the *shown* code separately. Used by menus, snackbars, typeahead, collapse,
  text-fields (verified: `docs/src/app/components/menus/menus.component.html` line ~16).

> Note: `[innerHTML]` strips Angular bindings, so the live render in the default case is **inert HTML**
> hydrated into web components by the browser's custom-element upgrade. That's fine for declarative
> demos; anything needing event handlers/state uses the `renderExample=false` playground path.

### `docs-apis-table` — the API reference — `docs/src/app/docs/apis-table/apis-table.component.{ts,html}`
- Input: `key: string`. Looks up `Apis[key]` from the generated `@docs/apis` (see §5) in `ngOnChanges`.
- Renders an `<h5 ... article-title>` ("API Reference", anchor `#api-reference`) + a
  `<u-card variant="outlined">` containing a `<table class="u-table">` with columns
  **Property / Attribute / Type / Default / Description**. The Description cell renders through
  `<markdown>` (ngx-markdown), so JSDoc with markdown formats correctly. Hidden entirely when the
  keyed array is empty/missing.

### `docs-toc` — "On this page" — `docs/src/app/docs/toc/toc.component.{ts,html}`
- Lives in the shell (`<docs-toc class="page-toc">`). Builds itself by scanning the `.chapter` DOM for
  `.article-title a[href^="#"]` anchors (the headers emitted by `docs-title` h4 → depth 0 and
  `docs-example`/`docs-apis-table` h5 → depth 1).
- Rebuilds on `NavigationEnd` and via a `MutationObserver` on `.chapter` (so dynamically-added headings
  appear). Scroll-spy: listens to `.page-layout` scroll (outside Angular zone) and marks the active
  entry; clicking an entry scrolls `.page-layout` and `history.replaceState`s the fragment.
- Initial-fragment handling parses the **second** `#` out of the hash URL (e.g.
  `#/components/badges#api-reference`) to deep-link to a section.

### Shared helpers — `docs/src/app/docs/shared/`
- `title-to-hash.ts`: `titleToHash(title)` → `#lower-cased-words-joined-by-dashes` (or `null`).
  Used by title, example, and apis-table to make stable section anchors.
- `anchor-scroll.directive.ts` (`a[docsAnchorScroll]`): intercepts clicks on `#`-anchors so the
  **hash router doesn't treat the fragment as a route**; scrolls `.page-layout` to the target and
  updates the fragment via `history.replaceState`. Critical because the app uses `withHashLocation()`.
- `theme.service.ts`: see §7.
- `submenu/` (`docs-submenu`) — a small grouping wrapper (sets `role="group"`); minor.

### Per-page component shape (the convention task 6 will follow)
Example: `docs/src/app/components/badges/`
- `badges.component.ts` — standalone, imports `ApisTableComponent`, `ExampleComponent`, `TitleComponent`;
  imports each example as a string: `import usageHtml from './examples/usage.html'` and exposes it as a
  field (`usageHtml = usageHtml`).
- `badge.component.html` (template) — `<docs-title title="Badges" tag="u-badge">desc</docs-title>`,
  one `<docs-example sectionTitle="Usage" [html]="usageHtml">` per example, then
  `<docs-apis-table key="badge">`.
- `examples/*.html` — the literal example source (plain HTML using `u-*` tags), e.g.
  `examples/usage.html`. This single file is both shown and rendered.
- `*.component.scss` — usually `:host { display: block }`.

---

## 4. The API table generation (`gulp docs:apis`)

Despite `CLAUDE.md` saying the task lives in `gulpfile.js`, the actual implementation is in
**`gulp-tasks/docs.js`** + **`gulp-tasks/docs-api.js`**, registered via `import './gulp-tasks/docs.js'`
in the root `gulpfile.js`. npm script: `docs:apis` → `gulp -f gulpfile.js docs:apis`. A watch variant
(`docs:apis:watch`) re-runs on `src/**/*.ts` changes.

Pipeline (`gulp-tasks/docs.js` → `buildApis`):
1. Uses **`ts-morph`** to load `src/**/*.ts` into a `Project`.
2. For each **non-abstract** class, calls `setClassInfo(classDeclaration, classInfo)`.
3. Keys the result by `apiName = lowerFirst(className)` (e.g. class `Button` → `button`, `TopAppBar`
   → `topAppBar`). This `apiName` is what `<docs-apis-table key="...">` references.
4. Writes `export const Apis = {...}` to **`docs/src/app/apis.ts`** (gitignored, regenerated).

`setClassInfo` (`gulp-tasks/docs-api.js`) per property/get-accessor:
- Skips static, `private`/`protected`, and `#`/`_`-prefixed members.
- `attribute`: read from the `@property({ attribute: '...' })` decorator option, else falls back to the
  property name (`null` when there's no `@property`).
- `type`: `getBaseTypeOfLiteralType().getText()`; union types (`'a' | 'b'`) collapse to `'string'`;
  `import(...).` prefixes are stripped.
- `default`: the initializer text (or `'undefined'`/`null`).
- `description`: the **first JSDoc block's** description (markdown-capable).
- **Recurses into the base class** (`classDeclaration.getBaseClass()`), so inherited props (e.g. from
  `ButtonWrapper`, `FieldBase`) appear in the table.

> Consequence for editing: after changing a `@property` JSDoc/default/attribute, run `gulp docs:apis`
> (or rely on `predocs`) to refresh `docs/src/app/apis.ts`. Per `CLAUDE.md` editing checklist step 6.

---

## 5. The generated `apis.ts`
`docs/src/app/apis.ts` (gitignored) — a single `export const Apis = { <apiName>: [ {type, attribute,
default, name, description}, ... ], ... }`. Imported as `@docs/apis` by `apis-table.component.ts`.
Example top-level keys observed: `topAppBar`, `badge`, etc. (one per concrete component class).

---

## 6. Routing / navigation behaviors worth knowing (for task 6)

- **Hash location** (`withHashLocation()`): URLs look like `http://localhost:4200/#/components/badges`.
  Section deep-links append a *second* hash: `#/components/badges#api-reference`. The
  `docsAnchorScroll` directive and the TOC both special-case this dual-hash form.
- **Zoneless change detection**: the app uses `provideZonelessChangeDetection()`. The TOC and theme
  service therefore manage their own change detection (`ChangeDetectorRef.markForCheck()`, `NgZone`
  run/runOutsideAngular) and DOM observation explicitly — do not assume automatic CD from DOM events.
- **`.page-layout` is the scroll container** and **`.chapter` is the content root** — both are queried
  by `document.querySelector` in the TOC and anchor-scroll directive. Any new shell layout must keep
  those class names or update all three consumers (`toc.component.ts`, `anchor-scroll.directive.ts`,
  `shell.component.ts`'s `navigateToAnchor`).
- **Screens vs shell**: full-viewport demos go under `screens/*` (no shell) and are linked from a
  `docs-example` via `screenRoute`. A per-framework docs effort that needs isolated full-page demos
  should follow this split.

---

## 7. Styling / theme / fonts (M3)

- **Global styles** (`docs/angular.json` → `styles`): in order —
  1. `../scss/universal-material.scss` — the **library's own M3 SCSS** (tokens, mixins, color system).
  2. `../node_modules/highlight.js/styles/base16/atelier-sulphurpool-light.css` — the **highlight.js
     theme** for the code blocks shown by `docs-example`.
  3. `src/styles.scss` — docs-only global tweaks.
- **`docs/src/styles.scss`** sets `--u-font-family: Roboto` and `--u-font-monospace: "Roboto Mono"` on
  `body`, overrides `.hljs { background-color: var(--u-color-surface-container) }` so the highlight.js
  theme blends with M3 surfaces, styles `.article-title`, `markdown code` / `.api-card code`, and a few
  utility classes (`.d-flex`, `.position-relative`, `box-sizing: border-box`, etc.).
- **Fonts** are CDN-loaded in `docs/src/index.html`: Roboto (300–700 + italics), Roboto Mono, and
  **Material Symbols Outlined** (`opsz,wght,FILL,GRAD@24,400,0..1,0`). Icons in the app are
  `<span class="material-symbols-outlined">icon_name</span>`. `.material-symbols-fill` applies
  `font-variation-settings: 'FILL' 1`.
- **M3 tokens** are CSS custom properties from the library (`--u-color-*`, `--u-spacing-*`,
  `--u-headline-*`, `--u-display-*`, etc.). Docs CSS references them directly
  (e.g. `var(--u-color-on-surface-variant)`, `var(--u-color-surface-container-lowest)`).
- **`example.component.scss`** styles the SHOWN/RENDERED block: `.example-block` (outlined card with a
  subtle radial-gradient accent), `.example-preview` (flex, gap 16px, the live area), `.example-code`
  (surface-container background, 13px monospace), `data-align` alignment variants, `.fluid`
  edge-to-edge mode, and the `.example-screen-cta` link styling.

### Theming runtime — `docs/src/app/docs/shared/theme.service.ts`
- `ThemeService` (root-provided) is `initialize()`d once from `AppComponent`. It manages:
  - **Theme color**: `setThemeColor(color)` calls `ThemeBuilder.create(color).build()` from
    `@universal-material/web`, injects the resulting CSS string into a `<style id="theme-styles">` in
    `<head>`, and persists to `localStorage['currentThemeColor']`. The shell exposes 8 presets +
    a custom `<input type="color">` (throttled 1s via an RxJS `Subject`).
  - **Light/Dark/Auto** (`ThemeMode` enum): toggles `u-light` / `u-dark` classes on
    `document.documentElement`; Auto follows `prefers-color-scheme`. Persisted in `localStorage`.
  - **RTL**: `toggleRtl()` flips `localStorage['direction']` and `document.body[dir=rtl]`, then reloads.
  - There is an `ignoreThemeColor` localStorage escape hatch (used to pin a fixed theme).

---

## 8. Key dependencies (docs-specific)
- `ngx-highlightjs` (`Highlight` directive, `provideHighlightOptions`) — code highlighting; languages
  lazy-loaded: shell, javascript, typescript, css, xml.
- `ngx-markdown` (`MarkdownModule`, `provideMarkdown`) — renders JSDoc descriptions in the API table.
- `ts-morph` — drives `docs:apis` JSDoc/property extraction (build-time only).
- Angular 20 standalone + `@angular/build` esbuild builder; `withHashLocation()`; zoneless CD.

---

## 9. Pointers for Task 6 (per-framework docs)
- The **example source** lives in framework-agnostic `examples/*.html` files (plain `u-*` markup) that
  are imported as strings via the `.html`→`text` loader. A per-framework variant would either reuse
  these strings or add framework-specific example files alongside them.
- The **dual SHOWN/RENDERED contract** is the extension point: `docs-example` shows `[html]` as code and
  renders it (or projects `[example]` content). A React/Vue/Angular-template variant would change *what
  gets rendered in the preview* while keeping the shown-code path, or add a parallel `docs-example`-like
  primitive that swaps the highlight `language` and the live-render strategy.
- The **API table is framework-neutral** — it documents the web components' attributes/properties, which
  are identical across frameworks. Likely reused verbatim.
- The **shell, routing split (shell vs screens), TOC, anchors, and theming** are app-level and would be
  shared by any framework tab/variant.
