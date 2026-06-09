# Task 02 — Scaffold the monorepo root

> Implementation harness. Self-contained: a fresh agent with **zero chat memory** can
> execute this end-to-end. All paths are absolute. Cite-and-verify against the real repo —
> do **not** invent file names.

---

## Scope (ONE unit only)

Turn the existing single-package repo at `D:/Projects/universal-material-web` into the
**workspace root** of an npm-workspaces monorepo, **without touching the web library's
build, source, docs app, or publish contract**. Concretely, this unit delivers:

1. `package.json` — add `"workspaces": ["packages/*"]`, the **non-release** root orchestration
   scripts (`build:all` / `test:all` / `lint:all`), a bare `"changeset": "changeset"` convenience
   script, and the `@changesets/cli` devDependency. **Every existing field/script/dependency is
   preserved verbatim.** This unit does **NOT** define the final `version` / `release` scripts —
   **the release layer (`version`/`release` scripts + the final `.changeset/config.json` body) is
   OWNED by task 13 (`13-versioning-and-release.md`), which supersedes this minimal config.**
2. `tsconfig.base.json` — NEW shared base with the framework-neutral compiler options, and
   rewire the existing `tsconfig.json` to `extends` it (override-compatible, zero behavior
   change for the web build).
3. `.changeset/config.json` — NEW **minimal but valid** Changesets config (independent
   per-package versioning) — just enough for the CI `changeset-check` gate to run. The **final**
   config body (with `onlyUpdatePeerDependentsWhenOutOfRange`, `ignore: ["docs"]`, etc.) is
   **OWNED by task 13**, which overwrites this file. Do not chase the final shape here.
4. `.gitignore` — add ignores for per-package build output (`/packages/*/dist`,
   `/packages/*/node_modules`) so the future Angular/React `dist/` stay untracked.
5. `packages/` — the **empty skeleton directory** (a tracked `.gitkeep` so the empty dir
   survives a clone; no package contents yet).
6. Lint/format reach — confirm root `eslint`/`prettier` config does not break when
   `packages/` later gains TS, and document the one-line follow-up note (no config rewrite
   needed in this unit; see §"Lint/format" below).

**Explicitly OUT of scope** (these are *other* task files — see Preconditions):

- Folding the Angular wrapper via `git subtree` into `packages/angular` (its own task).
- Creating `packages/react`, `packages/vue`, etc. with real content (later tasks).
- `.github/workflows/ci.yml` + `release.yml` (release-automation task).
- **The `version` / `release` root scripts and the final `.changeset/config.json` body** — the
  whole **release layer is OWNED by `13-versioning-and-release.md`** (it adds `version` →
  `changeset version && node sync-plugin-version.js`, `release` → `npm run build:all && changeset publish`,
  and overwrites `.changeset/config.json`). This unit ships **only** a bare `changeset` script and a
  **minimal** config; do not define `version`/`release` here.
- Bumping the web version to `3.10.0` or writing the first changeset files (release task).
- Removing the Angular submodule / `build-web.mjs` / tsconfig path-hack (lives in the
  Angular-fold task, because the code it edits arrives with the subtree).
- Running `npm install` to regenerate the lockfile is allowed and expected here (it is how
  `@changesets/cli` lands), but **do not** add or remove any web runtime/dev dep besides
  `@changesets/cli`.

---

## Preconditions & Dependencies

| Must land first | Why |
| --- | --- |
| **none (hard blocker)** | This is the foundation unit. It can run on the current `fix/round2-api-candidates` (or `main`) HEAD as-is; the `packages/` dir is empty so nothing depends on the Angular/React code yet. |

Soft ordering (these consume this unit's output but are **not** required before it):

- **Angular-fold task** (`git subtree add --prefix=packages/angular …`) depends on this
  unit: it needs `"workspaces": ["packages/*"]`, `tsconfig.base.json`, and the
  `.changeset/` config to already exist so the folded package slots in cleanly.
- **React-package task** depends on this unit for the same reasons.
- **CI/release task** depends on this unit (it wires `build:all`/`test:all`/`lint:all` and
  `changeset status`, which are created here).

Environment already verified on this machine (re-confirm in §Verification):
`node v24.0.2`, `npm 11.3.0` — native npm workspaces supported, **no package-manager
switch**.

---

## Context (enough to execute COLD)

### What this repo is, today

`D:/Projects/universal-material-web` is the `@universal-material/web@3.9.0` package — a
pure-ESM (`"type": "module"`) Material 3 Lit web-components library. It is **also going to
be the workspace coordinator** (the ADR deliberately keeps web at the repo root rather than
moving it into `packages/web`; see `planning/architecture/00-decision.md` §4 and §11.2).
So the root `package.json` plays **two roles**: the web library manifest AND the workspace
root. This is intentional and documented.

Authoritative design docs (read if anything below is ambiguous):

- `D:/Projects/universal-material-web/planning/architecture/00-decision.md` — the ADR.
  §2 (decision), §3 (why npm workspaces, not pnpm/Nx/Turborepo), §4 (why web stays at
  root), §5 (package layout ASCII), §8 (versioning), §11 (open decisions).
- `D:/Projects/universal-material-web/planning/architecture/01-package-layout.md` — §3.1
  (root `package.json` additions — the exact shape this unit implements), §4 (tsconfig
  graph), §6 (`.changeset/config.json` body).
- `D:/Projects/universal-material-web/planning/architecture/02-build-and-release.md` — §2.2
  (root orchestration scripts), §2.4 (caching seam), §4 (Changesets versioning).
- `D:/Projects/universal-material-web/planning/current/01-web-library.md` — the web build
  pipeline that must stay untouched.

### Exact current state of the files this unit edits (verified)

**`D:/Projects/universal-material-web/package.json`** — 138 lines. Key facts:
- `"name": "@universal-material/web"`, `"version": "3.9.0"`, `"type": "module"`.
- `"main": "index.js"`, `"module": "index.js"`, `"types": "index.d.ts"`,
  `"sass": "scss/universal-material.scss"` (all relative to the `dist/` publish root).
- Has a `"scripts"` block with (among others): `build`, `build:watch`, `build:esm`,
  `build:bundle`, `script:sass-to-ts`, `sass`, `clean`, `copy`, `lint`, `lint:eslint`,
  `lint:eslint:fix`, `lint:lit-analyzer`, `lint:prettier`, `test`, `test:watch`,
  `predocs`, `docs`, `docs:apis`, `docs:serve`, `docs:build`, `docs:watch`, `analyze`,
  `checksize`, `prettier`, `publish`, `postinstall`.
  - `"publish": "npm run lint:eslint && cd dist && npm publish"` — **note there is already
    a script literally named `publish`.** Do not collide a new script with it.
  - `"postinstall": "node ./change-compiler-to-add-custom-elements.js"` — the dev-only
    Angular-compiler patch. Leave it.
- `"dependencies"`: `@bart-krakowski/get-week-info-polyfill ^1.0.8`,
  `@lit-labs/virtualizer ^2.1.1`, `@lit/context ^1.1.5`,
  `@material/material-color-utilities ^0.3.0`, `dompurify ^3.4.5`, `lit ^3.2.1`,
  `swiper ^12.1.4`. **Do not touch.**
- `"devDependencies"`: a large block (Angular 20, gulp, esbuild, sass, cem analyzer,
  ts-morph, wtr/playwright, eslint/prettier stack, `npm-run-all`, etc.). `@changesets/cli`
  is **not** present — this unit adds exactly that one.
- `"customElements": "custom-elements.json"` is the last field.
- **There is no `"workspaces"` key today.** Confirmed: `packages/` directory does **not**
  exist.

**`D:/Projects/universal-material-web/tsconfig.json`** — 50 lines, current shape:
```jsonc
{
  "compileOnSave": false,
  "compilerOptions": {
    "lib": ["es2021", "DOM", "DOM.Iterable"],
    "declaration": true, "declarationMap": true, "sourceMap": true, "inlineSources": true,
    "outDir": "./dist", "rootDir": "./src",
    "strict": true, "noImplicitOverride": true, "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true, "noUnusedParameters": true, "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true, "noImplicitAny": true, "noImplicitThis": true,
    "skipLibCheck": true, "isolatedModules": true, "esModuleInterop": true,
    "experimentalDecorators": true, "moduleResolution": "node", "importHelpers": true,
    "target": "ES2022", "module": "ES2022", "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true, "useDefineForClassFields": false,
    "plugins": [{ "name": "ts-lit-plugin", "strict": true }],
    "types": ["mocha"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["./node_modules/lit/decorators.d.ts", "src/**/*.test.ts"],
  "angularCompilerOptions": { "enableI18nLegacyMessageIdFormat": false, "strictInjectionParameters": true, "strictInputAccessModifiers": true, "strictTemplates": true }
}
```
- `tsconfig.test.json` already does `"extends": "./tsconfig.json"` and re-states
  `experimentalDecorators`/`useDefineForClassFields:false` inline (because esbuild ignores
  `extends` per the project's testing notes). It is **not** edited by this unit.

**`D:/Projects/universal-material-web/.gitignore`** — already ignores `/dist`,
`/docs/dist`, `/node_modules`, the generated `*.styles.ts`/`*.d.ts`/`custom-elements.json`.
It does **not** yet mention `packages/`.

**Lint/format (verified — important so the orchestration scripts are correct):**
- `package.json` `"lint:eslint": "eslint src/**/*.ts"` — **scoped to `src/`**, so it will
  never lint `packages/`. The flat config `eslint.config.mjs` also sets
  `parserOptions.project: ["tsconfig.json"]` and `ignores` includes `dist/*`,
  `node_modules/*`, `**/*.js`, `**/*.styles.ts`. Root `npm run lint` therefore stays a
  **web-only** lint; each future package runs its own `lint` script. **No eslint rewrite
  needed in this unit.**
- `"lint:prettier": "prettier . --check"` runs over the whole tree, BUT
  `.prettierignore` ignores `**/*.{js,mjs,cjs,ts,css,scss,html,json}` (allow-listing only
  `/docs/**/*.html`). So `prettier .` effectively checks almost nothing tree-wide and will
  **not** start failing on new `packages/` files or the new JSON config files added here.
  **No prettier config change needed.** (Do not "fix" `.prettierignore` — that is a
  separate, larger decision.)

### Why npm workspaces (not pnpm/Nx) — so you don't second-guess

`planning/architecture/00-decision.md` §3: npm 11 / Node 24 is already installed → native
npm workspaces is zero-switch and leaves the web library's bespoke gulp+tsc+esbuild
pipeline, the `postinstall` Angular-compiler patch, the `skills/` + `.claude-plugin/`
copy step, and the `dist/` publish root **completely untouched**. pnpm would force
revalidating the postinstall patch under isolated `node_modules` (+ likely
`shamefully-hoist=true`); Nx/Turborepo buy task-graph caching a 2-real-package workspace
does not need yet. Both are documented as **additive** upgrades behind the `build:all` /
`test:all` seam (`02-build-and-release.md` §2.4) — so this scaffold leaves a clean place
to adopt them later without restructuring.

### Assumptions baked in (from the open decisions — note them, do not re-litigate)

These are the ADR's recommended resolutions; this unit implements them. They are recorded
here so a cold agent knows they are deliberate, not accidental:

- **A1 — Package manager: npm workspaces** (not pnpm). Native to npm 11. (00-decision §11.1)
- **A2 — Web stays at the repo root** (not moved into `packages/web`). The root
  `package.json` is dual-role. (00-decision §11.2)
- **A3 — Versioning: independent per-package via Changesets**, M3-spec-major policy
  preserved (major == Material generation; in-library breaks bump the minor).
  (00-decision §8, §9)
- **A4 — Web version stays `3.9.0` in this unit.** The bump to `3.10.0` and the first
  changeset belong to the release task, NOT here. Leaving `3.9.0` keeps this unit a pure
  no-behavior-change scaffold. (00-decision §8 — the bump is "on next publish".)
- **A5 — `packages/` ships empty** with a `.gitkeep`. `vue`/`svelte`/`solid` types
  packages are deferred; only Angular (fold task) and React (later) will populate it.
- **A6 — `version`/`release` are NOT defined here (release layer = task 13).**
  `01-package-layout.md` §3.1 notes `version` collides conceptually with `npm version`. The
  canonical script **names** (`version`, `release`) and their **bodies** are OWNED by
  `13-versioning-and-release.md` (`version` → `changeset version && node sync-plugin-version.js`,
  `release` → `npm run build:all && changeset publish`), which the CI task calls
  (`02-build-and-release.md` §3.2). This unit ships only the bare `changeset` script; do not add
  `version`/`release` here, or you will be clobbered by — and may race — task 13.

If the human overrides any assumption, the only edits are: A1 → swap install/lockfile
tooling; A4 → change the literal version. Everything else is structural.

---

## Step-by-step changes (exact paths + commands)

> Work on a feature branch off the current HEAD. Current branch is
> `fix/round2-api-candidates`; if you are on a default/protected branch instead, branch
> first: `git switch -c chore/monorepo-scaffold`.

### Step 1 — Add `"workspaces"` to the root `package.json`

Edit `D:/Projects/universal-material-web/package.json`. Insert a top-level `"workspaces"`
key. Place it right after `"sass": "scss/universal-material.scss",` (i.e. just before the
`"scripts"` block) so the manifest reads naturally:

```jsonc
  "sass": "scss/universal-material.scss",
  "workspaces": [
    "packages/*"
  ],
  "scripts": { … }
```

Do **not** add `"."` to the array (web-at-root is resolved as the coordinator implicitly;
the ADR §4 explicitly drops the redundant `"."`).

### Step 2 — Add the root orchestration scripts (non-release only)

In the same `"scripts"` block, **append** these four entries (keep all existing scripts
unchanged). Recommended insertion point: immediately after the existing `"publish"` /
`"postinstall"` lines, or anywhere inside the block — JSON key order is cosmetic. Exact
bodies (from `01-package-layout.md` §3.1 / `02-build-and-release.md` §2.2):

```jsonc
    "build:all": "npm run build && npm run build -w @universal-material/angular --if-present && npm run build -w @universal-material/react --if-present",
    "test:all": "npm test && npm test -ws --if-present",
    "lint:all": "npm run lint && npm run lint -ws --if-present",
    "changeset": "changeset"
```

> **Do NOT add `version` / `release` here.** Those are the **release layer**, OWNED by
> `13-versioning-and-release.md` (which writes `"version": "changeset version && node
> sync-plugin-version.js"` and `"release": "npm run build:all && changeset publish"`). This unit
> ships only the bare `"changeset"` convenience script so a maintainer can run
> `npm run changeset` against the minimal config; the `version`/`release` orchestration arrives
> with task 13 and supersedes anything this unit would have written.

Notes:
- `build:all` runs **web first** (`npm run build`, the unchanged web pipeline), THEN the
  wrappers. `--if-present` is added to the Angular target too (it does not exist yet in
  this unit; `-w @universal-material/angular` would otherwise error until the fold task
  lands). This makes `build:all` runnable **now** as a web-only build. (`build:all`'s
  canonical ordered body is OWNED by `03-relocate-web-package.md`; this unit's first cut matches
  it verbatim.)
- `test:all` / `lint:all`: `-ws --if-present` fans out to every workspace member and
  no-ops where the script/package is absent — so with an empty `packages/` they reduce to
  the web `npm test` / `npm run lint`.
- `changeset` (bare) just invokes the CLI for interactive changeset authoring; it is inert
  until the release task lands the first changeset files.

### Step 3 — Add `@changesets/cli` and install

From the repo root, install the dev dependency (this also regenerates
`package-lock.json` with the workspace topology):

```bash
npm install --save-dev @changesets/cli@^2.27.0
```

- This pins `"@changesets/cli": "^2.27.0"` into `devDependencies` (per `01-package-layout`
  §3.1) and writes `node_modules/.bin/changeset`.
- **Caveat:** `npm install` triggers the web `postinstall`
  (`change-compiler-to-add-custom-elements.js`), which mutates
  `node_modules/@angular/compiler/fesm2022/compiler.mjs`. That is the normal, dev-only
  behavior — let it run. It does not affect this unit's deliverables.
- If the sandbox blocks network, fall back to a manual edit of `devDependencies` adding
  `"@changesets/cli": "^2.27.0"` and run `npm install` later; the `.changeset/config.json`
  and scripts still land. Prefer the real install so the lockfile is correct.

### Step 4 — Create a MINIMAL `.changeset/config.json`

Create `D:/Projects/universal-material-web/.changeset/config.json` with this **minimal but
valid** body — just enough for `changeset status` and the CI `changeset-check` gate to run
(from `01-package-layout.md` §6):

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

> **The final config body is OWNED by task 13, which supersedes this minimal config.**
> `13-versioning-and-release.md` §A3 **overwrites** this file with the authoritative shape
> (adds `fixed`/`linked`, `ignore: ["docs"]`, and the
> `onlyUpdatePeerDependentsWhenOutOfRange` experimental option). Do **not** chase that final
> shape here — this unit ships only the minimal config so CI's `changeset-check` has a file to
> read; task 13 replaces it.

(`npx changeset init` would also create this file plus a `.changeset/README.md`; either
is fine. If you run `init`, then overwrite `config.json` with the body above so
`access: "public"`, `baseBranch: "main"`, and `updateInternalDependencies: "patch"` match
the ADR. Keep the generated `.changeset/README.md` if `init` produced one.)

### Step 5 — Create `tsconfig.base.json` and have `tsconfig.json` extend it

Create `D:/Projects/universal-material-web/tsconfig.base.json` with the framework-neutral
compiler options only — **no** `include`/`rootDir`/`outDir`, and **no**
`experimentalDecorators`/`useDefineForClassFields` (those stay per-package per
`01-package-layout.md` §4, because React/tsup wrappers want standard decorators):

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "importHelpers": true,
    "moduleResolution": "node",
    "target": "ES2022",
    "module": "ES2022"
  }
}
```

Then rewrite `D:/Projects/universal-material-web/tsconfig.json` to `extends` the base and
keep **only** the web-specific overrides. The result must be behavior-identical to today's
web build (every option above is preserved, either inherited from the base or restated).
New `tsconfig.json`:

```json
{
  "extends": "./tsconfig.base.json",
  "compileOnSave": false,
  "compilerOptions": {
    "lib": ["es2021", "DOM", "DOM.Iterable"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "inlineSources": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "plugins": [{ "name": "ts-lit-plugin", "strict": true }],
    "types": ["mocha"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["./node_modules/lit/decorators.d.ts", "src/**/*.test.ts"],
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

Why each web-specific option stays in `tsconfig.json` (not the base):
- `lib`, `declaration*`, `sourceMap`, `inlineSources`, `outDir`, `rootDir`, `include`,
  `exclude`, `plugins` (ts-lit-plugin), `types: ["mocha"]`, `angularCompilerOptions`,
  `compileOnSave` — all web-build-specific.
- `experimentalDecorators` + `useDefineForClassFields:false` — **deliberately NOT in the
  base** (per ADR), so they are restated here.
- `noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters` — these are
  stricter than what a generic wrapper package wants; keep them web-only (left out of the
  base) so a future React package isn't forced into them.

**Important: `tsconfig.test.json` does NOT need editing** — it already `extends`
`./tsconfig.json` and inlines its own decorator options. After this change it transitively
extends the new base too; verify the test config still resolves (see Verification).

### Step 6 — Create the empty `packages/` skeleton

```bash
mkdir -p "D:/Projects/universal-material-web/packages"
```

Add a tracked placeholder so the empty directory survives clone and the `workspaces` glob
has a home. Create `D:/Projects/universal-material-web/packages/.gitkeep` (empty file).

Optionally add `D:/Projects/universal-material-web/packages/README.md` with one line:
`Workspace packages live here (angular, react, …). Empty until the fold/scaffold tasks.`
(Optional — `.gitkeep` alone is sufficient. If you add the README, it is allow-listed out
of prettier by `.prettierignore` only if it's not `.md`; `.md` is not ignored, but
prettier `.` with the current ignore list does not flag plain prose, so it's safe.)

### Step 7 — Update `.gitignore` for per-package build output

Append to `D:/Projects/universal-material-web/.gitignore` (so future Angular/React/etc.
`dist/` + nested `node_modules/` stay untracked, mirroring the existing `/dist` rule):

```gitignore

# Monorepo package build output (Angular ng-packagr, React tsup, …)
/packages/*/dist
/packages/*/node_modules
/packages/*/.angular/cache
```

Do **not** ignore `packages/` itself or `packages/.gitkeep` — only the build artifacts.

### Step 8 — Sanity-build the web library (no behavior change)

Confirm the tsconfig refactor and the new `workspaces` key did not perturb the web build.
Run the unchanged web pipeline's type-check step (and optionally the full build):

```bash
# from repo root — generates *.styles.ts then type-checks/emits to dist/
npm run script:sass-to-ts
npx tsc -p tsconfig.json --noEmit
```

(Full `npm run build` is fine too but slower; `tsc --noEmit` after `sass-to-ts` is the
fast signal that the tsconfig graph is intact.)

---

## Acceptance criteria

1. `D:/Projects/universal-material-web/package.json`:
   - contains `"workspaces": ["packages/*"]`;
   - contains the four new **non-release** scripts (`build:all`, `test:all`, `lint:all`,
     `changeset`) with the exact bodies in Step 2;
   - does **NOT** define `version` or `release` scripts (those are task 13's release layer);
   - **every pre-existing script, dependency, and field is unchanged** (diff shows only
     additions: the `workspaces` key, four scripts, and the `@changesets/cli` devDep);
   - `"version"` field is still `"3.9.0"` (NOT bumped here — assumption A4);
   - has `"@changesets/cli": "^2.27.0"` in `devDependencies`.
2. `D:/Projects/universal-material-web/tsconfig.base.json` exists with the framework-neutral
   options and **no** `experimentalDecorators`/`useDefineForClassFields`/`rootDir`/`outDir`.
3. `D:/Projects/universal-material-web/tsconfig.json` `extends` `./tsconfig.base.json` and
   still produces a behavior-identical web build (the `tsc --noEmit` in Step 8 passes with
   the same result as before the change).
4. `D:/Projects/universal-material-web/.changeset/config.json` exists as a **minimal valid**
   config with `access: "public"`, `baseBranch: "main"`,
   `updateInternalDependencies: "patch"`, `ignore: []` — enough for the CI `changeset-check`
   gate to run. (Task 13 later overwrites it with the final body; that supersession is
   intended, not a regression.)
5. `D:/Projects/universal-material-web/packages/` exists and contains a tracked `.gitkeep`
   (so `git ls-files packages/` is non-empty). No real package content.
6. `D:/Projects/universal-material-web/.gitignore` ignores `/packages/*/dist` and
   `/packages/*/node_modules`.
7. `npx changeset status` runs without crashing (it reports "no changesets" — acceptable;
   the first changeset is the release task's job).
8. `npm ls --workspaces` (or `npm query .workspace`) lists the workspace cleanly with no
   members yet (empty `packages/` → no errors).
9. The web library still builds and its published contract is untouched: `dist/index.js`,
   `dist/index.d.ts`, the `skills/` + `.claude-plugin/` copy step, and `package.json`
   `main/module/types/sass` are all unchanged.
10. No web runtime/dev dependency other than `@changesets/cli` was added or removed.

---

## Verification commands

Run from `D:/Projects/universal-material-web`:

```bash
# 0. Toolchain (must be npm workspaces-capable)
node --version          # expect v24.x
npm --version           # expect 11.x

# 1. workspaces key present and parseable
node -e "const p=require('./package.json'); console.log('workspaces:', JSON.stringify(p.workspaces)); console.log('version:', p.version); console.log('scripts present:', ['build:all','test:all','lint:all','changeset'].every(s=>s in p.scripts)); console.log('release layer absent (task 13 owns it):', !('version' in p.scripts) && !('release' in p.scripts)); console.log('changesets dep:', p.devDependencies['@changesets/cli'])"
# expect: workspaces: ["packages/*"]  /  version: 3.9.0  /  scripts present: true  /  release layer absent (task 13 owns it): true  /  changesets dep: ^2.27.0

# 2. existing web scripts NOT clobbered (spot-check the load-bearing ones)
node -e "const s=require('./package.json').scripts; ['build','copy','postinstall','publish','docs','test','lint'].forEach(k=>console.log(k, '=>', s[k]))"

# 3. tsconfig graph: base exists, web extends it, test config still resolves
node -e "const t=require('./tsconfig.json'); console.log('extends:', t.extends)"   # expect ./tsconfig.base.json
npx tsc -p tsconfig.json --showConfig > /dev/null && echo "web tsconfig resolves OK"
npx tsc -p tsconfig.test.json --showConfig > /dev/null && echo "test tsconfig resolves OK"

# 4. changeset config valid + CLI runnable
node -e "const c=require('./.changeset/config.json'); console.log(c.access, c.baseBranch, c.updateInternalDependencies)"  # expect public main patch
npx changeset status            # expect a clean 'no changesets' style message, exit 0 (or 1 with 'no changesets present' — both acceptable, must NOT stack-trace)

# 5. packages skeleton tracked
git add -A && git status --short -- packages/    # expect packages/.gitkeep staged

# 6. gitignore covers package dist
git check-ignore packages/angular/dist/index.js  # expect it to PRINT the path (ignored)

# 7. web build integrity — fast path
npm run script:sass-to-ts && npx tsc -p tsconfig.json --noEmit && echo "WEB TYPECHECK CLEAN"

# 8. (optional, slower) full web build still green and publish contract intact
npm run build && node -e "const fs=require('fs'); ['dist/index.js','dist/index.d.ts','dist/package.json'].forEach(f=>console.log(f, fs.existsSync(f)))"
```

**Visual / docs check (per CLAUDE.md cardinal rule — confirm no regression):** this unit
changes no SCSS, no component source, and no docs wiring, so the `:4200` docs site must
look **identical**. If `npm run docs` is already running, just confirm the app still
compiles and a couple of component pages render unchanged. No new docs example is required
(nothing user-facing changed).

---

## Rollback notes

All changes are additive and reversible; no source or build behavior is mutated.

- **Per-file revert:** `tsconfig.json` is the only edited (not newly-created) build file.
  To revert it: `git checkout -- tsconfig.json` restores the standalone (non-`extends`)
  version. Everything else is new files or pure additions:
  - delete `tsconfig.base.json`, `.changeset/`, `packages/`;
  - remove the `"workspaces"` key and the four new scripts (`build:all`/`test:all`/`lint:all`/`changeset`) from `package.json`;
  - `git checkout -- .gitignore`.
- **Dependency rollback:** `npm uninstall @changesets/cli` (or revert `package.json` +
  `package-lock.json` and `npm install`). The web `postinstall` patch re-runs on any
  install — that is expected and idempotent; if `node_modules/@angular/compiler` looks
  doubly-patched, a clean `rm -rf node_modules && npm install` restores a known state.
- **Full rollback:** since this unit is one focused commit, `git revert <sha>` (or reset
  the feature branch) returns the repo to a single-package layout with zero residue.
- **Safety:** do not run `npm run release` / `changeset publish` during this unit — there
  are no changesets and nothing should publish. The scripts exist but are inert until the
  release task adds changeset files.

---

Parallelizable in worktree? **yes** — this unit only adds new files (`tsconfig.base.json`,
`.changeset/config.json`, `packages/.gitkeep`) and makes additive edits to three root files
(`package.json`, `tsconfig.json`, `.gitignore`). It touches **no** component source, no
SCSS, no docs app, and does not depend on the Angular subtree or the React package, so it
can run in an isolated git worktree concurrently with non-overlapping tasks. The only files
a sibling task could conflict on are the three root files — so it should not run in the same
worktree as another task that also edits `package.json`/`tsconfig.json`/`.gitignore` (e.g.
the Angular-fold task, which also touches root config).
