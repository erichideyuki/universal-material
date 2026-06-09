# Research — Embedding runnable per-framework examples via StackBlitz (Task 6)

**Goal.** Let every docs example on the `@universal-material/web` site offer a runnable,
editable project in **each supported framework** (Angular, React, Vue, Svelte, and plain
HTML/Vanilla), opened or embedded with the official **`@stackblitz/sdk`**. This file is the
self-contained reference for *how to generate a project per framework*, *how to embed it in
the Angular docs app*, the *gotchas*, and a *code sketch*.

> Scope note. `@universal-material/web` is a **pure web-components library** (Lit elements,
> `<u-*>` tags, registered by `import '@universal-material/web'`). There is **no per-framework
> wrapper package published yet** — only a separate Angular wrapper repo
> (`@universal-material/angular`) exists in a sibling workspace. So "per-framework examples"
> means *consuming the same web components from each framework's idioms* (JSX `className`,
> Vue `v-model`/`.prop`, Svelte `bind:`), **plus** an Angular variant that may use the wrapper
> module. The web components themselves render identically everywhere; only the host-framework
> wiring (event names, two-way binding, `CUSTOM_ELEMENTS_SCHEMA` analog) differs.

---

## 0. Background: the existing (dormant) StackBlitz integration

There is a **working but dead** StackBlitz integration in the sibling Angular workspace, which
Task 6 is reviving/generalizing. Key files (under
`D:/Projects/universal-material-angular/demo/src/app/example/`):

- `stackblitz/stack-blitz.service.ts` — `StackBlitzService.createProject(project)`:
  1. Builds a virtual file map from **template files imported as text** (`angular.json`,
     `src/main.ts`, `src/index.html`, `src/app/app.component.{html,ts}`, `src/app/app.module.ts`).
  2. Token-replaces `$example-component-name` → dash-case name and `$ExampleComponentName` →
     PascalCase across every template (`replaceAll` + `getPascalCaseProjectName`).
  3. Writes the user's three code blocks as `src/app/<name>.component.{ts,scss,html}`.
  4. Calls `StackBlitzSDK.openProject({ title, description, template: 'angular-cli', files, dependencies })`.
- `stackblitz/project.model.ts` — `interface Project { name; cssCode; tsCode; htmlCode }`.
- `replace-all.ts` — naive `replaceAll(str, search, replace)` (pre-ES2021 loop).

**What is stale and must change for Task 6:**
- It pins **old packages**: `@universal-material/core@2.0.0-alpha.20` and
  `@universal-material/angular@2.0.1-alpha.47`. The new world is `@universal-material/web@3.x`
  (web components) and, where relevant, a modern `@universal-material/angular`.
- `index.html` links the legacy **MDI** icon CDN, not the new Roboto / Material Symbols fonts.
- It only ever generates an **Angular** project (`template: 'angular-cli'`). Task 6 wants
  one generator per framework.
- It uses `openProject` (new tab). The docs may prefer **`embedProject`** (inline iframe) for a
  "live playground" feel, or keep open-in-new-tab for a lighter page.

The pattern (text-templated files + token replacement + a single SDK call) is exactly right and
should be **kept and parameterized by framework**.

---

## 1. The `@stackblitz/sdk` API surface

Install: `npm i @stackblitz/sdk` (the Angular workspace already declares `@stackblitz/sdk@^1.3.0`).
Import default: `import sdk from '@stackblitz/sdk';` (the dead code uses
`import StackBlitzSDK from '@stackblitz/sdk'` — same default export).

### 1.1 Methods

| Method | Signature | Behavior |
| --- | --- | --- |
| `sdk.openProject(project, openOptions?)` | `(Project, OpenOptions?) => void` | Creates a brand-new project from in-memory `files`+`dependencies` and **opens it in a new tab** (or current window via `newWindow: false`). |
| `sdk.embedProject(elOrId, project, embedOptions?)` | `(string \| HTMLElement, Project, EmbedOptions?) => Promise<VM>` | Creates a new project and **embeds it inline** by replacing the target element with an `<iframe>`. Resolves to a `VM` handle. |
| `sdk.openProjectId(id, openOptions?)` | `(string, OpenOptions?) => void` | Opens an **existing** stackblitz.com project by id in a new tab. |
| `sdk.embedProjectId(elOrId, id, embedOptions?)` | `(…, string, …) => Promise<VM>` | Embeds an existing project by id. |
| `sdk.openGithubProject(repoPath, openOptions?)` | `(string, OpenOptions?) => void` | Opens a **public GitHub repo** (`'user/repo'`, optionally `'user/repo/tree/branch/dir'`) as a project. |
| `sdk.embedGithubProject(elOrId, repoPath, embedOptions?)` | `(…, string, …) => Promise<VM>` | Embeds a public GitHub repo. |
| `sdk.connect(iframe)` | `(HTMLIFrameElement) => Promise<VM>` | Attach a `VM` to an existing stackblitz `<iframe>` you rendered yourself. |

**Which to use for the docs (recommendation):**
- **`openProject`** — best default. One method call, no iframe to size/manage, generates the
  project entirely from the docs page's example source. Use it for the "Open in StackBlitz"
  button (matches the existing dead `app-example` behavior). Lightest on the docs page.
- **`embedProject`** — use only if we want an **inline live playground** under the static
  preview. Costs a heavy WebContainers/EngineBlock iframe per embed; prefer `clickToLoad: true`
  so the heavy boot only happens when the reader clicks "Run". Returns a `VM` if we want to push
  later edits (`vm.applyFsDiff`).
- **`openGithubProject` / `embedGithubProject`** — *not* a fit here, because our example source
  is generated on the fly from docs strings, not committed per-example to a repo. (Only useful if
  we maintain a `examples/<framework>` template repo and pass a folder path — more maintenance.)

### 1.2 `Project` object

```ts
interface Project {
  title: string;
  description: string;
  template: ProjectTemplate;          // see §1.4
  files: Record<string, string>;      // path → file contents (the whole virtual project)
  dependencies?: Record<string, string>;  // EngineBlock only — ignored by 'node'
  settings?: { compile?: { trigger?: 'auto'|'keystroke'|'save', action?: 'hmr'|'refresh', clearConsole?: boolean } };
  tags?: string[];
}
```

### 1.3 `OpenOptions` / `EmbedOptions`

Common to both (embed-only ones noted):

| Option | Type | Notes |
| --- | --- | --- |
| `openFile` | `string \| string[]` | File(s) to show in the editor on load (e.g. `'src/App.tsx'`). Comma/array opens a split. |
| `view` | `'editor' \| 'preview' \| 'default'` | Initial pane. `'preview'` hides the code for a clean demo. |
| `theme` | `'dark' \| 'light' \| 'default'` | Editor theme. |
| `newWindow` | `boolean` | **`open*` only.** `false` opens in the current tab. Default `true`. |
| `clickToLoad` | `boolean` | **`embed*` only.** Shows a "Run this project" overlay; defers the heavy boot until clicked. **Use this for inline embeds.** |
| `height` | `number` | **`embed*` only.** iframe height in px. |
| `width` | `number` | **`embed*` only.** iframe width (usually omit → 100%). |
| `hideExplorer` | `boolean` | Hide the file tree/activity bar. |
| `hideNavigation` | `boolean` | Hide the preview URL bar (embeds). |
| `hideDevTools` | `boolean` | Hide the console panel. |
| `devToolsHeight` | `number` (0–100) | Console height %. |
| `terminalHeight` | `number` (0–100) | Terminal height % (WebContainers/`node` only). |
| `forceEmbedLayout` | `boolean` | Force the compact embed chrome (deprecated-ish; usually unneeded). |
| `showSidebar` | `boolean` | Sidebar open on load. |
| `startScript` | `string` | **`node` template only.** npm script to run instead of the default `dev`/`start`. |
| `origin` | `string` | Enterprise/self-hosted instance origin. |

### 1.4 Templates — EngineBlock vs WebContainers (`node`)

Valid `template` values:

```
'angular-cli' | 'create-react-app' | 'html' | 'javascript' | 'polymer' | 'typescript' | 'vue' | 'node'
```

Two execution environments:

- **EngineBlock** (`angular-cli`, `create-react-app`, `html`, `javascript`, `typescript`,
  `polymer`, `vue`): legacy in-browser bundler. **Dependencies come from `project.dependencies`**;
  a `package.json` file is *not* used to resolve them (include one anyway for download fidelity,
  but keep both in sync). Boots fast, but the toolchain is fixed (no custom Vite config, no
  arbitrary npm scripts). Good for the **Angular** (`angular-cli`) and quick **Vanilla/HTML**
  examples.
- **WebContainers** (`template: 'node'`): a real Node sandbox in the browser. **You choose the
  build tool** (almost always **Vite**). **Dependencies and devDependencies MUST live in
  `package.json`**; the `project.dependencies` field is **ignored**. Boots slower (real
  `npm install`) but supports modern **React / Vue / Svelte (Vite)** with HMR exactly as a local
  dev server. This is the right environment for the React/Vue/Svelte variants.

> **Decision: per-framework template mapping**
> | Framework | `template` | Build tool | Deps via |
> | --- | --- | --- | --- |
> | Vanilla / HTML | `'node'` (Vite) — or `'html'` for a no-build CDN example | Vite (or none) | `package.json` (or `<script type=importmap>` for pure HTML) |
> | Angular | `'angular-cli'` (EngineBlock) | Angular CLI | `project.dependencies` |
> | React | `'node'` | Vite (`@vitejs/plugin-react`) | `package.json` |
> | Vue | `'node'` | Vite (`@vitejs/plugin-vue`) | `package.json` |
> | Svelte | `'node'` | Vite (`@sveltejs/vite-plugin-svelte`) | `package.json` |
>
> Using `'node'`+Vite for React/Vue/Svelte (instead of `create-react-app`/`vue` EngineBlock
> templates) is what StackBlitz's own current starters do, gives HMR, and lets us pin
> `@universal-material/web` in `package.json` like a real project.

### 1.5 The `VM` handle (only from `embed*`)

```ts
const vm = await sdk.embedProject(el, project, opts);
await vm.applyFsDiff({ create: { 'src/App.tsx': '…' }, destroy: ['old.ts'] }); // live edit
const files = await vm.getFsSnapshot();
const deps  = await vm.getDependencies();
await vm.editor.openFile('src/App.tsx');
await vm.editor.setView('preview');
const url = await vm.preview.getUrl();
await vm.preview.setUrl('/route');
```

Use `applyFsDiff` if we ever want a single embedded VM whose source we swap when the reader
toggles framework — cheaper than re-embedding. For a first version, re-calling `embedProject`
per toggle is simpler.

---

## 2. How to generate a project, per framework

All generators produce a `Project` object the same way the dead `StackBlitzService` does:
template strings + token replacement + the example's source slotted in. Keep templates as
**text files imported via the Angular build's `loader` map** (`".html": "text"`,
`".ts": "text"`, etc.) or as inline template literals in the generator service.

The single shared input is the example: a `<u-*>`-based snippet. For frameworks, the **same
markup** is adapted (attribute casing + event/binding syntax). A reasonable model:

```ts
interface ExampleSource {
  name: string;                 // dash-case, e.g. 'checkbox-basic'
  title: string;
  // The web-component markup, per framework dialect. At minimum provide `html`
  // (works for Vanilla + Angular templates); React/Vue/Svelte can derive from it
  // or be authored explicitly when bindings are non-trivial.
  html: string;                 // <u-checkbox checked>…</u-checkbox>
  ts?: string;                  // optional component logic
  scss?: string;                // optional styles
}
```

The web library is registered the same way in every framework: a single side-effect import
`import '@universal-material/web';` in the entry file. That defines all `<u-*>` custom elements.
Plus the **fonts/icons + element-internals polyfill** the docs site uses (Roboto, Roboto Mono,
Material Symbols Outlined, and `element-internals-polyfill` — see `docs/src/index.html`).

### 2.1 Vanilla / HTML (`template: 'node'` + Vite, or pure `'html'`)

Simplest, no framework wiring. **`node`+Vite** version:

`files`:
- `index.html` — links the three Google Fonts, mounts `<div id="app">`, `<script type="module" src="/main.js">`.
- `main.js` — `import '@universal-material/web'; import 'element-internals-polyfill';` then `document.querySelector('#app').innerHTML = EXAMPLE_HTML;`
- `package.json` — `{ "scripts": { "dev": "vite" }, "dependencies": { "@universal-material/web": "^3.9.0" }, "devDependencies": { "vite": "^5", "element-internals-polyfill": "^1.3.9" } }`
- `vite.config.js` — empty/default.

(A pure-`'html'` EngineBlock variant can skip the build and use an **import map** +
`https://esm.sh/@universal-material/web` — nice for a zero-dependency "view source" but you lose
local pinning and HMR.)

### 2.2 Angular (`template: 'angular-cli'`, EngineBlock)

Mirrors the existing dead generator, modernized:
- `dependencies` (EngineBlock!): `{ "@universal-material/web": "^3.9.0", "@universal-material/angular": "<current>" }` (drop `@universal-material/core`).
- `angular.json` — `styles` includes the web library CSS if shipped, otherwise rely on the fonts in `index.html`. (The dead config pointed `styles` at `node_modules/@universal-material/web/css/universal-material.css`.)
- `src/main.ts` — standalone bootstrap (`bootstrapApplication(AppComponent)`), and crucially `import '@universal-material/web';` so the custom elements register.
- `src/app/app.component.ts` — standalone, `schemas: [CUSTOM_ELEMENTS_SCHEMA]`, imports the Angular wrapper module if the example needs `[(ngModel)]` bindings; template = the example HTML.
- `src/index.html` — the three Google Fonts (replace the legacy MDI CDN).

### 2.3 React (`template: 'node'` + Vite)

`files`:
- `index.html` — fonts + `<div id="root">` + `<script type="module" src="/src/main.tsx">`.
- `package.json`:
  ```json
  {
    "scripts": { "dev": "vite", "build": "vite build" },
    "dependencies": {
      "@universal-material/web": "^3.9.0",
      "react": "^18.3.0",
      "react-dom": "^18.3.0"
    },
    "devDependencies": {
      "@vitejs/plugin-react": "^4.3.0",
      "vite": "^5.4.0",
      "element-internals-polyfill": "^1.3.9"
    }
  }
  ```
- `vite.config.ts` — `import react from '@vitejs/plugin-react'; export default { plugins: [react()] }`.
- `src/main.tsx` — `import '@universal-material/web'; import 'element-internals-polyfill';` then `createRoot(...).render(<App/>)`.
- `src/App.tsx` — the example. **React caveat:** custom-element **props** that aren't strings
  must be set imperatively or via a ref (React <19 sets everything as attributes); booleans like
  `checked` and array values (`u-chip-field.value`) need a `ref` + `el.checked = …`. React 19
  passes properties to custom elements natively, so authoring against React 19 simplifies this.
  Events are camel-cased differently — listen via `ref.addEventListener('change', …)`.

### 2.4 Vue (`template: 'node'` + Vite)

`files`:
- `index.html` — fonts + `<div id="app">` + `<script type="module" src="/src/main.ts">`.
- `package.json` — deps `@universal-material/web`, `vue@^3.5`; devDeps `@vitejs/plugin-vue@^5`, `vite`, `element-internals-polyfill`.
- `vite.config.ts`:
  ```ts
  import vue from '@vitejs/plugin-vue';
  export default {
    plugins: [vue({
      template: { compilerOptions: { isCustomElement: (t) => t.startsWith('u-') } }
    })]
  };
  ```
  **The `isCustomElement` predicate is mandatory** — without it Vue warns/fails on unknown
  `<u-*>` tags.
- `src/main.ts` — `import '@universal-material/web'; import 'element-internals-polyfill';` + `createApp(App).mount('#app')`.
- `src/App.vue` — the example. Vue handles custom-element **props vs attributes** well; use
  `:checked.prop="x"` / `v-model` analogs and `@change` listeners. Boolean/array props pass as
  DOM properties when you use the `.prop` modifier.

### 2.5 Svelte (`template: 'node'` + Vite)

`files`:
- `index.html` — fonts + `<div id="app">` + `<script type="module" src="/src/main.ts">`.
- `package.json` — deps `@universal-material/web`; devDeps `svelte@^4`, `@sveltejs/vite-plugin-svelte@^3`, `vite`, `element-internals-polyfill`.
- `vite.config.ts` — `import { svelte } from '@sveltejs/vite-plugin-svelte'; export default { plugins: [svelte()] }`.
- `src/main.ts` — `import '@universal-material/web'; import 'element-internals-polyfill';` + `new App({ target: document.getElementById('app') })`.
- `src/App.svelte` — the example. Svelte sets DOM **properties** when they exist on the element,
  so `<u-checkbox checked={x}>` and `bind:value` largely "just work"; events via `on:change`.

### 2.6 Shared bits across all generators

- One side-effect import: `import '@universal-material/web';` registers every `<u-*>`.
- `import 'element-internals-polyfill';` — the docs site loads this (form-associated custom
  elements / `ElementInternals`); include it so form components behave in older engines.
- Fonts: link the three Google Fonts the docs use (Roboto, Roboto Mono, Material Symbols
  Outlined) in every `index.html`.
- Pin `@universal-material/web` to the **current `package.json` version** (today `3.9.0` →
  `"^3.9.0"`). Read it from the docs build rather than hard-coding so it can't drift (the dead
  Angular code hard-codes a version string — don't repeat that).
- Token replacement: reuse the `$example-component-name` / `$ExampleComponentName` substitution
  approach (or template literals) to splice `ExampleSource` into the framework scaffold.

---

## 3. Embedding in the Angular docs app

The docs example block is **`docs-example`**
(`D:/Projects/universal-material-web/docs/src/app/docs/example/example.component.ts`,
selector `docs-example`), used across all component pages like
`<docs-example [html]="basicHtml" sectionTitle="Basic" fluid>`. It already has the static
preview + highlighted-code UI. Task 6 adds a StackBlitz affordance here.

### 3.1 Add a `StackBlitzService` to the web docs app

Port a modernized service into `docs/src/app/` (do **not** depend on the sibling Angular
workspace). It owns: the per-framework scaffolds (template strings), version resolution, and the
SDK calls. Sketch in §4.

### 3.2 Wire a trigger into `docs-example`

Two UX options:

1. **Open in new tab (recommended first cut).** Add an "Open in StackBlitz" button (mirroring the
   dead `app-example`'s open-in-new icon) with a small framework menu (Angular / React / Vue /
   Svelte / Vanilla). On click → `stackblitz.open(framework, exampleSource)` →
   `sdk.openProject(project, { openFile, view: 'editor', newWindow: true })`.
2. **Inline embed (richer).** Add a "Run / Edit live" toggle that, on first click, calls
   `sdk.embedProject(hostEl, project, { clickToLoad: true, height: 500, view: 'preview', hideExplorer: true })`
   into a `<div #embedHost>` placed under the preview. Keep `clickToLoad: true` so the heavy boot
   is opt-in. Store the returned `VM` if we later allow framework switching via
   `vm.applyFsDiff`.

`docs-example` currently only receives `[html]`. To support per-framework source, extend it to
accept an `ExampleSource`-like input (or keep `html` and let the service derive the framework
variants where they're mechanical). For non-trivial bindings, allow per-framework override files.

### 3.3 Build wiring (already mostly present)

- The Angular docs build imports `*.html` as **text** (the web docs app uses raw imports for the
  example HTML strings; the sibling app uses the `loader` map). Use the same mechanism to import
  the framework scaffold templates as strings, or inline them as template literals in the service
  to avoid build-config coupling.
- `@stackblitz/sdk` is tiny and framework-agnostic; add it to the **docs** `package.json`
  (the sibling workspace already has `@stackblitz/sdk@^1.3.0` as precedent).
- No server piece needed — the SDK POSTs the generated files to stackblitz.com from the browser.

---

## 4. Code sketch (`@stackblitz/sdk`)

```ts
// docs/src/app/docs/stackblitz/stackblitz.service.ts
import { Injectable } from '@angular/core';
import sdk, { type Project, type OpenOptions, type EmbedOptions } from '@stackblitz/sdk';

export type Framework = 'vanilla' | 'angular' | 'react' | 'vue' | 'svelte';

export interface ExampleSource {
  name: string;          // 'checkbox-basic'
  title: string;
  html: string;          // <u-checkbox checked>Agree</u-checkbox>
  ts?: string;
  scss?: string;
}

// Pin to the library version the docs were built against (read from package.json at build time
// rather than hard-coding — shown literal here for clarity).
const WEB_VERSION = '^3.9.0';

const FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined">
`.trim();

@Injectable({ providedIn: 'root' })
export class StackBlitzService {
  /** Open the example in a new StackBlitz tab. */
  open(framework: Framework, ex: ExampleSource): void {
    const { project, openFile } = this.buildProject(framework, ex);
    const opts: OpenOptions = { openFile, view: 'editor', newWindow: true };
    sdk.openProject(project, opts);
  }

  /** Embed the example inline (click-to-load). Returns the StackBlitz VM. */
  async embed(host: HTMLElement, framework: Framework, ex: ExampleSource) {
    const { project, openFile } = this.buildProject(framework, ex);
    const opts: EmbedOptions = {
      openFile, view: 'preview', clickToLoad: true,
      height: 500, hideExplorer: true, hideNavigation: true,
    };
    return sdk.embedProject(host, project, opts); // Promise<VM>
  }

  private buildProject(framework: Framework, ex: ExampleSource): { project: Project; openFile: string } {
    switch (framework) {
      case 'react':   return this.react(ex);
      case 'vue':     return this.vue(ex);
      case 'svelte':  return this.svelte(ex);
      case 'angular': return this.angular(ex);
      default:        return this.vanilla(ex);
    }
  }

  // ---- React: WebContainers ('node') + Vite. Deps go in package.json. ----
  private react(ex: ExampleSource) {
    const files: Record<string, string> = {
      'index.html':
`<!doctype html><html><head><meta charset="utf-8">${FONTS}</head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
      'package.json': JSON.stringify({
        name: ex.name,
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { '@universal-material/web': WEB_VERSION, react: '^18.3.0', 'react-dom': '^18.3.0' },
        devDependencies: { '@vitejs/plugin-react': '^4.3.0', vite: '^5.4.0', 'element-internals-polyfill': '^1.3.9' },
      }, null, 2),
      'vite.config.ts':
`import react from '@vitejs/plugin-react';\nexport default { plugins: [react()] };`,
      'src/main.tsx':
`import '@universal-material/web';\nimport 'element-internals-polyfill';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\ncreateRoot(document.getElementById('root')!).render(<App />);`,
      'src/App.tsx':
`export default function App() {\n  return (\n    <>\n      ${ex.html /* author JSX-safe markup, or transform attrs */}\n    </>\n  );\n}`,
    };
    return {
      project: {
        title: ex.title, description: `${ex.title} — @universal-material/web (React)`,
        template: 'node', files, // NOTE: dependencies field IGNORED for 'node'; they live in package.json
      },
      openFile: 'src/App.tsx',
    };
  }

  // ---- Vue: 'node' + Vite. isCustomElement predicate is REQUIRED. ----
  private vue(ex: ExampleSource) {
    const files: Record<string, string> = {
      'index.html':
`<!doctype html><html><head><meta charset="utf-8">${FONTS}</head>
<body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>`,
      'package.json': JSON.stringify({
        name: ex.name, scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { '@universal-material/web': WEB_VERSION, vue: '^3.5.0' },
        devDependencies: { '@vitejs/plugin-vue': '^5.1.0', vite: '^5.4.0', 'element-internals-polyfill': '^1.3.9' },
      }, null, 2),
      'vite.config.ts':
`import vue from '@vitejs/plugin-vue';\nexport default { plugins: [vue({ template: { compilerOptions: { isCustomElement: (t) => t.startsWith('u-') } } })] };`,
      'src/main.ts':
`import '@universal-material/web';\nimport 'element-internals-polyfill';\nimport { createApp } from 'vue';\nimport App from './App.vue';\ncreateApp(App).mount('#app');`,
      'src/App.vue':
`<template>\n  ${ex.html}\n</template>\n<script setup lang="ts"></script>`,
    };
    return {
      project: { title: ex.title, description: `${ex.title} — @universal-material/web (Vue)`, template: 'node', files },
      openFile: 'src/App.vue',
    };
  }

  // ---- Svelte: 'node' + Vite. ----
  private svelte(ex: ExampleSource) {
    const files: Record<string, string> = {
      'index.html':
`<!doctype html><html><head><meta charset="utf-8">${FONTS}</head>
<body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>`,
      'package.json': JSON.stringify({
        name: ex.name, scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { '@universal-material/web': WEB_VERSION },
        devDependencies: { svelte: '^4.2.0', '@sveltejs/vite-plugin-svelte': '^3.1.0', vite: '^5.4.0', 'element-internals-polyfill': '^1.3.9' },
      }, null, 2),
      'vite.config.ts':
`import { svelte } from '@sveltejs/vite-plugin-svelte';\nexport default { plugins: [svelte()] };`,
      'src/main.ts':
`import '@universal-material/web';\nimport 'element-internals-polyfill';\nimport App from './App.svelte';\nnew App({ target: document.getElementById('app')! });`,
      'src/App.svelte':
`<script lang="ts"></script>\n${ex.html}`,
    };
    return {
      project: { title: ex.title, description: `${ex.title} — @universal-material/web (Svelte)`, template: 'node', files },
      openFile: 'src/App.svelte',
    };
  }

  // ---- Angular: 'angular-cli' (EngineBlock). Deps go in project.dependencies. ----
  private angular(ex: ExampleSource) {
    const files: Record<string, string> = {
      'src/index.html': `<!doctype html><html><head><meta charset="utf-8">${FONTS}</head><body><app-root></app-root></body></html>`,
      'src/main.ts':
`import '@universal-material/web';\nimport { bootstrapApplication } from '@angular/platform-browser';\nimport { AppComponent } from './app/app.component';\nbootstrapApplication(AppComponent);`,
      'src/app/app.component.ts':
`import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';\nimport { FormsModule } from '@angular/forms';\n@Component({\n  selector: 'app-root', standalone: true, imports: [FormsModule],\n  schemas: [CUSTOM_ELEMENTS_SCHEMA],\n  template: \`${ex.html}\`,\n})\nexport class AppComponent {}`,
      'angular.json': '/* angular-cli config; styles can rely on the linked fonts */',
    };
    return {
      project: {
        title: ex.title, description: `${ex.title} — @universal-material/web (Angular)`,
        template: 'angular-cli', files,
        dependencies: { '@universal-material/web': WEB_VERSION /*, '@universal-material/angular': '<current>' */ },
      },
      openFile: 'src/app/app.component.ts',
    };
  }

  // ---- Vanilla: 'node' + Vite (or pure 'html' with an import map). ----
  private vanilla(ex: ExampleSource) {
    const files: Record<string, string> = {
      'index.html':
`<!doctype html><html><head><meta charset="utf-8">${FONTS}</head>
<body><div id="app"></div><script type="module" src="/main.js"></script></body></html>`,
      'package.json': JSON.stringify({
        name: ex.name, scripts: { dev: 'vite' },
        dependencies: { '@universal-material/web': WEB_VERSION },
        devDependencies: { vite: '^5.4.0', 'element-internals-polyfill': '^1.3.9' },
      }, null, 2),
      'main.js':
`import '@universal-material/web';\nimport 'element-internals-polyfill';\ndocument.getElementById('app').innerHTML = \`${ex.html}\`;`,
    };
    return {
      project: { title: ex.title, description: `${ex.title} — @universal-material/web (Vanilla)`, template: 'node', files },
      openFile: 'main.js',
    };
  }
}
```

Trigger from the example component:

```ts
// in docs-example component
constructor(private sb: StackBlitzService) {}
openInStackBlitz(fw: Framework) { this.sb.open(fw, this.exampleSource); }
@ViewChild('embedHost') embedHost!: ElementRef<HTMLElement>;
async runInline(fw: Framework) { await this.sb.embed(this.embedHost.nativeElement, fw, this.exampleSource); }
```

---

## 5. Gotchas

1. **`node` template ignores `project.dependencies`.** For React/Vue/Svelte/Vanilla-Vite you
   *must* put deps in `package.json`; setting `project.dependencies` does nothing. Conversely the
   `angular-cli` EngineBlock template ignores `package.json` for resolution and reads
   `project.dependencies`. Don't cross the wires (the dead Angular code already correctly uses
   `dependencies` for `angular-cli`).
2. **Vue needs `isCustomElement`.** Without
   `compilerOptions.isCustomElement: (t) => t.startsWith('u-')` in `vite.config`, Vue treats
   `<u-*>` as components and warns/fails. Mandatory.
3. **React custom-element props.** React <19 sets non-string props as attributes, so boolean
   (`checked`) and object/array values (`u-chip-field.value`, slider range) don't reach the
   element as properties — set them via a `ref` (`el.checked = true`) and bind events with
   `el.addEventListener('change', …)`. Author React examples against React 19 (native custom
   element prop support) to avoid the ref dance where possible.
4. **`element-internals-polyfill` + fonts must be in every generated project.** The docs site
   loads both (`docs/src/index.html`). Omitting the polyfill breaks form-associated components
   (`ElementInternals`) on engines without native support; omitting the fonts makes Material
   Symbols icons render as raw ligature text.
5. **Register the elements exactly once.** A single side-effect import
   `import '@universal-material/web';` in the entry file. Importing it in multiple module graphs
   is fine (idempotent `customElements.define` guard), but forgetting it entirely yields inert
   `<u-*>` tags that render nothing.
6. **Pin the version, don't hard-code-and-forget.** The dead Angular service hard-codes stale
   alpha versions. Read the current `@universal-material/web` version from the docs build
   (`package.json` → `3.9.0`) so generated projects never drift behind the published package.
7. **`embedProject` is heavy.** Each embed boots a full WebContainers/EngineBlock VM and runs
   `npm install`. Always pass `clickToLoad: true` for inline embeds, cap the count per page, and
   prefer `openProject` (new tab) when an inline live preview isn't essential.
8. **`embed*` replaces the target element.** `sdk.embedProject(elOrId, …)` swaps the host element
   for the iframe — give it a dedicated wrapper `<div>` you don't otherwise rely on, and re-create
   it if you need to embed again.
9. **`openProject` POSTs a form to a new tab** — popup blockers can intercept it if not called
   directly in a user-gesture handler. Call it synchronously from the click handler (don't `await`
   something first).
10. **Per-framework markup differs.** The same `<u-*>` snippet needs attribute/binding adaptation:
    Angular templates and Vanilla use the raw HTML; React needs JSX (`className`, self-closing,
    `ref`/`addEventListener` for props/events); Vue/Svelte need their binding syntax for two-way
    form values. For mechanical cases derive variants from one `html` string; for form components
    with two-way binding, author explicit per-framework example bodies.
11. **Don't pull from the sibling Angular workspace.** The reusable generator should live in the
    web docs app (`docs/src/app/`), not import the dead `D:/Projects/universal-material-angular`
    `StackBlitzService`. Port the *pattern*, not the files (and drop `@universal-material/core`).
12. **`startScript` only for `node`.** If a framework scaffold's npm script isn't `dev`/`start`,
    pass `startScript` in the embed/open options (WebContainers only). The Vite scaffolds above
    all use `dev`, so it's not needed.

---

## Sources

- [JavaScript SDK | StackBlitz Docs](https://developer.stackblitz.com/platform/api/javascript-sdk)
- [Creating projects with the SDK | StackBlitz Docs](https://developer.stackblitz.com/guides/integration/create-with-sdk)
- [Managing dependencies with the SDK | StackBlitz Docs](https://developer.stackblitz.com/platform/api/javascript-sdk-dependencies)
- [Options reference | StackBlitz Docs](https://developer.stackblitz.com/platform/api/javascript-sdk-options)
- [Controlling embeds with the SDK's VM interface | StackBlitz Docs](https://developer.stackblitz.com/platform/api/javascript-sdk-vm)
- [WebContainers](https://webcontainers.io/) and [Vite-new templates](https://blog.stackblitz.com/posts/vite-new-templates/)
- In-repo precedent: `D:/Projects/universal-material-angular/demo/src/app/example/stackblitz/*` (dormant Angular generator), and planning doc `planning/current/06-angular-demo-and-stackblitz.md`.
