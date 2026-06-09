# Task 12 — Runnable StackBlitz examples per framework ("Open in StackBlitz" on `docs-example`)

> **Status:** ready to implement.
> **Architecture authority:** `planning/architecture/00-decision.md` §5, §8 (web `3.10.0`, react `0.1.0`); `planning/research/stackblitz.md` (the full how-to + code sketch); `planning/current/06-angular-demo-and-stackblitz.md` §5 (the dormant generator + its stale pins).
> **One-line scope:** Give every docs example an **executable landing** — port a modernized `StackBlitzService` into the **web docs app** (`docs/`), add an **"Open in StackBlitz"** affordance to the shared `docs-example` primitive, and call `sdk.openProject` with **per-framework templates** (`angular-cli` for Angular; `node`+Vite for React/Vue/Svelte/Vanilla) that side-effect-import `@universal-material/web` (+ the React wrapper for React) and slot in the example's source. **RESOLVES REVIEW P1-8.**

---

## Scope (ONE unit only)

Deliver the StackBlitz "Open in editor" surface for the **web docs app at `D:/Projects/universal-material-web/docs/`**:

1. **(Primary, load-bearing)** A `StackBlitzService` under `docs/src/app/docs/stackblitz/`
   that builds an in-memory `Project` per framework (Vanilla, Angular, React, Vue, Svelte)
   and opens it via `sdk.openProject(project, openOptions)` in a new tab.
2. **(Primary)** An **"Open in StackBlitz"** trigger wired into the shared `docs-example`
   component (`docs/src/app/docs/example/example.component.{ts,html}`): an icon button + a
   small framework menu (Angular / React / Vue / Svelte / Vanilla), defaulting to the
   example's `html` as the source markup.
3. **(Required)** Add `@stackblitz/sdk` to the **root** `package.json` (the docs app shares
   the root `package.json` — there is **no** `docs/package.json`).
4. **(Required)** Reconcile the **stale pinned versions** from the dormant Angular generator
   (`@universal-material/core@2.0.0-alpha.20`, `@universal-material/angular@2.0.1-alpha.47`,
   the legacy MDI icon CDN) to the **new world**: web read from the root `package.json`
   `version` at build time (→ `^3.10.0` after the monorepo bump), `@universal-material/react`
   for React, the three Google Fonts + `element-internals-polyfill@1.3.9` the docs site
   already uses.

**This task does NOT:**
- Build or modify any wrapper package (`packages/react`, `packages/angular`, etc.). It only
  *references* `@universal-material/react` by name in the generated React `package.json`.
- Touch the web library `src/`, its gulp/tsc/esbuild build, `dist/`, `skills/`, or
  `.claude-plugin/`.
- Port the dead `D:/Projects/universal-material-angular` files verbatim — it ports the
  **pattern** (text-templated files + the single SDK call), authored fresh in the web docs
  app (per `planning/research/stackblitz.md` Gotcha 11).
- Add inline `embedProject` iframes (the heavy WebContainers boot). `openProject` (new tab)
  is the first cut; `embedProject` is noted as an optional follow-up only.
- Set up Changesets, CI, or release wiring (separate tasks).

---

## Preconditions & Dependencies

- **Hard dependency:** `11-docs-integration.md` — the docs-integration task that establishes
  the framework-usage pages / "Frameworks" section in the web docs app. Task 12 hangs the
  StackBlitz affordance off `docs-example`, which those pages and every component page share;
  landing 11 first avoids a route/nav merge race and gives a natural home for a "Try it on
  StackBlitz" callout. **If 11 has not landed, Part A (the `StackBlitzService` + the
  `docs-example` button) still stands alone** — it only edits the shared `docs-example`
  primitive and the root `package.json`, neither of which 11 owns. Ship Part A and note the
  page cross-links as a follow-up.
- **Soft dependency (version reconciliation only):** `13-versioning-and-release.md` bumps web
  `3.9.0 → 3.10.0` and sets react `0.1.0`. Task 12 reads the web version from the **root
  `package.json` `version` field at build time** (see the existing precedent in
  `docs/src/app/docs/shell/shell.component.ts` line 12, which imports `version` from
  `../../../../../package.json`), so the generated projects auto-track whatever version is
  published — they never hard-code a stale string (this is the fix for
  `06-angular-demo-and-stackblitz.md` §5's hard-coded alpha pins). React's wrapper version is
  pinned by **caret range** (`^0.1.0`) in the generated `package.json`, not read from a file.
- **No dependency** on `07-wrapper-react.md` at build time: Task 12 only emits the *string*
  `@universal-material/react` into a generated `package.json` that StackBlitz resolves from
  **npm**, not from this workspace. (If react has not been published when a reader clicks
  "Open in StackBlitz → React", that one template's `npm install` will fail *inside
  StackBlitz* — acceptable; the Angular/Vue/Svelte/Vanilla templates are unaffected.)
- **Soft dependency:** the web docs app must build/serve (`npm run docs` → :4200). It does
  today.

---

## Context (enough to execute COLD)

### The library and how it registers
- `@universal-material/web` (root `package.json` `version` is **`3.9.0`** today; next publish
  **`3.10.0`** per `00-decision.md` §8) is a **pure-ESM** Material 3 Lit library. A single
  side-effect import `import '@universal-material/web';` registers every `<u-*>` custom
  element (the barrel `D:/Projects/universal-material-web/src/index.ts` does side-effect
  registration imports). Every generated StackBlitz project does this **once** in its entry
  file (`planning/research/stackblitz.md` Gotchas 1, 5).
- Form-associated `u-*` elements need `element-internals-polyfill` on engines without native
  `ElementInternals`, and Material Symbols icons need the fonts — so every generated project
  links the **three Google Fonts** + the **polyfill**, exactly mirroring the docs site's own
  `D:/Projects/universal-material-web/docs/src/index.html` (verified contents below).

### The dormant generator being revived (and its staleness)
Per `planning/current/06-angular-demo-and-stackblitz.md` §5, a **working-but-dead**
StackBlitz integration lives in the *sibling* repo at
`D:/Projects/universal-material-angular/demo/src/app/example/stackblitz/*`:
- `stack-blitz.service.ts` — `StackBlitzService.createProject(project)` assembles a virtual
  file map from text-imported templates, token-replaces `$example-component-name` /
  `$ExampleComponentName`, writes the three code blocks, and calls
  `StackBlitzSDK.openProject({ title, description, template: 'angular-cli', files, dependencies })`.
- **Stale facts to reconcile** (do **not** copy them): it pins
  `@universal-material/core@2.0.0-alpha.20` and `@universal-material/angular@2.0.1-alpha.47`,
  links the legacy **MDI** icon CDN (not the new fonts), and only ever emits an Angular
  project. The new generator drops `@universal-material/core` entirely, reads the web version
  from the root `package.json`, links the three Google Fonts + the polyfill, and branches per
  framework.

Port the **pattern**, authored fresh in the web docs app — do **not** import from the sibling
repo (`planning/research/stackblitz.md` Gotcha 11).

### `@stackblitz/sdk` essentials (from `planning/research/stackblitz.md` §1)
- `import sdk from '@stackblitz/sdk';` then `sdk.openProject(project, openOptions)` — creates a
  brand-new project from in-memory `files` (+ `dependencies` for EngineBlock) and opens it in a
  new tab. **Call it synchronously inside the click handler** (popup blockers intercept it
  otherwise — Gotcha 9; never `await` before it).
- `Project = { title, description, template, files: Record<string,string>, dependencies?, settings?, tags? }`.
- **Template → execution environment** (Gotcha 1 — do not cross the wires):
  | Framework | `template` | Env | Deps declared in |
  | --- | --- | --- | --- |
  | Angular | `'angular-cli'` | EngineBlock | `project.dependencies` (**not** `package.json`) |
  | React | `'node'` | WebContainers + Vite | **`package.json`** (`project.dependencies` **ignored**) |
  | Vue | `'node'` | WebContainers + Vite | **`package.json`** |
  | Svelte | `'node'` | WebContainers + Vite | **`package.json`** |
  | Vanilla | `'node'` | WebContainers + Vite | **`package.json`** |
- `OpenOptions` used: `{ openFile: string, view: 'editor', newWindow: true }`.
- The full, correct per-framework `files` map is in `planning/research/stackblitz.md` §4's
  code sketch — **use it as the implementation, with the version/dep reconciliations below.**
  `@stackblitz/sdk@^1.3.0` is the version the sibling repo already used (precedent).

### Per-framework deps to emit (reconciled — supersedes the research sketch's literals)
The research sketch hard-codes `WEB_VERSION = '^3.9.0'`. **Read it from the root
`package.json` instead** so it auto-tracks `3.10.0`:
- **All templates:** `@universal-material/web` → `^<root package.json version>` (e.g.
  `^3.10.0` post-bump). Build a caret range from the imported `version` string.
- **React** (`'node'` + Vite): deps `@universal-material/react: '^0.1.0'`,
  `@universal-material/web: '^<ver>'`, `react: '^19'`, `react-dom: '^19'`; devDeps
  `@vitejs/plugin-react: '^4'`, `vite: '^5'`, `element-internals-polyfill: '^1.3.9'`. (React
  19 passes properties to custom elements natively — `00-decision.md` §1 / research Gotcha 3 —
  so the React example can use the `@universal-material/react` wrappers' typed
  `onInput`/`onChange` props rather than the `ref` dance.)
- **Vue** (`'node'` + Vite): deps `@universal-material/web`, `vue: '^3.5'`; devDeps
  `@vitejs/plugin-vue: '^5'`, `vite: '^5'`, `element-internals-polyfill: '^1.3.9'`. The
  `vite.config.ts` **must** set `compilerOptions.isCustomElement: (t) => t.startsWith('u-')`
  (research Gotcha 2 — mandatory).
- **Svelte** (`'node'` + Vite): deps `@universal-material/web`; devDeps `svelte: '^4'`,
  `@sveltejs/vite-plugin-svelte: '^3'`, `vite: '^5'`, `element-internals-polyfill: '^1.3.9'`.
- **Vanilla** (`'node'` + Vite): deps `@universal-material/web`; devDeps `vite: '^5'`,
  `element-internals-polyfill: '^1.3.9'`. Entry `main.js` sets
  `document.getElementById('app').innerHTML = EXAMPLE_HTML`.
- **Angular** (`'angular-cli'`, EngineBlock): `project.dependencies` =
  `{ '@universal-material/web': '^<ver>', '@universal-material/angular': '^3.7.0' }` (drop
  `@universal-material/core`; Angular baseline is **`3.7.0`** per `00-decision.md` §8 / §11.5,
  **not** `4.0.0`). Standalone bootstrap, `schemas: [CUSTOM_ELEMENTS_SCHEMA]`,
  `import '@universal-material/web';` in `main.ts`.

### The exact fonts + polyfill block to inject (verified from `docs/src/index.html`)
Every generated `index.html` `<head>` must include (these are the exact URLs the docs site uses):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0">
```
The docs site loads the polyfill as `<script type="module"
src="https://unpkg.com/element-internals-polyfill@1.3.9/dist/index.js">` — but in the
generated `node`+Vite projects, prefer importing it from the npm dep in the entry file
(`import 'element-internals-polyfill';`) since it is in `devDependencies` (research §2.6).

### How `docs-example` works today (the integration point — verified)
- `D:/Projects/universal-material-web/docs/src/app/docs/example/example.component.ts`
  (selector `docs-example`, **standalone**) currently takes `@Input() html` (a setter storing
  `_html` raw + `htmlSafe` sanitized), plus `renderExample`, `sectionTitle`, `screenRoute`,
  `fluid`, `alignment`. Its imports are `CommonModule, RouterLink, Highlight`
  (**`ngx-highlightjs`** — note: the web docs app uses `ngx-highlightjs`, *not* the sibling
  repo's `ngx-highlight-js`), `AnchorScrollDirective`.
- `D:/Projects/universal-material-web/docs/src/app/docs/example/example.component.html`
  renders the section heading, projected description, the preview (`[innerHTML]="htmlSafe"`
  or `<ng-content select="[example]">`), and the highlighted code
  `<pre><code [highlight]="_html!" language="html"></code></pre>` — all guarded by `@if (_html)`.
  Control flow is the new `@if`/`@for` syntax.
- Every page imports its example markup as a **text string** via the Angular `loader` map
  (`docs/angular.json` build options `loader = { ".html": "text", ".md": "text" }` — verified)
  and assigns it to a field; e.g. `docs/src/app/components/badges/badges.component.ts` does
  `import usageHtml from './examples/usage.html'; … usageHtml = usageHtml;` and feeds it to
  `<docs-example [html]="usageHtml" sectionTitle="…">`. **This same `html` string is the
  source Task 12 feeds to the StackBlitz generator.** For component pages whose live demo is an
  Angular `<app-…-example>` (`[renderExample]="false"`), the shown `html` string is still the
  representative `<u-*>` markup to open.

### Where the web version comes from at build time (the reconciliation mechanism)
`docs/src/app/docs/shell/shell.component.ts` line 12 already does
`import { version as packageVersion } from '../../../../../package.json';` and exposes it as
`version` — so `resolveJsonModule` is on and importing the root `package.json` from a docs TS
file is an **established pattern**. The `StackBlitzService` imports `version` the same way and
derives `WEB_VERSION = '^' + version` (e.g. `^3.10.0`). **This is the fix for the
hard-coded-stale-version problem.**

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web`.
> All file paths are absolute. The docs app is the verification surface at :4200.

### A1. Add the SDK dependency (root `package.json` — the docs app shares it)

```powershell
./node_modules/.bin/npm install --save-dev @stackblitz/sdk@^1.3.0
```
(Or hand-add `"@stackblitz/sdk": "^1.3.0"` to the root `package.json` `devDependencies` and
run `npm install`.) There is **no** `docs/package.json` — confirmed; the docs Angular app
compiles against the root one. `@stackblitz/sdk` is a tiny browser-only SDK (POSTs the
generated files to stackblitz.com), so it adds no build coupling.

### A2. Create the `StackBlitzService`

Create `D:/Projects/universal-material-web/docs/src/app/docs/stackblitz/stackblitz.service.ts`.
Implement it from the **code sketch in `planning/research/stackblitz.md` §4**, with these
**mandatory reconciliations** applied:

1. **Version from root `package.json`** (not a literal):
   ```ts
   import { version } from '../../../../../package.json';
   const WEB_VERSION = `^${version}`;          // e.g. ^3.10.0 — auto-tracks the published web
   const ANGULAR_VERSION = '^3.7.0';           // 00-decision §8 baseline
   const REACT_WRAPPER_VERSION = '^0.1.0';     // @universal-material/react first release
   ```
2. **Fonts block** = the exact five `<link>`s from the Context section (replace the research
   sketch's shorter `FONTS` constant with the docs site's actual URLs).
3. **Drop `@universal-material/core`** everywhere. The Angular template's `project.dependencies`
   is `{ '@universal-material/web': WEB_VERSION, '@universal-material/angular': ANGULAR_VERSION }`.
4. **React template** uses `@universal-material/react` (the wrapper) + `react@^19` /
   `react-dom@^19`, and authors `src/App.tsx` against the wrapper's typed components.
5. **`node`-template deps live in `package.json`; Angular's live in `project.dependencies`**
   (Gotcha 1). Keep the wires uncrossed exactly as the sketch does.

Public surface to expose (matches the sketch):
```ts
export type Framework = 'vanilla' | 'angular' | 'react' | 'vue' | 'svelte';
export interface ExampleSource { name: string; title: string; html: string; ts?: string; scss?: string; }

@Injectable({ providedIn: 'root' })
export class StackBlitzService {
  open(framework: Framework, ex: ExampleSource): void { /* sdk.openProject(project, { openFile, view: 'editor', newWindow: true }) */ }
  private buildProject(framework: Framework, ex: ExampleSource): { project: Project; openFile: string } { /* switch */ }
  // private vanilla/angular/react/vue/svelte(ex) → { project, openFile }
}
```
- Each `<u-*>` snippet is slotted into the framework scaffold's entry component
  (`App.tsx` / `App.vue` / `App.svelte` / `app.component.ts` template / `main.js` innerHTML)
  exactly as the §4 sketch shows.
- **Vue `vite.config.ts` MUST include** `template: { compilerOptions: { isCustomElement: (t) => t.startsWith('u-') } }` (Gotcha 2).

### A3. Wire the trigger into `docs-example`

Edit `D:/Projects/universal-material-web/docs/src/app/docs/example/example.component.ts`:
- Inject `StackBlitzService` in the constructor (it already has `private readonly sanitizer:
  DomSanitizer` — add `private readonly stackblitz: StackBlitzService`).
- Add an `@Input() exampleName?: string;` (used as the StackBlitz project `name`/`title`;
  default to a slug of `sectionTitle` when absent).
- Add a method:
  ```ts
  openInStackBlitz(framework: Framework): void {
    if (!this._html) return;
    this.stackblitz.open(framework, {
      name: (this.exampleName ?? this.sectionTitle ?? 'example').toLowerCase().replace(/\s+/g, '-'),
      title: this.sectionTitle ?? 'Universal Material example',
      html: this._html,
    });
  }
  ```
- The build's `loader` map only covers `.html`/`.md`; the component's existing `.ts`-only
  imports are unaffected.

Edit `D:/Projects/universal-material-web/docs/src/app/docs/example/example.component.html`:
- Inside the `@if (_html)` block (next to `.example-code`, or in the section `<h5>` header
  row), add an **"Open in StackBlitz"** `u-icon-button` that toggles a `u-menu` of the five
  frameworks, each `<u-menu-item (click)="openInStackBlitz('react')">React</u-menu-item>` etc.
  Use a Material Symbols glyph (`bolt` or `open_in_new`) and `aria-label="Open in StackBlitz"`.
  Mirror the existing `u-menu`/`u-icon-button` pattern already used in
  `docs/src/app/docs/shell/shell.component.html` (the theme menu) so the markup is idiomatic.
  Ensure the menu items are `u-menu-item`s whose `(click)` calls `openInStackBlitz` — the SDK
  call stays synchronous within the user gesture (Gotcha 9).
- If `docs-example` does not already import `u-menu`/`u-icon-button` via
  `CUSTOM_ELEMENTS_SCHEMA`, add `schemas: [CUSTOM_ELEMENTS_SCHEMA]` to its `@Component`
  decorator (the shell uses these elements under that schema; replicate).

> **Type import note:** import `Framework` and `StackBlitzService` from
> `@docs/docs/stackblitz/stackblitz.service` (the `@docs/*` → `docs/src/app/*` path alias).

### A4. (Optional, gated on Task 11) Add a "Try on StackBlitz" callout to the framework pages

If `11-docs-integration.md` has landed and created the framework-usage pages under
`docs/src/app/frameworks/<name>/`, add a short prose line on each linking the reader to the
"Open in StackBlitz" affordance on any component example, choosing that framework from the
menu. **No new generator code** — those pages reuse the same `docs-example` button. Skip this
step entirely if Task 11 has not landed.

### A5. Build and verify

```powershell
node node_modules/typescript/bin/tsc --noEmit -p docs/tsconfig.app.json
# then visually verify at :4200 (see Verification V2)
```

---

## Acceptance criteria

1. `@stackblitz/sdk@^1.3.0` is in the **root** `package.json` `devDependencies` and `npm
   install` resolves it; `node_modules/@stackblitz/sdk` exists.
2. `docs/src/app/docs/stackblitz/stackblitz.service.ts` exists, exports `StackBlitzService`
   (root-provided) + `Framework` + `ExampleSource`, and builds a distinct `Project` per
   framework with the **correct template** (`angular-cli` for Angular; `node` for the other
   four) and **deps in the correct place** (`project.dependencies` for Angular only;
   `package.json` for the `node` templates).
3. **No stale pins:** the service contains **no** `@universal-material/core`, **no**
   `2.0.x-alpha` versions, and **no** legacy MDI icon CDN link. The web version is read from
   the root `package.json` `version` (verify: changing root `version` changes the generated
   `package.json`/`dependencies` string), Angular is `^3.7.0`, React wrapper is `^0.1.0`.
4. Every generated `index.html` links the three Google Fonts (Roboto, Roboto Mono, Material
   Symbols Outlined) and every entry file does `import '@universal-material/web';` +
   `import 'element-internals-polyfill';` (Vanilla/React/Vue/Svelte) — and the Vue
   `vite.config.ts` sets `isCustomElement: (t) => t.startsWith('u-')`.
5. `docs-example` shows an **"Open in StackBlitz"** icon button with a 5-item framework menu;
   clicking any item calls `sdk.openProject` synchronously and opens a new StackBlitz tab whose
   project contains the example's `<u-*>` markup. (Per `CLAUDE.md` cardinal rule: verify in the
   real browser, not just the build.)
6. Opening at least the **Vanilla** and **Angular** generated projects in StackBlitz boots and
   renders the `<u-*>` element (these two have stable published deps regardless of the React
   wrapper's publish state).
7. The docs app builds clean (`tsc --noEmit -p docs/tsconfig.app.json`) with the new service +
   the edited `docs-example`.
8. No files changed under web `src/`, `dist/`, `skills/`, or `.claude-plugin/`.

---

## Verification commands

> Run from `D:/Projects/universal-material-web`. The dev server (`npm run docs`) is usually
> already running on :4200 — do **not** restart it unless asked.

**V1 — SDK dependency present:**
```powershell
node -e "const p=require('./package.json'); const all={...p.dependencies,...p.devDependencies}; console.log('@stackblitz/sdk =', all['@stackblitz/sdk'] ?? '(MISSING)')"
Test-Path node_modules/@stackblitz/sdk
```
Expect a `^1.3.x` range and `True`.

**V2 — docs app type-checks with the new service + edited primitive:**
```powershell
node node_modules/typescript/bin/tsc --noEmit -p docs/tsconfig.app.json
```
Expect no errors referencing `stackblitz.service` or `example.component`.

**V3 — no stale pins / no core / no MDI in the generated output:**
```powershell
Select-String -Path docs/src/app/docs/stackblitz/stackblitz.service.ts -Pattern 'universal-material/core','2\.0\.\d+-alpha','materialdesignicons','mdi' -AllMatches
# expect: NO matches (empty result)
Select-String -Path docs/src/app/docs/stackblitz/stackblitz.service.ts -Pattern "isCustomElement","element-internals-polyfill","angular-cli","'node'"
# expect: matches for each (Vue predicate, polyfill, Angular EngineBlock, node templates)
```

**V4 — version is read from package.json, not hard-coded:**
```powershell
Select-String -Path docs/src/app/docs/stackblitz/stackblitz.service.ts -Pattern "from '.*package.json'","WEB_VERSION"
# expect: an import of `version` from the root package.json AND a WEB_VERSION derived from it
```

**V5 — visual + functional check at :4200:** open
`http://localhost:4200/#/components/badges` (or any component page) in the connected browser
(`mcp__Claude_in_Chrome__navigate` → `get_page_text` / DOM eval). Confirm the "Open in
StackBlitz" button is present on a `docs-example`, the framework menu opens, and clicking
"Vanilla" or "Angular" opens a new StackBlitz tab that boots and renders the `<u-*>` element.
Close the StackBlitz tab and the menu afterward (shared browser — clean up).

**V6 — web library untouched:**
```powershell
git status --porcelain src dist skills .claude-plugin
# expect: no output
```

---

## Rollback notes

- **Fully additive + one surgical edit.** To roll back: `Remove-Item -Recurse
  docs/src/app/docs/stackblitz`, then `git checkout -- docs/src/app/docs/example/example.component.ts
  docs/src/app/docs/example/example.component.html package.json package-lock.json` (reverts the
  `docs-example` button + the `@stackblitz/sdk` dep), then `npm install` to drop the package.
- No web build artifacts, no generated files (`apis.ts` is **not** regenerated — there is no
  new component class), no SCSS → TS step. The `docs-example` edit is the only change to a
  shared primitive; reverting it restores the prior render exactly.
- The StackBlitz projects are generated **in the browser at click time** and POSTed to
  stackblitz.com — nothing is persisted in the repo, so there is no artifact to clean beyond
  the files above. No publish-time or runtime regression risk for existing
  `@universal-material/web` consumers (the published contract is unchanged).

---

## Parallelizable in worktree? **yes** — why

This task touches a **disjoint, mostly-new file set**: a brand-new
`docs/src/app/docs/stackblitz/**` directory nobody else writes, plus two surgical edits to the
shared `docs-example` primitive (`example.component.{ts,html}`) and a one-line `devDependencies`
addition to the root `package.json`. It does **not** modify the web library `src/`, the
gulp/tsc/esbuild build, `dist/`, `skills/`, `.claude-plugin/`, or any wrapper package — it only
emits the *string* `@universal-material/react` / `@universal-material/angular` into generated
`package.json`s that StackBlitz resolves from npm, so it has **no build-order coupling** to the
React/Angular wrapper tasks. Its only cross-task contact points are (a) the dependency on
`11-docs-integration.md` for the optional page cross-links in step A4 (Part A stands alone
without it), and (b) reading the web `version` from the root `package.json`, which
`13-versioning-and-release.md` bumps — a value read, not a write conflict. The `docs-example`
edit is append-only (a new button + a new method) and conflicts trivially-resolvably with any
sibling docs change. The root `package.json` edit is a single `devDependencies` line, which
merges cleanly. Run it in a worktree alongside the wrapper tasks; the only serialization is
landing Task 11 first when you want the page cross-links.
