# Angular Wrapper Library Inventory (`universal-material-angular`)

**Root:** `D:/Projects/universal-material-angular/src`
**Purpose of this doc:** Exhaustive catalogue of every unit in the Angular wrapper for `@universal-material/web`, so an equivalent React/Vue/Svelte wrapper knows exactly *what* must be replicated and *which web contract* each piece bridges. The Angular library is a thin "glue" layer: the actual UI lives in the framework-agnostic web components (`@universal-material/web`). The wrapper exists to (a) bridge custom-element value/event into the framework's two-way binding / forms system, and (b) re-implement a handful of behaviors that the web library does **not** ship as custom elements (ripple directive, dropdown positioning, scroll-driven FAB hide, Angular-rendered dialogs).

---

## TL;DR — what an equivalent wrapper MUST replicate vs MAY skip

**MUST replicate (these bridge a real web-component contract that a framework needs help wiring):**

- The 8 form bindings (CVAs). Each maps a web component's `value`/`checked` property + DOM `change`/`input` event into the framework's controlled/v-model/bind:value mechanism. See table.
- `TabBarDirective` — two-way binds `<u-tab-bar>.activeTabIndex` ↔ framework state (the web component fires `change` and mutates `activeTabIndex`; needs reconciliation).
- Snackbar / Dialog / ConfirmDialog / ProgressDialog **service** ergonomics — but note these mostly re-wrap APIs that already exist on the web side (`Snackbar.show()`, `ConfirmDialogBuilder`). A framework wrapper can largely call the web APIs directly.

**MAY skip / re-evaluate (pure Angular glue, or behavior the web library already owns, or dormant code):**

- `RippleDirective` — re-implements ripple in TS for **plain host elements** (`[uRipple]`). The web library's own interactive components already bottom out at `u-ripple`; this directive is only for decorating arbitrary non-web-component hosts. Likely not needed in a fresh wrapper unless the consumer wants ripple on arbitrary divs.
- `DropdownDirective` + toggle + menu — **NOT registered in `index.ts`** (the `DropdownModule` is dead/optional). Legacy ng-bootstrap-style dropdown positioning. Skip unless explicitly required.
- `FloatingActionBehaviorDirective` — scroll-hide behavior for a FAB; pure DOM/scroll glue, no web contract. Re-implement only if the feature is wanted.
- `FormFieldComponent` + `LabelDirective` + `TextInputDirective` + `TextInputBase` — an **Angular-rendered** form-field shell (`u-form-field` is an Angular component here, not a web component). This is legacy: the web library now ships its own `u-text-field` etc. Treat as legacy; a new wrapper should prefer the web components directly.
- `DialogComponent` (`u-legacy-dialog`) + `DialogBaseComponent` + `DialogService` + `DialogStackService` + `DialogInjector` — **Angular-rendered legacy dialog** system (selector literally `u-legacy-dialog`). Superseded by the web library's dialog + `ConfirmDialogBuilder`. Legacy.
- `util/*` except a few — most of `util/` is dormant ng-bootstrap-derived code (positioning, popup, autoclose, triggers, focus-trap, scrollbar, live, transition, etc.) that nothing in the active graph imports. Skip.

---

## Module registration (`src/index.ts`)

`index.ts` declares one root `UniversalMaterialModule`. It is the source of truth for *what actually ships and is wired*:

```
UniversalMaterialModules (imports/exports):
  DialogModule, RippleModule, FormFieldModule, TextFieldModule,
  TabBarDirective, FloatingActionBehaviorDirective

FormComponents (declarations — the CVAs):
  UmDefaultControlValueAccessor, UmCheckControlValueAccessor,
  UmRadioControlValueAccessor, UmChipFieldControlValueAccessor,
  UmTypeaheadControlValueAccessor, UmSelectControlValueAccessor,
  UmSelectOption, UmSliderControlValueAccessor, UmDatepickerControlValueAccessor
```

**Not in the root module:** `DropdownModule` (and its 3 directives) — declared in `src/dropdown/dropdown.module.ts` but never imported by `index.ts`. Dialog/snackbar/confirm services are `providedIn: 'root'` so they need no module entry.

---

## Category 1 — Value Accessors (the 8 CVAs) — `src/value-accessors/`

Each CVA implements/extends Angular's `ControlValueAccessor` to bridge a web component's value property + DOM event into Angular forms (`ngModel`/`formControl`/`formControlName`). **This is the single most important category to replicate per-framework.** The "bridges" column is the exact web contract (property written + event listened) that any wrapper must reproduce.

| Unit | Selector | Type | Bridges-which-web-contract | Keep/Legacy |
|---|---|---|---|---|
| `UmDefaultControlValueAccessor` (`default-control-value-accessor.ts`) | `u-text-field`, `u-text-area`, `u-search` (each w/ `ngModel`/`formControl`/`formControlName`) | CVA (extends Angular `DefaultValueAccessor`) | Writes `.value`; listens to native `input`/`change`. Note in code: `u-button-field` intentionally **excluded** (has a `value` setter but emits no input/change → display-only). | **Keep** |
| `UmCheckControlValueAccessor` (`check-control-value-accessor.ts`) | `u-checkbox`, `u-switch`, `u-checkbox-list-item`, `u-switch-list-item` | CVA (extends Angular `CheckboxControlValueAccessor`) | Writes `.checked`; listens to `change`. Boolean control. | **Keep** |
| `UmRadioControlValueAccessor` (`radio-control-value-accessor.ts`) | `u-radio`, `u-radio-list-item` | CVA (extends Angular `RadioControlValueAccessor`) | Writes `.checked` per radio group; listens to `change`. Group-coordinated single value. | **Keep** |
| `UmSelectControlValueAccessor` + `UmSelectOption` (`select-control-value-accessor.ts`) | `u-select` / `u-option` | CVA (extends Angular `SelectControlValueAccessor` / `NgSelectOption`) | Writes `.value`; listens to `change`. `UmSelectOption` registers each `u-option` and tracks id↔value. Overrides: `_writeValueAfterRender` deferred via `queueMicrotask`; `UmSelectOption.ngOnDestroy` delayed 1000ms (works around option re-render churn — relevant to the recent "sticky value" fix on the web side). | **Keep** |
| `UmChipFieldControlValueAccessor` (`chip-field-control-value-accessor.ts`) | `u-chip-field` | CVA (implements `ControlValueAccessor`) | Writes `.value` (array; `obj ?? []`); host-binds `(change)` → `_handleChange(target.value)`. `setDisabledState`→`disabled`. Multi-value (chip array). | **Keep** |
| `UmTypeaheadControlValueAccessor` (`typeahead-control-value-accessor.ts`) | `u-typeahead` | CVA (implements `ControlValueAccessor`) | Writes `.value`; host `(change)` → `_handleChange(target.value)`. `setDisabledState`→`disabled`. | **Keep** |
| `UmSliderControlValueAccessor` (`slider-control-value-accessor.ts`) | `u-slider` | CVA (implements `ControlValueAccessor`) | **Range-aware.** If `el.range` or value is object/array → writes `valueStart`/`valueEnd`; else writes `value`. Listens to `input`+`change` (emits `{start,end}` or scalar), `blur`→touched. `setDisabledState`→`disabled`. | **Keep** |
| `UmDatepickerControlValueAccessor` (`datepicker-control-value-accessor.ts`) | `u-datepicker`, `u-range-datepicker` | CVA (implements `ControlValueAccessor`) | Writes `.value` (`value ?? null`); listens to `input`+`change`→reads back `.value`, `blur`→touched. `setDisabledState`→`disabled`. Same accessor serves single + range. | **Keep** |

> **Wrapper note:** The four hand-written CVAs (chip-field, typeahead, slider, datepicker) all follow one pattern: `writeValue → set property`, `setDisabledState → set 'disabled'`, and one or two DOM event listeners → `onChange`. The four extended ones (default/check/radio/select) reuse Angular's built-in accessors verbatim, just retargeting the selector to the `u-*` tag. A React/Vue/Svelte wrapper replicates the *property+event* mapping, not the Angular class hierarchy.

---

## Category 2 — Directives (behavioral glue) 

| Unit | Selector | Type | Bridges-which-web-contract | Keep/Legacy |
|---|---|---|---|---|
| `RippleDirective` (`ripple/ripple.directive.ts`) | `[uRipple]` | Pure Angular glue (no web component) | Re-implements M3 ripple in TS on an arbitrary host element (mousedown/touchstart → injects `.u-ripple-wrapper`/`.u-ripple` DOM, computes size/origin, transition cleanup). Inputs: `rippleConfig` (`RippleConfig`: size/borderRadius/dontChangePositioning), `rippleDisabled`. | **Legacy-ish / optional** — web lib's own components already include `u-ripple`. Only needed to ripple non-component hosts. |
| `TabBarDirective` (`tab-bar/tab-bar.directive.ts`) | `u-tab-bar` (standalone directive, `selector: 'u-tab-bar'`) | Web-component bridge | Two-way binds `<u-tab-bar>.activeTabIndex`. Reads via `change` listener; writes via Angular `effect`; uses `MutationObserver`+`debounceTime(100)` to reconcile when tabs add/remove and the index needs correcting. Exposes `activeTabIndex` `model()`. | **Keep** (real two-way binding contract) |
| `FloatingActionBehaviorDirective` (`floating-action-behavior/`) | `[uFloatingActionBehavior]` | Pure Angular glue | Extends `ScrollBehavior`; on scroll-down sets host `transform: translateY(150%)` (hide), scroll-up restores. Sets `transition: transform 150ms linear`. No web contract. | **Optional** — re-implement only if scroll-hide FAB wanted |
| `TextInputDirective` (`text-field/text-input.directive.ts`) | `[uTextInput]` | Angular form-field glue | Extends `TextInputBase`; host-binds `class.u-text-input`; wires `NgControl` + parent `FormFieldComponent`; stops click propagation. Bridges a *native* `<input>` inside the Angular `u-form-field` shell. | **Legacy** (Angular-rendered form field; web lib now has `u-text-field`) |
| `LabelDirective` (`form-field/label.directive.ts`) | `[uLabel]` | Angular form-field glue | Adds `.u-text-field-label`; sets `formField._hasLabel`; measures label width via `ResizeObserver` → sets `--u-text-field-label-width` CSS vars on the form-field. | **Legacy** (part of Angular form-field shell) |
| `DropdownDirective` (`dropdown/dropdown.directive.ts`) | `[uDropdown]` | Pure Angular glue (ng-bootstrap-style) | Coordinates `[uDropdownToggle]` + `[uDropdownMenu]`: open/close/toggle, auto-close on outside `window:click`, up/down direction auto-positioning. Input `autoClose: boolean\|'outside'`. **NOT registered in `index.ts`.** | **Legacy / dead-in-default-build** |
| `DropdownToggleDirective` (`dropdown/dropdown-toggle.directive.ts`) | `[uDropdownToggle]` | Pure Angular glue | Emits a `click` `Subject` consumed by `DropdownDirective`. | **Legacy** |
| `DropdownMenuDirective` (`dropdown/dropdown-menu.directive.ts`) | `[uDropdownMenu]` | Pure Angular glue | `[class.show]` host binding; `direction` input + `setDirectionClass`; stops click propagation, emits `click`. | **Legacy** |
| `DialogBodyDirective` (`dialog/dialog-body.directive.ts`) | `[uDialogBody]` | Angular dialog glue | Extends `ScrollBehavior`; toggles dialog scroll top/bottom divider signals based on scroll position of the dialog body. | **Legacy** (part of legacy dialog) |

---

## Category 3 — Component: Form Field — `src/form-field/`

| Unit | Selector | Type | Bridges-which-web-contract | Keep/Legacy |
|---|---|---|---|---|
| `FormFieldComponent` (`form-field.component.ts`) | `u-form-field` (Angular **component**, has its own template/SCSS) | Angular-rendered UI component | Renders the M3 text-field shell in Angular HTML (label float, supporting/error text, appearance: `box`/`outlined`/`search`). Inputs: `appearance`, `invalid`, `removeMargin`, `supportingText`, `errorText`, `selectionField`. Output: `activated`. Holds the active `InputBaseComponent`, focuses input on click, manages label-width CSS vars. `FORM_FIELD_DEFAULT_APPEARANCE` injection token. | **Legacy** — this predates the web library's own `u-text-field`. New wrappers should bind to web components, not this shell. |

`FormFieldAppearance` type (`form-field-appearance.ts`): `'default' | 'box' | 'outlined' | 'search'`.

---

## Category 4 — Services — `src/snackbar/`, `src/dialog/`

| Unit | Selector / Provider | Type | Bridges-which-web-contract | Keep/Legacy |
|---|---|---|---|---|
| `SnackbarService` (`snackbar/snackbar.service.ts`) | `providedIn:'root'` | Service (thin wrapper over web API) | `open(message, config)` → calls **`Snackbar.show({message, action, duration})`** from `@universal-material/web`; returns `SnackbarRef` (get/set message+action, `dismiss()`, `onAction` = `fromEvent(snackbar,'actionClick')`). Config token `SNACKBAR_DEFAULT_OPTIONS`. | **Keep** (ergonomic wrapper; web `Snackbar.show` is the real API) |
| `ConfirmDialogService` (`dialog/confirm-dialog/confirm-dialog.service.ts`) | `providedIn:'root'` | Service (thin wrapper over web API) | `open(message, config)` → builds **`ConfirmDialogBuilder.create(message)`** from web lib, applies confirm/cancel button + headline, `.show()` returns a Promise → wraps as `{onConfirm$, onCancel$}` Observables. | **Keep** (wraps web `ConfirmDialogBuilder`) |
| `DialogService` (`dialog/dialog.service.ts`) | `providedIn:'root'`; token `DIALOG_DATA` | Service — Angular dynamic component renderer | `open(DialogType, data)` dynamically instantiates an **Angular** `DialogComponent` subclass (via `ComponentFactoryResolver` + `DialogInjector`), attaches to `ApplicationRef`, appends to `<body>`, registers in `DialogStackService`, auto-destroys on `afterClose`. | **Legacy** (renders Angular dialog components, not web `u-dialog`) |
| `DialogStackService` (`dialog/dialog-stack.service.ts`) | `providedIn:'root'` | Service (pure Angular glue) | Maintains a static stack of open `DialogComponent`s; global `keydown` Escape closes the top-most dialog whose config allows `closeOnEsc`. | **Legacy** (supports legacy dialog) |
| `ProgressDialogService` (`dialog/progress-dialog/progress-dialog.service.ts`) | `providedIn:'root'` | Service | `open(message)` → `DialogService.open(ProgressDialogComponent)`, sets message signal + `show`. Provides `DIALOG_DEFAULT_OPTIONS` = no-backdrop-close / no-esc. | **Legacy** (built on legacy `DialogService`) |

---

## Category 5 — Dialog components/classes (legacy Angular dialog system) — `src/dialog/`

> **Legacy status confirmed:** `DialogComponent`'s selector is literally **`u-legacy-dialog`** (`dialog/dialog.component.ts` line 6). The whole Angular-rendered dialog stack is superseded by the web library's own dialog + `ConfirmDialogBuilder`. Catalogued for completeness; a new wrapper should NOT replicate this — it should call the web dialog/confirm builder APIs directly.

| Unit | Selector | Type | Bridges-which-web-contract | Keep/Legacy |
|---|---|---|---|---|
| `DialogBaseComponent` (`dialog-base.component.ts`) | `u-dialog-base` (abstract base) | Angular component (no web contract) | Base for Angular dialogs: `show` model, `afterClose`/`closedFromBackdrop` outputs, hide-animation via `AnimationEvents`, scroll-divider signals, backdrop/esc close via `DialogConfig`. Adds `.u-dialog` class. | **Legacy** |
| `DialogComponent` (`dialog.component.ts`) | **`u-legacy-dialog`** | Angular component | Concrete dialog = `DialogBaseComponent` + `dialog.component.html`/`.scss`. | **Legacy** |
| `ConfirmDialogComponent` (`confirm-dialog/confirm-dialog.component.ts`) | (abstract, no selector) | Angular component | Extends `DialogComponent`; sanitizes message (`DomSanitizer`), `onCancel`/`onConfirm` Subjects, merges `ConfirmDialogConfig`. | **Legacy** |
| `ProgressDialogComponent` (`progress-dialog/progress-dialog.component.ts`) | `u-progress-dialog` | Angular component | Extends `DialogComponent`; `message` signal; renders `u-circular-progress` (web component used inside via `CUSTOM_ELEMENTS_SCHEMA`); non-dismissable defaults. | **Legacy** |
| `DialogInjector` (`dialog-injector.ts`) | — | Plain class (Angular `Injector`) | Custom `Injector` that resolves `DIALOG_DATA` (and other custom tokens) before delegating to parent injector. | **Legacy** (supports `DialogService`) |

---

## Category 6 — Shared base classes — `src/shared/`

| Unit | Type | Bridges-which-web-contract | Keep/Legacy |
|---|---|---|---|
| `InputBaseComponent` (`shared/input-base.component.ts`) | TS **interface** | Contract `{ disabled, focused, empty, focus() }` that the Angular form-field's hosted input must satisfy. Pure Angular form-field glue. | **Legacy** (form-field shell) |
| `TextInputBase` (`shared/text-input-base.ts`) | Abstract `@Directive` base | Bridges a native `<input>` into the Angular `u-form-field`: `disabled` (defers to `NgControl`), `readonly`, `empty` (reads `.value`), focus/blur tracking, registers itself on the parent `FormFieldComponent`. Consumed by `TextInputDirective`. | **Legacy** (form-field shell) |

---

## Category 7 — Coercion — `src/coercion/`

| Unit | Type | Purpose | Keep/Legacy |
|---|---|---|---|
| `coerceBooleanProperty` (`coercion/boolean.coercion.ts`) | Pure fn (CDK-derived) | Coerces a bound value/empty-string-attr to boolean. Used by `TextInputBase.readonly`. | **Utility** (trivially re-implementable; framework-agnostic) |

---

## Category 8 — Util — `src/util/`

Most of `util/` is dormant ng-bootstrap-derived code. **Only these are imported by the active graph:**

| Unit | Type | Used by | Keep/Legacy |
|---|---|---|---|
| `Key` enum (`util/key.ts`) | Keycode enum | `DialogStackService` (Escape), `focus-trap` | Utility (trivial) |
| `ScrollBehavior` (`util/scroll-behavior.ts`) | Abstract directive | `FloatingActionBehaviorDirective`, `DialogBodyDirective` | Glue (scroll observation) |
| `ScrollableContainerWrapper` (`util/scrollable-container-wrapper.ts`) | Class | `ScrollBehavior` | Glue |
| `AnimationEvents` (`util/animations/animation-events.ts`) | Static helper | `DialogBaseComponent` (animationend cross-prefix) | Glue (legacy dialog) |
| `Direction` type (`util/direction.ts`) | Type union | `DropdownMenuDirective` | Glue (dead dropdown) |

**Dormant / unreferenced by the active build (no non-spec, non-self importers):** `util/util.ts` (toInteger/getValueInRange/closest/runInZone/...), `util/positioning.ts`, `util/popup.ts`, `util/autoclose.ts`, `util/triggers.ts`, `util/focus-trap.ts`, `util/scrollbar.ts`, `util/accessibility/live.ts`, `util/events/preventable-event.ts`, `util/background/get-parent-background.ts`, `util/animations/smooth-scroll.ts`, `util/transition/util.ts`, `util/transition/transition.ts`. **These are ng-bootstrap leftovers — skip entirely in any new wrapper.**

---

## Category 9 — Config / Ref models (DI tokens + interfaces)

Pure data/token declarations (no behavior). A non-Angular wrapper replaces these with plain options objects/return types.

| Unit | Path | What it is |
|---|---|---|
| `DialogConfig` + `DIALOG_DEFAULT_OPTIONS` | `dialog/dialog-config.model.ts` | `{closeOnBackdropClick?, closeOnEsc?}` + token. **Legacy.** |
| `ConfirmDialogConfig` + `CONFIRM_DIALOG_DEFAULT_OPTIONS` + `DefaultConfirmDialogConfig` | `dialog/confirm-dialog/confirm-dialog-config.model.ts` | Confirm button/title config + token. |
| `ConfirmDialogRef` | `dialog/confirm-dialog/confirm-dialog-ref.ts` | `{onCancel$, onConfirm$}`. **Keep** (return shape). |
| `SnackbarConfig` + `SNACKBAR_DEFAULT_OPTIONS` | `snackbar/snackbar-config.model.ts` | `{actionLabel?, duration?}` + token. **Keep.** |
| `SnackbarRef` | `snackbar/snackbar-ref.model.ts` | `{message, action?, onAction$, dismiss()}`. **Keep.** |
| `SnackbarDuration` | re-exported from `@universal-material/web` (via `index.ts`) | Duration enum — owned by the **web** library, not the wrapper. |
| `RippleConfig` | `ripple/ripple-config.model.ts` | `{size?, borderRadius?, dontChangePositioning?}`. Optional (with RippleDirective). |
| `FormFieldAppearance` | `form-field/form-field-appearance.ts` | `'default'\|'box'\|'outlined'\|'search'`. **Legacy.** |

---

## Modules (NgModule wiring — Angular-specific, not replicated cross-framework)

| Module | Path | Declares/exports |
|---|---|---|
| `UniversalMaterialModule` (root) | `index.ts` | Aggregates everything below + the 9 `FormComponents` (CVAs). |
| `DialogModule` | `dialog/dialog.module.ts` | `DialogComponent` (`u-legacy-dialog`), `DialogBodyDirective`; re-exports dialog services/types. **Legacy.** |
| `RippleModule` | `ripple/ripple.module.ts` | `RippleDirective`. |
| `FormFieldModule` | `form-field/form-field.module.ts` | `FormFieldComponent`, `LabelDirective` (+ `RippleModule`). **Legacy shell.** |
| `TextFieldModule` | `text-field/text-field.module.ts` | `TextInputDirective`. **Legacy shell.** |
| `DropdownModule` | `dropdown/dropdown.module.ts` | 3 dropdown directives. **NOT imported by root — dead in default build.** |

---

## Cross-framework checklist (what React/Vue/Svelte wrappers need)

1. **Form bindings — the 8 contracts (mandatory):** for each `u-*` form element, map controlled value ↔ property write + DOM event:
   - `u-text-field`/`u-text-area`/`u-search`: `.value` ↔ `input`/`change`
   - `u-checkbox`/`u-switch`/`u-checkbox-list-item`/`u-switch-list-item`: `.checked` ↔ `change`
   - `u-radio`/`u-radio-list-item`: `.checked` (group) ↔ `change`
   - `u-select`/`u-option`: `.value` ↔ `change`
   - `u-chip-field`: `.value` (array) ↔ `change`
   - `u-typeahead`: `.value` ↔ `change`
   - `u-slider`: scalar `.value` OR `valueStart`/`valueEnd` when `.range` ↔ `input`+`change` (+`blur`=touched)
   - `u-datepicker`/`u-range-datepicker`: `.value` ↔ `input`+`change` (+`blur`=touched)
   - All: `disabled` property for the framework's disabled state.
   - Exclusion to honor: `u-button-field` is display-only (value setter, no events) — do NOT wire as a form control. (Separately, `u-button` itself is the form *submitter*, not a CVA input: interactive buttons extend `ButtonWrapper`, and the FACE submitter plumbing — `static formAssociated = true` — lives on `ButtonBase` (`src/button/button-base.ts`), which itself extends `ButtonWrapper`. A wrapper exposes `type`/`value` but does not bridge it through `ControlValueAccessor`.)
2. **Tab bar two-way binding:** `<u-tab-bar>.activeTabIndex` ↔ state via `change` (+ reconcile on tab add/remove). 
3. **Imperative services:** thin wrappers over web APIs already present — `Snackbar.show(...)` and `ConfirmDialogBuilder.create(...).show()`. A new wrapper can expose these directly; the Angular `SnackbarRef`/`ConfirmDialogRef` shapes (Observable → Promise/callback) are the only adaptation.
4. **Skip:** Angular-rendered legacy dialog stack (`u-legacy-dialog`, `DialogService`, `DialogStackService`, `ProgressDialog`), Angular `u-form-field` shell (`FormFieldComponent`/`LabelDirective`/`TextInputDirective`/`TextInputBase`/`InputBaseComponent`), `DropdownDirective` family (unregistered), most of `util/`. Optional: `RippleDirective`, `FloatingActionBehaviorDirective` (re-implement only if the consumer wants those non-component behaviors).
