# Migration task harnesses — `@universal-material/angular` → web 3.9.0

Each file in this folder is a **self-contained work unit** for one component/activity (never mixed),
designed to be executed independently (including by a subagent). Format per file:

- **Scope** — the single unit this task touches.
- **Context** — why, and the relevant 3.9.0 facts.
- **Changes** — exact files + edits.
- **Acceptance** — what "done" looks like.
- **Verify** — the command(s) to confirm.

## Index

| File | Phase | Owner rule |
|---|---|---|
| `delete-collapse.md` | 3 | independent |
| `delete-expansion-panel.md` | 3 | independent |
| `delete-slider.md` | 3 | independent |
| `delete-datepicker.md` | 3 | independent |
| `rename-snackbar-import.md` | 0/3 | independent |
| `rename-tabbar-import.md` | 0/3 | independent |
| `rename-chipfield-typeahead-imports.md` | 0/3 | independent |
| `rename-confirm-dialog-button-types.md` | 0/3 | independent |
| `fix-default-cva-buttonfield.md` | 2 | independent |
| `add-slider-cva.md` | 2 | independent |
| `add-datepicker-cva.md` | 2 | independent |
| `update-index-exports.md` | 3 | **serialized** — run AFTER deletions + CVAs (sole editor of `src/index.ts`) |
| `demo-remove-slider.md` | 3 | independent |
| `demo-remove-datepicker.md` | 3 | independent |
| `demo-remove-expansion-panel.md` | 3 | independent (+ shared edits to routing/nav — serialize those) |
| `tests/*.md` | 2 | one per test target; see `tests/_PATTERN.md` |

## Status (executed)

Migration applied and verified:
- web 3.9.0 integrated to `main` + pushed; Angular consumes it as a **git submodule** at
  `./universal-material-web` (an external git repo, NOT an npm/package.json dependency), built by
  `npm run build:web` (auto-run via `prestart`/`prebuild`/`pretest`) and resolved through a tsconfig path map
  (`@universal-material/web` → `universal-material-web/dist/index`).
- Conflicting **library** components deleted (collapse, expansion-panel(+container), slider, datepicker module) + index cleaned.
- Demo pages were **kept and migrated to the native web components + new CVAs** (NOT removed): `slider` →
  `<u-slider [(ngModel)]>`, `expansion-panel` → native `<u-expansion-panel>` with `<span slot="header">`,
  `datepicker` → native `<u-datepicker>`/`<u-range-datepicker>` with `[(ngModel)]` (the old Angular-datepicker-only
  features — `u-datepicker-input`, `inputFormatter`, `min`/`max`, `dayTemplate`, `[(date)]` — have no native
  equivalent and were dropped). Routes + nav (Datepicker, Slider under Forms Controls; Expansion panel under Layout) intact.
- `Um*` web-lib imports renamed; `u-button-field` dropped from the default CVA selector.
- New CVAs added: `slider-control-value-accessor`, `datepicker-control-value-accessor`.
- **Tests:** library suite `ng test universal-material-angular` → **88 passing**. New specs (all green):
  value-accessors (default, check, radio, select, chip-field, typeahead, **slider**, **datepicker**) and
  directives (ripple, dropdown, tab-bar, floating-action-behavior, text-input, label). Pre-existing
  Angular-20 spec breaks fixed (form-field, dialog-body, live, `common.ts`).
- `npm run build` (library) and `npm run build:demo` (demo app) both succeed.

**Submodule consumption gotcha (important):** because `@universal-material/web` is a git submodule (source),
**not** an npm package, its *runtime* dependencies are not auto-installed. The Angular dev server (Vite) resolves
bare imports (`lit`, `@bart-krakowski/get-week-info-polyfill`, `@lit/context`, `@material/material-color-utilities`,
`dompurify`, `swiper`, `@lit-labs/virtualizer`) from THIS project's `node_modules`, so they are declared in the
root `package.json` `dependencies` (kept in sync with `universal-material-web/package.json`). `ng build`/`ng test`
also reach the submodule's nested `node_modules`, but `ng serve` does not — hence the explicit declarations.
Note: `ng serve` does NOT pick up `angular.json`/`tsconfig.json` changes; restart it after config edits.

**Known pre-existing failures (NOT caused by this migration):** `src/util/positioning.spec.ts` (~16 geometry
assertions) fails in headless Chrome due to DOM-isolation/layout sensitivity. The suite never compiled under
Angular 20 before this work (it imported the removed `async` symbol), so these latent tests were never run.
Out of scope here; track separately.

## Collision rule

`src/index.ts`, `demo/src/app/app.routing.ts`, and `demo/src/app/navigation/navigation.component.html`
are **shared files**. Only `update-index-exports.md` edits `src/index.ts`; routing/nav edits are batched in
the demo tasks but must be applied serially, not by parallel agents simultaneously.
