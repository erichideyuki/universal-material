# ADR 00 — Monorepo architecture for Universal Material

Status: **Proposed** (awaits human sign-off on the open decisions in §11)
Date: 2026-06-08
Deciders: architect (this doc), repo owner (Hideyuki)
Supersedes: the current two-repo + git-submodule layout

---

## 1. Context

Today there are **two repos that share no git history**:

- `D:/Projects/universal-material-web` — `@universal-material/web@3.9.0`, a pure-ESM
  Material 3 Lit component library. Build is a bespoke serial **gulp + tsc + esbuild**
  pipeline (`clean → gulp scripts:sass-to-ts → esbuild build:esm → tsc build:bundle →
  gulp sass → cem analyze → copyfiles → remove-scripts-from-package.js`). Publishes from
  `dist/`. Ships `skills/` (28 `SKILL.md`) + `.claude-plugin/plugin.json` inside the npm
  tarball, version-locked to `package.json`. Angular appears here **only** as the `docs/`
  consumer app + a dev-only postinstall compiler patch.
- `D:/Projects/universal-material-angular` — `@universal-material/angular` (the published
  library `src/package.json` says `3.6.2`, with web as a `^3.9.0` **peerDependency**). It
  vendors the web repo as a **git submodule** under `./universal-material-web`, builds it
  in place via `scripts/build-web.mjs`, and resolves the bare specifier
  `@universal-material/web` through a **tsconfig `paths` alias** →
  `universal-material-web/dist/index`. The web runtime deps are **hand-mirrored** into the
  Angular `package.json`. The Angular wrapper's load-bearing content is 8
  ControlValueAccessors + a `TabBarDirective` + two thin services; the rest is legacy.

The web library is the canonical source of truth; the framework wrappers are **thin
facades** over framework-agnostic custom elements. We want one repo that cleanly supports
N framework wrappers, kills the submodule/`build-web.mjs`/path-hack triad, and preserves
the Angular git history.

### Research finding that reshapes the wrapper strategy

The per-framework research (`planning/research/{react,vue,svelte,solid}.md`) is decisive:
the `u-*` inputs are **form-associated custom elements** (FACE) that emit standard
bubbling `input`/`change` events. Therefore:

| Framework | Needs a runtime wrapper package? | Deliverable |
| --- | --- | --- |
| **React** (17/18/19) | **Yes** — `@lit/react` `createComponent` wrappers give typed props + `onInput`/`onChange`. Pre-19 React cannot set DOM props / listen to custom events ergonomically. | `@universal-material/react` (runtime + types) |
| **Vue 3** | **No** — first-class custom-element interop; `v-model` works. | docs page + optional `.d.ts` (`@universal-material/vue`, types-only) |
| **Svelte 4/5** | **No** — best-in-class CE support; only `bind:value` caveat. | docs page + optional `.d.ts` (`@universal-material/svelte`, types-only) |
| **SolidJS** | **No** — 16/16 on Custom Elements Everywhere. | docs page only (`@universal-material/solid` optional, stretch) |

This means **we are not building five symmetric wrapper packages.** We build **one**
real runtime wrapper (React) plus Angular; the rest are documentation and (optionally)
ambient-type packages. That collapses most of the "N framework wrappers" complexity the
three proposals were sized for.

---

## 2. Decision

Adopt **native npm workspaces** + **Changesets** for independent per-package
versioning, with the web library **staying at the repo root** (not moved into
`packages/web`). Concretely:

1. **Tooling: npm workspaces** (native to the npm 11 / Node 24 already in use). No
   pnpm, no Nx, no Lerna, no Turborepo for phase 1.
2. **Web stays at root.** Its gulp+tsc+esbuild pipeline, `docs/` app, postinstall patch,
   `skills/`, `.claude-plugin/`, and `copy` step are **untouched**. `package.json`
   declares `"workspaces": ["packages/*"]` and gains root orchestration scripts.
3. **Wrappers live under `packages/`.** Angular → `packages/angular`. React →
   `packages/react`. Vue/Svelte/Solid → optional thin `packages/{vue,svelte,solid}`
   (types + README) only if/when we want a published types package; otherwise they are
   just docs pages in the web docs app.
4. **Submodule → `workspace:`-style dependency.** Angular consumes web via a normal
   workspace dependency; npm symlinks it into `node_modules/@universal-material/web`. The
   submodule, `build-web.mjs`, the tsconfig path hack, and the 7 duplicated runtime deps
   all go away.
5. **Angular history preserved via `git subtree add`** grafting the Angular repo's
   `feature/m3` branch into `packages/angular`.
6. **Versioning: independent per-package semver via Changesets.** Web stays on its
   `3.x` line (next release `3.10.0`, since the API hardening is an internal minor).
   Angular re-baselines cleanly. The **major** number still tracks the **Material spec
   generation** (M3 → `3.x`), per the existing project rule — see §9.
7. **Release: Changesets `version` + `publish`**, per package, from each package's
   publish root (web from `dist/`, Angular from its ng-packagr output, React from `tsup`
   `dist/`).

This is a **synthesis**: the "web-stays-at-root, zero build-impact, npm workspaces"
spine from Proposal 1; the **Changesets independent-versioning** rigor from Proposal 2;
and an explicit **rejection** of Proposal 2's "move web into `packages/web`" churn and
Proposal 3's Nx. The asymmetry the research demands (one React wrapper, not five) is baked
in.

---

## 3. Why npm workspaces (and not pnpm / Nx / Turborepo)

| Option | Verdict | Reasoning |
| --- | --- | --- |
| **npm workspaces** | **Chosen** | Native to the npm 11 already installed (confirmed `npm --version` → 11.3.0; `node` → v24). Zero new package-manager lock-in. Symlinks `workspace:*` deps without dedupe surprises. A ~10-line `workspaces` array is the entire config. The web build is **unmodified**. |
| pnpm + changesets (Proposal 2) | Rejected for phase 1 | Strong tool, but switching package managers means regenerating the lockfile, retraining muscle memory, and validating that the web library's **postinstall patch** (which mutates `node_modules/@angular/compiler`) behaves under pnpm's symlinked/isolated `node_modules`. `shamefully-hoist=true` would be required for the Angular docs build, which signals friction. The win (strict dep isolation) is marginal for a 2-real-package workspace. Revisit if the dep tree grows. |
| Nx (Proposal 3) | Rejected | Best-in-class task-graph caching, but it is a large conceptual surface (`project.json` per package, `nx.json`, `nx affected`) for a workspace whose real build graph is **web → angular** and **web → react**. The web build is shelled out via `nx:run-commands` anyway, so Nx adds orchestration vocabulary without owning the slow step. Defer until build time actually hurts. |
| Turborepo | Rejected | Assumes npm-script uniformity; the web build is a bespoke gulp pipeline. Same "add later if builds hurt" logic as Nx, with less Angular affinity. |
| Lerna | Rejected | Changesets covers versioning/publishing with a git-native PR-driven workflow and per-package CHANGELOGs; Lerna is redundant on top of npm workspaces. |

**Caching/orchestration is deferred, not designed out.** §6 of `02-build-and-release.md`
documents the exact seam where Turborepo or Nx slots in later (wrap the root
`build:all`/`test:all` scripts) with no package restructuring.

---

## 4. Why web stays at root (reject "move into packages/web")

Proposal 2 moves web into `packages/web`. We reject that for phase 1:

- The web build, `docs/` app, gulp tasks, `copy` step, postinstall patch, `skills/`,
  `.claude-plugin/`, `tsconfig.json`, `web-test-runner.config.js`, and ~all relative
  paths assume **root-relative** layout. Moving them is a wide, error-prone diff
  (angular.json style paths, gulp-task globs, `copyfiles` args, the `dist/` publish root,
  CEM globs) for **no functional gain** — npm workspaces resolves a root package as a
  workspace member just fine when its name is listed or when sibling packages reference it
  by name.
- The docs app already lives at `docs/` and resolves web via a tsconfig path to
  `../dist/index`. Keeping web at root keeps that mapping valid (one less thing to break).
- The cardinal project rule is *"everything must be visually evaluated and pixel
  perfect,"* exercised through the **docs site at :4200**. Minimizing churn to that
  surface protects the primary test loop.

Trade-off accepted: the root `package.json` is **both** the web library manifest **and**
the workspace coordinator. That is mildly unusual but legal and well-trodden (it is
exactly Proposal 1's `["packages/*", "."]` idea, minus the redundant `"."`). We document
it loudly. If it ever becomes painful, the move-to-`packages/web` migration is a clean,
mechanical follow-up — this decision does not foreclose it.

---

## 5. Package layout (ASCII)

```
universal-material-web/                 [REPO ROOT = the @universal-material/web package]
├── package.json                        # web manifest AND workspace coordinator
│                                        #   name=@universal-material/web, version=3.9.x
│                                        #   "workspaces": ["packages/*"]
│                                        #   adds build:all / test:all / lint:all / version / release
├── tsconfig.json                       # web tsconfig (unchanged) — also the base others extend
├── tsconfig.base.json                  # NEW: extracted shared compilerOptions (see 01-package-layout)
├── gulpfile.js, gulp-tasks/            # web build — UNCHANGED
├── src/                                # web library source — UNCHANGED (37 dirs, 64 elements)
├── scss/                               # global M3 tokens — UNCHANGED
├── dist/                               # web publish root (gitignored) — UNCHANGED
├── skills/                             # 28 SKILL.md — UNCHANGED, copied into dist/ at publish
├── .claude-plugin/plugin.json          # version-locked to package.json — UNCHANGED
├── docs/                               # web docs app (Angular 20, :4200) — UNCHANGED
├── change-compiler-to-add-custom-elements.js   # dev-only postinstall patch — UNCHANGED
├── remove-scripts-from-package.js      # strips postinstall+publish from dist/package.json — UNCHANGED
├── .changeset/                         # NEW: Changesets config + per-PR change files
│   └── config.json
├── .github/workflows/                  # NEW: ci.yml + release.yml
│   ├── ci.yml
│   └── release.yml
└── packages/
    ├── angular/                        # @universal-material/angular  (git subtree from feature/m3)
    │   ├── package.json                #   peerDeps: @universal-material/web + @angular/*
    │   │                               #   dependencies: @universal-material/web: "*" (workspace-linked)
    │   ├── ng-package.json             #   ng-packagr config (unchanged behavior)
    │   ├── tsconfig.lib.json           #   extends ../../tsconfig.base.json; NO path hack
    │   └── src/                        #   8 CVAs, TabBarDirective, services, index.ts
    │
    ├── react/                          # @universal-material/react  (NEW, phase 2)
    │   ├── package.json                #   peerDeps: @universal-material/web, react, react-dom, @lit/react
    │   ├── tsup.config.ts              #   esm+cjs+dts
    │   └── src/                        #   createComponent wrappers, generated from custom-elements.json
    │
    ├── vue/        (OPTIONAL, types-only)    # @universal-material/vue   — .d.ts + README, no runtime
    ├── svelte/     (OPTIONAL, types-only)    # @universal-material/svelte— .d.ts + README, no runtime
    └── solid/      (OPTIONAL, stretch)       # @universal-material/solid — README (+ JSX .d.ts), no runtime
```

The full per-file tree, every `package.json` identity, and the tsconfig graph are in
[`01-package-layout.md`](./01-package-layout.md).

---

## 6. Replacing the submodule + build-web.mjs + tsconfig path hack

Today (Angular repo) three mechanisms collude to make `import … from
'@universal-material/web'` resolve:

1. **git submodule** `universal-material-web` pinned at a web commit (gitlink `e804c22`).
2. **`scripts/build-web.mjs`** — runs `npm install --ignore-scripts --legacy-peer-deps`
   in the submodule, then `gulp scripts:sass-to-ts` + `tsc`, wired as
   `prestart`/`prebuild`/`pretest` hooks.
3. **tsconfig `paths`** alias `@universal-material/web` → `universal-material-web/dist/index`
   (+ `/*`), plus the **7 runtime deps duplicated** into the Angular `package.json`, plus
   `angular.json` pulling the submodule's raw `scss/universal-material.scss`.

After migration, **all three collapse into one workspace dependency**:

```jsonc
// packages/angular/package.json
{
  "name": "@universal-material/angular",
  "peerDependencies": {
    "@universal-material/web": "^3.10.0",
    "@angular/common": "^20", "@angular/core": "^20", "@angular/forms": "^20"
  },
  "dependencies": {
    // workspace-linked at dev time; rewritten to the published range on publish
    "@universal-material/web": "*"
  }
}
```

Mechanically:

- **`npm install` at the repo root** symlinks `node_modules/@universal-material/web` →
  the root web package. The bare specifier `@universal-material/web` now resolves through
  normal Node module resolution — **the tsconfig `paths` alias is deleted.**
- **`build-web.mjs` and all `prebuild:web` hooks are deleted.** Build order is enforced by
  the root orchestration script (`build:web` runs before `build:angular`; see
  `02-build-and-release.md`), not by per-target pre-hooks.
- **The 7 duplicated runtime deps are removed** from the Angular `package.json`. They are
  hoisted from the web package by the workspace install. The Angular package only declares
  what it *adds* (e.g. `animated-scroll-to`) plus its peer/dev needs.
- **The submodule is removed**: delete `.gitmodules`, deindex the `universal-material-web`
  gitlink, delete the directory.
- **`angular.json` SCSS coupling**: the demo/docs build's `styles[]` entry that pointed at
  `universal-material-web/scss/universal-material.scss` now points at
  `node_modules/@universal-material/web/scss/universal-material.scss` (resolved via the
  workspace symlink) — or, since the web docs app already covers the component gallery, the
  Angular demo can be retired in favor of the web `docs/` app hosting an "Angular usage"
  page (open decision §11.4).
- The **dev-only postinstall patch stays a web-package concern.** Under npm workspaces the
  root `npm install` runs the web package's `postinstall` once; it mutates the single
  hoisted `node_modules/@angular/compiler`, which is exactly what the Angular docs
  type-checker needs. `remove-scripts-from-package.js` already strips it from the published
  `dist/package.json`, so consumers never see it. (Document the "re-runs on a clean
  reinstall" caveat in the root README.)

The web library's **published contract is unchanged**: `@universal-material/web@3.10.0`
from npm is byte-for-byte what it would have been pre-monorepo (same `dist/`, same
`skills/` + `.claude-plugin/` payload).

---

## 7. Git-history preservation for the Angular code

The two repos share **no history** (distinct roots: web `14adf24`, angular `f9b9489`),
so any history-preserving fold is a foreign-root graft. Options considered:

| Option | Verdict |
| --- | --- |
| **`git subtree add --prefix=packages/angular <angular-url> feature/m3`** | **Chosen.** Preserves full Angular history under `packages/angular/`, keeps `git log`/`git blame` working, no `.gitmodules` residue. Non-squashed so blame survives. |
| `git read-tree` + `merge -s ours --allow-unrelated-histories` | Rejected — more manual, easier to get wrong, no upside over subtree. |
| Plain copy (no history) | Rejected — loses blame on the 8 CVAs and the migration commits, which are the highest-value Angular code. |

**Pre-fold prerequisite (in the Angular repo):** the working tree currently carries a
large **uncommitted** migration (121 files: +557/−4283 — the new `src/value-accessors/**`
CVAs, demo pages, removed legacy). `git subtree add` folds **committed** history only, so
that work must be **committed on `feature/m3` and pushed first**, e.g.
`"Angular wrapper: add form CVAs + demo pages (pre-monorepo)"`. Then fold from the pushed
branch. Keep the standalone `D:/Projects/universal-material-angular` checkout as a backup
mirror until the monorepo build is verified green.

After the fold, edit `packages/angular/` in place: drop the submodule + `build-web.mjs` +
path hack (§6), point `tsconfig.lib.json` at `../../tsconfig.base.json`, set the
package identity (§5 / `01-package-layout.md`).

---

## 8. Versioning model — independent per-package via Changesets

**Chosen: independent semver per package, driven by Changesets.** Rejected: fixed
lockstep (Proposals 1A/3) because it forces a web bump for a React-only fix and vice
versa, and the packages have genuinely independent cadences (web is the stable core;
wrappers are thin and rarely change).

- **`@universal-material/web`** stays on its existing `3.x` line. The current uncommitted
  API-hardening work is an internal **minor** → next publish is **`3.10.0`** (per the
  project's own rule: in-library breaking changes bump the **minor**, not the major).
  `.claude-plugin/plugin.json` `version` stays locked to it.
- **`@universal-material/angular`** re-baselines on `feature/m3`. Its published
  `src/package.json` reads `3.6.2`; the cleanest continuation is to **keep the `3.x`
  family** and bump to `3.7.0` (or `4.0.0` if we treat the CVA rewrite as a breaking
  reset — open decision §11.5). It declares web as a `^3.10.0` **peerDependency** so a
  consumer picks any compatible web.
- **`@universal-material/react`** starts independently at **`0.1.0`** (pre-1.0 while the
  wrapper surface settles), web as a peer.
- **Optional `vue`/`svelte`/`solid` types packages**, if shipped, start at `0.1.0`.
- **Docs app** (`docs/`) is private/unpublished; no version, no changeset.

**How `workspace:` rewriting works on publish:** the Angular/React `dependencies` entry
`"@universal-material/web": "*"` is dev-time-linked; on `changeset publish` Changesets
rewrites it to the concrete published range. (With npm workspaces we use `"*"` rather than
pnpm's `workspace:*` literal; Changesets + npm publish substitute the real version.)

**Per-package CHANGELOGs.** Each PR that touches a package adds a `.changeset/*.md`
naming the affected package(s) + bump level + human changelog line. CI enforces presence
via `changeset status`.

---

## 9. M3-major version policy (unchanged, restated)

Per `CLAUDE.md`: the **major** version tracks the **Material Design spec generation**
(M3 → `3.x`, M4 → `4.x`). **In-library** breaking changes (renames, removed exports,
changed defaults) bump the **minor**, not the major. The major only moves when Material
publishes a new generation.

In the monorepo this policy is **per package** but **spec-anchored**: when Material ships
M4, *every* published package crosses to `4.x` together (a coordinated, spec-driven
super-bump — the one place lockstep re-enters, and it is intentional). Between
generations, packages move independently on their minor/patch lines. This is the single
rule that keeps "independent versioning" from drifting the web and Angular majors apart.

---

## 10. Release flow (summary; full detail in 02-build-and-release.md)

1. PR adds a `.changeset/*.md`. CI runs `build:all` + `test:all` + `lint:all` +
   `changeset status`.
2. On merge to `main`, the **release workflow** runs `changeset version` (bumps
   package.jsons, writes CHANGELOGs, opens/refreshes a "Version Packages" PR).
3. Merging that PR (or a manual `workflow_dispatch`) runs `changeset publish`, which for
   each package with a pending bump runs its **own** publish:
   - **web**: `npm run build` → publish from **`dist/`** (postinstall/publish stripped;
     `skills/` + `.claude-plugin/` included). `plugin.json` version asserted == package
     version in CI.
   - **angular**: `ng-packagr` → publish the ng-packagr output dir.
   - **react**: `tsup` → publish from `packages/react/dist/`.
4. Tags are per package (`@universal-material/web@3.10.0`,
   `@universal-material/angular@3.7.0`, `@universal-material/react@0.1.0`).

---

## 11. Open decisions (need human sign-off)

1. **Package manager: npm workspaces (recommended) vs pnpm.** This ADR assumes **npm
   workspaces** (native, zero-switch, the installed toolchain). Choose pnpm only if strict
   dep isolation is a hard requirement now — at the cost of revalidating the postinstall
   patch under pnpm's `node_modules` layout and likely `shamefully-hoist=true`.
2. **Move web into `packages/web`? (recommended: NO for phase 1.)** Keeping web at root is
   the low-friction path; moving it is a clean follow-up if the dual-role root
   `package.json` becomes annoying. Confirm we stay at root.
3. **Which wrappers ship first.** Recommended: **Angular now** (fold existing), **React
   next** (the only other real runtime wrapper). Vue/Svelte/Solid as **docs pages** in the
   web docs app, with optional types packages deferred. Confirm this scope — especially
   whether we publish `@universal-material/{vue,svelte,solid}` types packages at all.
4. **Keep the Angular demo app, or retire it into the web docs app?** The web `docs/`
   (:4200) already is the canonical gallery. Option A: keep `packages/angular`'s demo for
   Angular-specific examples + StackBlitz. Option B: add an "Angular usage" section to the
   web docs and delete the demo. Affects how much of the Angular repo we fold.
5. **Versioning: independent (recommended) vs lockstep; and the Angular baseline.**
   Confirm independent-via-Changesets. Decide Angular's next version: **`3.7.0`**
   (continue the line) vs **`4.0.0`** (breaking reset for the CVA rewrite) — note `4.0.0`
   would *visually* collide with the M3→M4 major policy, so `3.7.0` is recommended.
6. **First-publish baselines.** Confirm web `3.10.0`, react `0.1.0`. Confirm whether the
   first monorepo release re-publishes web at all or waits for the next web change.
7. **CI provider / release automation depth.** This ADR assumes GitHub Actions + the
   Changesets action with manual-approval publish. Confirm GH Actions and whether publish
   is auto-on-merge or `workflow_dispatch`-gated.
```
