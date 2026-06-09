# Task 06 — Shared form-contract reference for all wrappers

> **Status:** ready to implement.
> **Architecture authority:** `planning/architecture/00-decision.md` §1 ("research finding that reshapes the wrapper strategy"), §5 (package layout), §8 (versioning); `planning/current/02-web-form-contracts.md` (the verified per-element contract); `planning/research/form-participation.md` (the per-framework glue matrix).
> **One-line scope:** Codify the canonical per-component form/value contract (element | value prop | events | `formAssociated?` | where the value lives) into ONE shared, machine-and-human-readable reference — a hand-authored `docs/CONTRACTS.md` plus an OPTIONAL generated `contracts.json` derived from `dist/custom-elements.json` — that the React/Svelte/Solid wrapper tasks (07/09/10) and the docs framework pages (11) all cite instead of re-deriving the contract (and re-introducing contradictions like the button-class-chain one).

---

## Scope (ONE unit only)

Produce the **single source of truth** for the web library's form-participation contract, so every downstream wrapper/doc task references it instead of re-reading `src/` and drifting:

1. **(Primary, load-bearing)** A reference document
   `D:/Projects/universal-material-web/planning/reference/form-contracts.md` —
   the canonical, verified table of every form-ish `u-*` element: tag, value
   prop(s), the events it emits, **where the live value lives** (`$event.target.value`
   vs `target.checked` vs the IDL prop), whether it is a Form-Associated Custom
   Element (FACE), and the recommended per-framework binding note. This is a
   **distilled, single-table** restatement of `planning/current/02-web-form-contracts.md`
   purpose-built for wrapper authors — it does NOT re-derive; it cites that doc as
   the evidence trail.
2. **(Also load-bearing — the P1-2 fix)** A short **"Non-input / submitter elements"**
   section that states the **button class chain ONCE and correctly**, so downstream
   docs stop contradicting each other:
   **`Button → ToggleButton → ButtonBase → ButtonWrapper → LitElement`**, with
   `static formAssociated = true` and the `attachInternals()`/`setFormValue()`
   **submitter** plumbing living on **`ButtonBase`** (`src/button/button-base.ts:8-10,33,46`),
   NOT on `ButtonWrapper`. `u-button`/`u-fab`/`u-fab-menu-item` are FACE **submitters**,
   not bindable value fields.
3. **(Optional, recommended)** A generated **`packages/contracts.json`** (or a
   committed `planning/reference/form-contracts.json`) produced by a tiny Node
   script that reads `dist/custom-elements.json` and emits the machine-readable
   shape `{ tag, valueProps, events, formAssociated, valueLocation }`. This gives
   the React generator (task 07) and the optional `.d.ts` packages a programmatic
   list to iterate, instead of hard-coding 64 tag names by hand.

**This task does NOT:**
- Build any framework wrapper (React/Vue/Svelte/Solid/Angular) — those are tasks 04/07/08/09/10.
- Add a docs **page** in the Angular docs app (that is task 11 — this task produces the
  *reference content* task 11 will cite/quote; it lives under `planning/`, not `docs/src/app/`).
- Touch the web library `src/`, its build pipeline, `dist/` artifacts (it *reads*
  `dist/custom-elements.json` but never writes there), `skills/`, or `.claude-plugin/`.
- Change any runtime behavior, event name, value prop, or `formAssociated` flag.
  This task **documents** the contract; it must not alter it.
- Set up Changesets, CI, or release wiring.

This is a **pure-additive, read-only-against-source** deliverable. Its only job is
to remove the per-task re-derivation that produced the contradictions REVIEW.md flags.

---

## Preconditions & Dependencies

- **Hard dependency:** `02-monorepo-scaffold.md` (the workspaces skeleton). This is
  the only listed dependency. It is needed **only** for the optional generated-JSON
  half *if* you choose to land the JSON under a workspace path (`packages/`). The
  primary markdown reference has **no** structural dependency on the workspace and
  can ship before/independently of `02`.
  - If `02-monorepo-scaffold.md` has **not** landed, ship the markdown reference under
    `planning/reference/` (no workspace needed) and emit the optional JSON as a sibling
    `planning/reference/form-contracts.json` (also workspace-free). Do **not** block on `02`.
- **No dependency** on `03-relocate-web-package.md`, `04-relocate-angular-package.md`,
  or `05-build-orchestration.md`. Web stays at the repo root (per
  `planning/architecture/00-decision.md` §4), so `src/` and `dist/custom-elements.json`
  are already where this task reads them today — relocation never happens (web is not
  moved into `packages/web`).
- **No dependency** on any wrapper task — this task is *upstream* of 07/09/10/11; they
  cite it, not the reverse.
- **Soft input only:** the three grounding docs listed in the header must exist (they
  do today). This task is a faithful distillation of them; it must not invent contract
  facts not present there or in `src/`.

If you are running this standalone before `02`: do the markdown reference (Part A) and
the workspace-free JSON (Part B emitted to `planning/reference/`), and note in the PR that
relocating the JSON under `packages/` is a trivial follow-up once `02` lands.

---

## Context (enough to execute COLD)

A fresh agent with zero chat memory must be able to run this. Everything below is
verified against the repo at `D:/Projects/universal-material-web`.

### What @universal-material/web is, mechanically
- `@universal-material/web@3.9.0` (next publish `3.10.0`) is a pure-ESM Material 3 Lit
  component library. Components register as custom elements under the **`u-` tag prefix**
  via `@customElement('u-...')`, with an unprefixed PascalCase class (`u-select` →
  `class Select`, `u-button` → `class Button`). The class barrel is
  `D:/Projects/universal-material-web/src/index.ts`: it does side-effect registration
  imports (e.g. `import './button/button.js'`) then **`export *`**-re-exports every class
  (verified: `src/index.ts:62` `export * from './button/button.js';`, `:99` `export *
  from './select/select.js';`). The web library stays at the **repo root**; it is NOT
  moved under `packages/web` (`00-decision.md` §4).
- There are **64** `@customElement('u-*')` declarations in `src/` (verified count). The
  committed `dist/custom-elements.json` is **stale**: it currently reports only **53**
  custom-element entries and old `name` values like `UmSelect` (verified by reading
  `dist/custom-elements.json`). **The CEM must be regenerated before being used as the
  generator input** — see the generation step below.

### Why this reference exists (the problem it solves)
The per-framework research (`00-decision.md` §1) is decisive: **every input-like `u-*`
element is a Form-Associated Custom Element (FACE)** — it sets `static formAssociated =
true`, calls `attachInternals()`, and pushes value via `ElementInternals.setFormValue(...)`.
Because of that, React/Vue/Svelte/Solid get value submission + constraint validation for
free and only need to read the value back on `input`/`change`. The exact "read the value
back" contract differs per element (some expose `value` at `$event.target.value`, the
selection controls expose `checked` at `$event.target.checked`, chip-field is an array
that does NOT sit at `target.value`, etc.). Tasks 07/09/10/11 each need that table. Without
a single shared copy, they re-read `src/` and disagree — `planning/REVIEW.md` §P1-2
documents exactly this: the button class chain was described two incompatible ways across
docs. This task writes the contract **once** so they all cite it.

### The verified per-component contract (the heart of the deliverable)
Source of truth: `planning/current/02-web-form-contracts.md` (verified against `src/`).
The canonical table the reference must reproduce (value location is what wrapper authors
get wrong):

| Element(s) | Value prop(s) | Live event(s) — and where the value lives | FACE? | Notes for wrappers |
| --- | --- | --- | --- | --- |
| `u-text-field`, `u-text-area`, `u-search` | `value: string` | native `input` (composed) — value on `$event.target.value`; no own `change` re-dispatch for plain text | ✅ (`NativeTextFieldWrapper` → `TextFieldBase`) | the "just works" native-input contract |
| `u-datepicker`, `u-range-datepicker` | `value: string` (ISO `YYYY-MM-DD`, or `… - …` range) | `input` (composed) + `change` (bubbles, **not** composed) — value on `$event.target.value` | ✅ (`NativeTextFieldWrapper`) | `change` is host-re-dispatched; bind on the element |
| `u-select` | `value: string` (+ `selectedIndex: number`) | `input` (composed) + `change` (bubbles, **not** composed) on user pick — value on `$event.target.value` (the IDL `value` prop) | ✅ (`TextFieldBase`) | **no `value` *attribute*** — IDL prop only; initial selection via `<u-option selected>` |
| `u-checkbox`, `u-radio`, `u-switch` (+ `*-list-item`) | `checked: boolean` (+ `value: string`, default `'on'`) | native `input` (composed) + `change` (re-dispatched, **not** composed) — value on `$event.target.checked` | ✅ (`SelectionControl`) | **NOT** at `target.value`; indeterminate checkbox submits `null` |
| `u-slider` | `value: number` (single) OR `valueStart`/`valueEnd: number` (range) | `input` (bubbles, composed) continuously + `change` (bubbles, **composed**) on commit — value on `$event.target.value` (number) | ✅ (own `formAssociated`) | range mode = two props → submitted as `name-start`/`name-end`; one scalar can't model it |
| `u-chip-field` | `value: any[]` (one entry per chip) | `change` (bubbles, **not** composed) on add/remove + native `input` while typing; `remove` CustomEvent (cancelable) | ✅ (`TextFieldBase`) | **array value, NOT at `target.value`** — read `el.value`; mutate via `add()`/`removeAt()` or reassign |
| `u-typeahead` | `value: any` (often an object) | `input` (composed) + `change` (bubbles, not composed); `selected` CustomEvent (cancelable) | ✅ (own `formAssociated`) | drives an external target input by `target-id`; no `disabled` prop |
| `u-button-field` | `value: string` (setter only) | **none** (display-only; set programmatically / menu-driven) | ✅ (`TextFieldBase`) | not a bindable input — one-way `:value` only |
| `u-field` | — (slots a native control) | none of its own (tracks `empty` off the slotted control) | ❌ **no** | presentational shell; bind the slotted native `<input>`/`<select>` directly |
| `u-option` | `value: string`, `selected: boolean` | none (delegates to parent `u-select._setSelectedByUser`) | ❌ no (menu item) | bind `u-select`, not options |

> **Mental model to print verbatim** (so every wrapper task copies the same words):
> *On a `u-*` form element, the framework's job is only to (a) write the value property
> and (b) read it back on `input` (live) / `change` (committed), **on the `u-*` element
> itself**. `change` is NOT `composed` for selection controls / select / datepickers /
> chip-field / typeahead (native parity — the host re-dispatches it), so never rely on it
> crossing a framework-owned ancestor shadow boundary. The slider is the lone exception:
> its `change` is `composed: true`.*

### The button class chain — stated ONCE, correctly (RESOLVES REVIEW P1-2)
Verified by reading the source files (cite these exact anchors in the reference):
- `src/button/button.ts:17` — `class Button extends ToggleButton`
- `src/button/toggle-button.ts:11` — `abstract class ToggleButton extends ButtonBase`
- `src/button/button-base.ts:8` — `abstract class ButtonBase extends ButtonWrapper`
- `src/button/button-base.ts:10` — `static readonly formAssociated = true;`
- `src/button/button-base.ts:33` — `this.#elementInternals = this.attachInternals();`
- `src/button/button-base.ts:46` — `this.#elementInternals.setFormValue(this.value);` (on click, as the form **submitter**)
- `src/shared/button-wrapper.ts:15` — `abstract class ButtonWrapper extends LitElement` — **no `formAssociated`**; provides ripple/elevation/link-vs-button rendering + `disabled`/`href`/`target`/`name`.

**The canonical sentence the reference must contain (and tasks 07/09/10/11 must reuse):**
> `u-button` / `u-fab` / `u-fab-menu-item` follow the chain
> **`Button → ToggleButton → ButtonBase → ButtonWrapper → LitElement`**. The FACE
> **submitter** plumbing (`static formAssociated = true`, `attachInternals()`,
> `setFormValue(value)`, `form.requestSubmit()`/`form.reset()`) lives on **`ButtonBase`**
> — *not* on `ButtonWrapper`. These elements act as form **submitters** (they patch
> `submitter` and call `requestSubmit()`), **not** as bindable value fields. Do not model
> them as inputs in any wrapper.

This single statement is the P1-2 resolution: it pins where `formAssociated` lives so
`current/01-web-library.md` ("extend `ButtonWrapper`") and
`research/form-participation.md` ("extend `ButtonBase`") stop reading as a contradiction —
both are true, two levels apart in the chain.

### Elements that are NOT form fields (so wrappers don't bind them)
Per `02-web-form-contracts.md` and `research/form-participation.md` §2.2: `u-chip`,
`u-tab-bar`, `u-toggle-button`, `u-expansion-panel`, `u-calendar`/`u-range-calendar`
(embedded inside the datepicker, which owns the FACE value), `u-dialog`, `u-menu`, and the
layout/navigation components emit events but carry **no** submittable value — treat them as
plain event-emitting components, never bindable fields.

### The optional machine-readable JSON
The web build already produces a Custom Elements Manifest. The `analyze` npm script is:
`cem analyze --litelement --globs "src/**/*.ts" && node fix-html-custom-data-union-types.js`
(verified, `package.json:45`). It writes `custom-elements.json` at the **repo root**, which
the `copy` script then mirrors into `dist/` (`package.json:30`). **The committed
`dist/custom-elements.json` is stale** (53 entries, `UmSelect` names) — so the generator
must run `analyze` first (or read root `custom-elements.json` right after) so the input has
all 64 elements and the post-API-hardening class names. The CEM schema is
`schemaVersion: 1.0.0`; each element entry exposes `tagName`, `members` (fields), and an
`events: [{ name }]` array (verified by inspecting the manifest). The generator pairs that
list with the FACE/value-location facts from the table above (which the CEM does **not**
encode — `formAssociated` and "value lives at `target.checked`" are hand-curated).

### Where this lives (RESOLVED)
- **Markdown reference → `planning/reference/form-contracts.md`** (NEW `planning/reference/`
  dir). It is planning/spec material, peer to `planning/current/` and `planning/research/`.
  Task 11 (docs-integration) will quote/transclude it into the Angular docs app; this task
  does not touch `docs/src/app/`.
- **JSON → `planning/reference/form-contracts.json`** committed (workspace-free), plus a
  generator script `planning/reference/gen-contracts.mjs`. If `02-monorepo-scaffold.md` has
  landed and you prefer a workspace home, the JSON may instead live at
  `packages/contracts/contracts.json` — but the workspace-free `planning/reference/` path
  is the recommended phase-1 location and the one the rollback notes assume.

---

## Step-by-step changes (exact paths + commands)

> **Working directory for all commands:** `D:/Projects/universal-material-web`.
> All file paths are absolute. PowerShell on Windows.

### PART A — the canonical markdown reference (do this regardless of workspace state)

**A1. Create the directory and file**
`D:/Projects/universal-material-web/planning/reference/form-contracts.md`.

**A2. Author it** with these sections, in order (content drawn verbatim-in-spirit from the
Context above; **cite `src/` line anchors and `02-web-form-contracts.md`**, never invent):
1. **Purpose & how to use** — "Single source of truth for wrapper authors. Tasks
   07/09/10/11 cite THIS table; do not re-read `src/`." One paragraph.
2. **The verdict** — every input-like `u-*` is a FACE (`static formAssociated = true` +
   `attachInternals()` + `setFormValue()`); consequence = React/Vue/Svelte/Solid get
   submission + validation free, only value read-back remains. Cite `00-decision.md` §1.
3. **Canonical contract table** — reproduce the 10-row table from Context verbatim
   (element | value prop | live event + where value lives | FACE? | wrapper notes).
4. **Mental model** — the "framework's job is write-prop + read-on-event, on the element
   itself; `change` is not composed except slider" block, verbatim.
5. **Non-input / submitter elements (the P1-2 section)** — the button class chain stated
   once and correctly, with the `src/button/*.ts` line anchors, plus the "submitter not
   value field" sentence. Then the "NOT form fields" list (`u-chip`, `u-tab-bar`, …).
6. **Shared base classes** — one line each: `TextFieldBase`
   (`src/shared/text-field-base/text-field-base.ts:18,61`), `NativeTextFieldWrapper`
   (`src/shared/char-count-text-field/native-text-field-wrapper.ts:19`), `SelectionControl`
   (`src/shared/selection-control/selection-control.ts:62,126`), `ButtonBase`
   (`src/button/button-base.ts:10,33`). So readers know where the plumbing lives.
7. **Per-framework cross-reference** — a 1-line pointer for each downstream task:
   React (task 07) iterates the JSON to generate `@lit/react` wrappers;
   Vue (task 08) / Svelte (task 09) / Solid (task 10) cite the table for `v-model` /
   `bind:value` / signal rules; docs (task 11) renders the table on each framework page.
8. **Evidence trail** — link `planning/current/02-web-form-contracts.md` and
   `planning/research/form-participation.md` as the verified derivations.

**A3. Cross-link from the grounding docs (light touch, optional but recommended).** Add a
single "Canonical wrapper-facing distillation: `planning/reference/form-contracts.md`" note
near the top of `planning/current/02-web-form-contracts.md` so future readers land on the
shared copy. This is the only edit outside `planning/reference/`. Skip if you prefer zero
edits to existing files (the reference stands alone either way).

### PART B — the optional generated JSON (workspace-free; do unless explicitly out of scope)

**B1. Regenerate the Custom Elements Manifest** (the committed `dist/custom-elements.json`
is stale — 53 entries, old names):
```powershell
npm run analyze
```
This writes a fresh `custom-elements.json` at the repo root (64 elements, current class
names) and runs the html-custom-data fixup. (`npm run build` also does this via its
`analyze` step, but `analyze` alone is sufficient and faster.)

**B2. Create the generator** `D:/Projects/universal-material-web/planning/reference/gen-contracts.mjs`:
- Read the freshly generated `D:/Projects/universal-material-web/custom-elements.json`
  (root copy — newer than `dist/`).
- Walk `modules[].declarations[]` where `customElement === true`; collect `tagName`,
  `members` (kind `field`) names, and `events[].name`.
- Merge in the **hand-curated** FACE facts the CEM does not encode — a small literal map
  keyed by tag: `{ formAssociated: boolean, valueProps: string[], valueLocation:
  'target.value' | 'target.checked' | 'el.value' | 'none', isFormField: boolean }` —
  sourced from the canonical table in Part A. (The CEM gives you the tag/event list for
  free; FACE + value-location are curated, exactly as the markdown table is.)
- Emit `D:/Projects/universal-material-web/planning/reference/form-contracts.json` as a
  sorted array of `{ tag, valueProps, events, formAssociated, valueLocation, isFormField }`.
- Mark the submitter trio (`u-button`/`u-fab`/`u-fab-menu-item`) with
  `valueLocation: 'none', isFormField: false, role: 'submitter'` so downstream generators
  skip them as inputs.

**B3. Run it and commit the output:**
```powershell
node planning/reference/gen-contracts.mjs
```
Commit both `gen-contracts.mjs` and the generated `form-contracts.json` (the JSON is small
and the human-readable diff is useful; regenerate on contract changes).

> **Do NOT** write into `dist/` or alter the web build. The generator only *reads* the root
> `custom-elements.json` and writes under `planning/reference/`.

---

## Acceptance criteria

**Part A (markdown reference) — required:**
1. `planning/reference/form-contracts.md` exists and contains the **canonical 10-row
   contract table** with, for every form-ish element, its value prop(s), live event(s),
   **where the value lives** (`target.value` / `target.checked` / `el.value` / none), and
   FACE flag — matching `planning/current/02-web-form-contracts.md`.
2. The doc states the **button class chain exactly once and correctly**:
   `Button → ToggleButton → ButtonBase → ButtonWrapper → LitElement`, with
   `formAssociated`/`attachInternals`/`setFormValue` on **`ButtonBase`** (not
   `ButtonWrapper`), and labels `u-button`/`u-fab`/`u-fab-menu-item` as **submitters, not
   value fields** — resolving REVIEW P1-2.
3. The doc explicitly lists the **non-form-field** elements (`u-chip`, `u-tab-bar`,
   `u-toggle-button`, `u-expansion-panel`, `u-calendar`/`u-range-calendar`, `u-dialog`,
   `u-menu`, layout/nav) so wrappers don't bind them.
4. The doc names the four shared base classes with `src/` line anchors, and includes the
   "write-prop + read-on-event; `change` not composed except slider" mental-model block.
5. The doc cites `02-web-form-contracts.md` + `form-participation.md` as its evidence
   trail and contains **no contract fact absent from those sources or `src/`**.
6. No files under `src/`, `dist/`, `skills/`, `.claude-plugin/`, or `docs/src/app/` are
   modified (the optional A3 cross-link in `planning/current/` is the only allowed edit
   outside `planning/reference/`).

**Part B (optional generated JSON) — if in scope:**
7. `planning/reference/gen-contracts.mjs` reads the **freshly regenerated** root
   `custom-elements.json` (not the stale committed `dist/` copy) and emits
   `planning/reference/form-contracts.json`.
8. `form-contracts.json` contains **one entry per form-ish `u-*` element**, each with
   `{ tag, valueProps, events, formAssociated, valueLocation, isFormField }`, and the JSON
   round-trips (`JSON.parse` succeeds).
9. The submitter trio is present with `isFormField: false` / `role: 'submitter'`, and the
   non-field elements are either absent or flagged `isFormField: false`.
10. The `valueLocation` / `formAssociated` values in the JSON **agree** with the markdown
    table (single source of truth — they must not diverge).

---

## Verification commands

> Run from `D:/Projects/universal-material-web`. PowerShell. The dev server (`npm run docs`)
> is irrelevant to this task (no docs page is added) — do not restart it.

**V1 — markdown reference exists and has the key sections (Part A):**
```powershell
Test-Path planning/reference/form-contracts.md
Select-String -Path planning/reference/form-contracts.md -Pattern 'ButtonBase','formAssociated','target.checked','u-chip-field','submitter' | Select-Object LineNumber, Line
```
Expect the file to exist and all five anchors to be present.

**V2 — the button chain is stated correctly and only once (Part A, P1-2):**
```powershell
(Select-String -Path planning/reference/form-contracts.md -Pattern 'Button → ToggleButton → ButtonBase → ButtonWrapper').Count
```
Expect `1` (stated once). Manually confirm the surrounding prose puts `formAssociated` on
`ButtonBase`, not `ButtonWrapper`.

**V3 — claims match source (spot-check the load-bearing anchors):**
```powershell
Select-String -Path src/button/button-base.ts -Pattern 'extends ButtonWrapper','static readonly formAssociated = true','attachInternals'
Select-String -Path src/button/toggle-button.ts -Pattern 'extends ButtonBase'
Select-String -Path src/button/button.ts -Pattern 'extends ToggleButton'
```
Confirms the chain the doc asserts is real (all three should match).

**V4 — element count sanity (Part B input):**
```powershell
# 64 @customElement('u-*') decls in src/ (the doc/JSON's universe):
(Select-String -Path (Get-ChildItem -Recurse src -Filter *.ts) -Pattern "@customElement\('u-" -AllMatches).Matches.Count
```
Expect `64`. (Note: the committed `dist/custom-elements.json` lists only 53 — that is the
stale build the generator must NOT use directly; `npm run analyze` refreshes it.)

**V5 — generated JSON is valid and consistent (Part B):**
```powershell
node -e "const c=require('./planning/reference/form-contracts.json'); console.log('entries=',c.length); const b=c.find(x=>x.tag==='u-button'); console.log('u-button isFormField=',b?.isFormField, 'role=',b?.role); const cf=c.find(x=>x.tag==='u-chip-field'); console.log('u-chip-field valueLocation=',cf?.valueLocation);"
# expect: u-button isFormField=false role=submitter ; u-chip-field valueLocation=el.value
```

**V6 — web library + dist untouched:**
```powershell
git status --porcelain src dist skills .claude-plugin docs/src/app
# expect: no output (nothing changed under those paths).
# Note: `npm run analyze` rewrites the ROOT custom-elements.json (a build artifact, not
# committed source); if it shows as modified, `git checkout -- custom-elements.json` after
# generating the JSON — the generator only needs it transiently.
```

---

## Rollback notes

- **Part A is fully additive and isolated** to `planning/reference/`. To roll back:
  `Remove-Item -Recurse planning/reference` (or just `planning/reference/form-contracts.md`).
  If you added the optional A3 one-line cross-link in
  `planning/current/02-web-form-contracts.md`, revert it with
  `git checkout -- planning/current/02-web-form-contracts.md`. No build artifacts, no
  generated source, nothing downstream breaks (the reference is *cited* by future tasks, not
  *imported* by any build).
- **Part B is fully additive** under `planning/reference/`. To roll back: delete
  `planning/reference/gen-contracts.mjs` and `planning/reference/form-contracts.json`. If
  `npm run analyze` left a modified root `custom-elements.json` in the working tree,
  `git checkout -- custom-elements.json` restores the committed copy. No package consumes the
  JSON yet (tasks 07/09/10 will, additively, later), so removal cannot break any current
  build.
- **Nothing in this task modifies the web build pipeline, `dist/` publish output, the
  postinstall patch, `skills/`, `.claude-plugin/`, or any published contract.** There is zero
  publish-time or runtime regression risk for existing consumers — it is documentation plus an
  optional derived JSON.

---

## Parallelizable in worktree? **yes** — why

This task is **content-only, read-only against source, and writes a disjoint file set**:
`planning/reference/**` (entirely new) and, at most, a single one-line cross-link append in
`planning/current/02-web-form-contracts.md`. It does **not** modify the web library `src/`,
the build pipeline, `dist/`, `skills/`, `.claude-plugin/`, the docs app, or any package under
`packages/`. It depends only on `02-monorepo-scaffold.md`, and even that only for the
*optional* choice of relocating the JSON under `packages/` — the recommended
`planning/reference/` location is workspace-free, so the task can run **before `02` lands**.
It is strictly **upstream** of every wrapper/doc task (07/09/10/11 cite it; it cites none of
them), so there is no build-order coupling and no write-conflict surface with sibling
wrapper worktrees — those tasks add their own files and merely *reference* this reference's
path. The only thing it reads from the build is `custom-elements.json` (which it regenerates
transiently via `npm run analyze` and does not commit), so it never contends with the web →
wrapper build chain. Safe to run fully in parallel in its own worktree.
