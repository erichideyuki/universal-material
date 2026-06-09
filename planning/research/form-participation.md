# Form Participation Model — Cross-Cutting Research

**Question this answers:** How much wrapper glue does each target framework (native HTML
forms, React 19, Vue 3, Svelte, Angular) need to integrate `@universal-material/web`
inputs? The answer hinges entirely on **whether the components are Form-Associated Custom
Elements (FACE)**. They are. This document records the verdict per component (verified
against `src/`) and derives the per-framework glue matrix.

---

## 0. TL;DR verdict

**Every input-like component in this library is a Form-Associated Custom Element.** They
all declare `static formAssociated = true`, call `this.attachInternals()` in their
constructor, and push their value into the form via
`ElementInternals.setFormValue(...)`. They also expose `form`, and the text-field family
exposes `validity` / `validationMessage` / `checkValidity()` / `reportValidity()` backed
by `ElementInternals.setValidity(...)`.

Consequence:

- **Native HTML `<form>`, React 19, Vue 3, Svelte** get **value submission + constraint
  validation for free** through the platform. Their only remaining job is *reading the
  value back* for controlled/`v-model`/`bind:` patterns, which is done with the
  component's own `value`/`checked` IDL property + its bubbling `input`/`change` events —
  no `ElementInternals` plumbing required on the framework side.
- **Angular** still needs a thin **`ControlValueAccessor`** per control, because Angular's
  `FormControl`/`ngModel` does **not** use native form submission or `ElementInternals` —
  it tracks values through its own directive layer. FACE buys Angular nothing for
  *reactive/template-driven forms*; it only helps a raw `<form (ngSubmit)>` that reads
  `FormData`. (Plain attribute/property binding + `(input)`/`(change)` still works without
  a CVA; the CVA is what unlocks `formControlName` / `[(ngModel)]`.)

---

## 1. What "form-associated" buys you (platform mechanics)

A custom element becomes form-associated by setting `static formAssociated = true` and
calling `this.attachInternals()`. The returned `ElementInternals` object then lets the
element behave like a built-in form control:

| Capability | API used | What the platform does for you |
| --- | --- | --- |
| Submit a value | `internals.setFormValue(value)` | The element's `name`/value pair is included in `FormData` and the URL-encoded body on native submit. `value` may be a string, `File`, `FormData` (multi-entry), or `null` (excluded). |
| Participate in a `<form>` | `internals.form` | Element is associated with its ancestor `<form>` (or `form=` id) automatically; no manual wiring. |
| Constraint validation | `internals.setValidity(flags, message, anchor)` | Element joins the form's validity; an invalid required control blocks native submit and shows the browser bubble via `reportValidity()`. |
| `:disabled` / form reset / `formdata` event | `formDisabledCallback`, `formResetCallback`, `formStateRestoreCallback` (lifecycle) | Reset and autofill restoration hooks (this library wires reset via button `form.reset()` and `setFormValue`). |

Because this is a **platform** feature, anything that submits a real `<form>` —
including React 19, Vue, and Svelte, which all render real DOM `<form>` elements — picks
up the value and validation with **zero** framework-specific adapter code. The framework
never has to know the element is a custom element.

Sources: [WHATWG custom elements spec — form-associated](https://html.spec.whatwg.org/multipage/custom-elements.html),
[MDN: ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals),
[WebKit: ElementInternals and FACE](https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/),
[Frontend Masters: FACE in practice](https://frontendmasters.com/blog/form-associated-custom-elements-in-practice/).

---

## 2. Per-component verdict (verified in `src/`)

All claims below were confirmed by reading the source, not inferred from naming. Search:
`formAssociated`, `attachInternals`, `ElementInternals`, `setFormValue`, `setValidity`.

### 2.1 Shared base classes (where the FACE behavior actually lives)

| Base class | File | FACE? | Evidence |
| --- | --- | --- | --- |
| `TextFieldBase` | `src/shared/text-field-base/text-field-base.ts` | **Yes** | `static formAssociated = true` (L18); `attachInternals()` (L61); exposes `form`/`validity`/`validationMessage` (L43-55); `checkValidity()`/`reportValidity()` delegate to `elementInternals` (L93-107); `setValidity(...)` in `_syncValidity()` (L84-89), re-synced on every `updated()` (L109-113). |
| `NativeTextFieldWrapper` | `src/shared/char-count-text-field/native-text-field-wrapper.ts` | **Yes** (extends `TextFieldBase`) | `value` setter calls `setFormValue(value)` (L19); Enter triggers `elementInternals.form?.requestSubmit()` (L57). |
| `SelectionControl` | `src/shared/selection-control/selection-control.ts` | **Yes** | `static formAssociated = true` (L62); `attachInternals()` (L126); `checked` setter calls `setFormValue(checked ? value : null)` (L119); seeds form value from markup `checked` in `firstUpdated` (L138). |
| `ButtonBase` | `src/button/button-base.ts` | **Yes** | `static formAssociated = true` (L10); `attachInternals()` (L33); on click sets `setFormValue(this.value)` and drives `form.requestSubmit()` / `form.reset()` with a synthetic `submitter` (L46-64). This is the **submitter** role, not a value field. |

### 2.2 Concrete components

| Component | Tag | Extends | FACE? | Value surface | Emits `input`/`change`? |
| --- | --- | --- | --- | --- | --- |
| Text field | `u-text-field` | `NativeTextFieldWrapper` | **Yes** | `value: string` IDL prop → `setFormValue` | Yes (native input bubbles/composed) |
| Text area | `u-text-area` | `NativeTextFieldWrapper` | **Yes** | `value: string` | Yes |
| Search | `u-search` | `NativeTextFieldWrapper` | **Yes** | `value: string` | Yes |
| Datepicker | `u-datepicker` | `NativeTextFieldWrapper` | **Yes** | `value: string` (ISO) | Yes — host re-dispatches `input` (composed) + `change` (`datepicker.ts` L159/182/183) |
| Range datepicker | `u-range-datepicker` | (FACE per test) | **Yes** | range value | Yes (`range-datepicker.ts` L158/181/191) |
| Select | `u-select` | `TextFieldBase` (impl `MenuField`) | **Yes** | `value: string` IDL prop (no attribute); `setFormValue(value \|\| null)` (`select.ts` L272) | Yes — host dispatches `input` (composed) + `change` on user pick (L184-185) |
| Button field | `u-button-field` | `TextFieldBase` | **Yes** | `value: string` setter → `setFormValue` (`button-field.ts` L25) | (manual; menu-driven) |
| Chip field | `u-chip-field` | `TextFieldBase` | **Yes** | `value: any[]`; builds multi-entry `FormData` and `setFormValue(formData)` (`chip-field.ts` L54-61) | `change` bubbling (L150); `remove` CustomEvent (L167) |
| Checkbox | `u-checkbox` | `SelectionControl` | **Yes** | `checked: boolean`, `value`; `setFormValue(null)` when indeterminate (`checkbox.ts` L42) | `change` re-dispatched (non-composed, native parity) |
| Radio | `u-radio` | `SelectionControl` | **Yes** | `checked`, `value`; unchecks siblings, dispatches `change` on sibling (`radio.ts` L129) | `change` |
| Switch | `u-switch` | `SelectionControl` | **Yes** | `checked`, `value` | `change` |
| Checkbox/Radio/Switch list-item | `u-*-list-item` | mixin over the control | **Yes** (inherits) | same as base | same |
| Slider | `u-slider` | `LitElement` (FACE direct) | **Yes** | `value` / `valueStart` / `valueEnd: number`; range mode builds `FormData`, else `setFormValue(String(value))` (`slider.ts` L474-484) | `input` while dragging, `change` on commit (composed) (L438-469) |
| Typeahead | `u-typeahead` | `LitElement` (FACE direct) | **Yes** | `value` (any); `setFormValue(value)` (`typeahead.ts` L129/308) | `input` (composed) + `change` + `selected` CustomEvent (L288-312) |
| Button / FAB / FAB-menu-item | `u-button`, `u-fab`, `u-fab-menu-item` | `ButtonBase` | **Yes** (submitter) | `value`, `type` (`submit`/`reset`/`button`); acts as form **submitter** | n/a (button semantics) |

**Not form controls** (no FACE, by design — they carry no submittable value): `u-chip`
(emits `change`/`remove` events but is a UI affordance, not a named field), `u-tab-bar`,
`u-toggle-button`, `u-expansion-panel`, `u-calendar`/`u-range-calendar` (emit
`input`/`change` but are embedded inside the datepicker which owns the FACE value),
`u-dialog`, `u-menu`, layout/navigation components. Wrapper specs should treat these as
plain event-emitting components, **not** as bindable form fields.

### 2.3 Event composability — important for framework value read-back

Two patterns exist, and they matter for how a framework listens:

1. **Events dispatched on the host element itself** (`this.dispatchEvent(...)`): select,
   slider, typeahead, datepicker, chip-field. Because the event originates *at the custom
   element* (not inside its shadow root), `composed` is irrelevant for a listener attached
   *on the element* — every framework's `@input`/`onChange`/`on:change` on the element
   fires normally. `input` is dispatched `composed: true`; `change` is intentionally
   `bubbles: true` but **not** composed (native `change` parity).
2. **Native input events re-dispatched** (`redispatchEvent`, `src/shared/events/redispatch-event.ts`):
   selection controls and the native text fields. The inner `<input>`'s `input` already
   bubbles+composes (left as-is); its `change` is non-composed so the host re-dispatches a
   copy on itself. Net effect for consumers is identical: listen for `input`/`change` on
   the `u-*` element.

**Takeaway for wrapper specs:** for value read-back, every framework listens to
`input` (live) and/or `change` (committed) **on the `u-*` element** and reads the
component's own `value`/`checked` IDL property. Do not rely on `composed` crossing into a
framework-owned ancestor for `change`; bind directly on the element (which all four
frameworks do anyway).

---

## 3. Why FACE changes the glue budget per framework

### Native HTML `<form>` — **zero glue**
The element is a real form control. `<form>` submission includes its `name`/value in
`FormData`; `required` blocks submit and `form.reportValidity()` shows the bubble. Nothing
to write.

### React 19 — **near-zero glue**
React 19 added first-class custom-element support:
- Props that **match an instance property** are assigned as **properties** (so `value=`,
  `checked=` reach the IDL setters that call `setFormValue`); others fall back to
  attributes. ([React 19 custom elements](https://react.dev/reference/react-dom/components),
  [RFC #11347](https://github.com/facebook/react/issues/11347))
- `on<CustomEventName>` handlers attach native listeners, so `onInput`/`onChange` work.
- Because React renders a real `<form>`, FACE submission + validation are automatic.

Remaining glue is **ergonomic, not functional**: a tiny typed wrapper (via
`@lit/react` `createComponent` or a hand-written `forwardRef`) for JSX typing,
controlled-value sugar (`value`/`onChange`), and SSR attribute hints. No
`ElementInternals` bridging.

### Vue 3 — **near-zero glue**
Vue must be told which tags are custom elements (`compilerOptions.isCustomElement` /
`app.config.compilerOptions.isCustomElement`, or the Vite `vue` plugin's
`customElement` option). After that, `v-model` works because Vue binds the `value`/`checked`
property and listens to `input`/`change`. FACE provides submission + validation for free
inside a native `<form>`. Glue = build config + optional `v-model` modifier mapping for
`checked` controls.

### Svelte — **near-zero glue**
Svelte sets DOM properties for custom elements and `on:input`/`on:change` listen natively;
`bind:value` works via the property + event convention. FACE handles submission/validation
in a real `<form>`. Glue = optional typed `$$props` definitions and a `bind:` helper for
`checked`.

### Angular — **CVA glue required**
Angular Forms (both Reactive `formControlName`/`formControl` and Template-driven
`[(ngModel)]`) do **not** use native form submission or `ElementInternals`. They track each
control through a directive implementing **`ControlValueAccessor`** (`writeValue`,
`registerOnChange`, `registerOnTouched`, `setDisabledState`) registered via
`NG_VALUE_ACCESSOR`. ([Angular University](https://blog.angular-university.io/angular-custom-form-controls/),
[Lucas Paganini](https://www.lucaspaganini.com/academy/angular-control-value-accessor-custom-form-components/))

So FACE buys Angular **nothing for its forms API**. You still need one CVA directive per
control family that:
- `writeValue(v)` → sets the element's `value`/`checked` property,
- listens to the element's `input`/`change` → calls the registered `onChange`,
- `setDisabledState` → toggles `disabled`,
- (optional) bridges `validity` from the text-field family into an Angular validator.

The **one** thing FACE gives Angular: a plain `<form (ngSubmit)>` that reads `FormData`
directly will include the controls without Angular bindings — but that is not how Angular
apps are written, so the CVA is effectively mandatory. (`CUSTOM_ELEMENTS_SCHEMA` is also
required so the templates compile.)

---

## 4. Glue-needed matrix (given the verdict: ALL inputs are FACE)

Legend: ⚪ none · 🟢 trivial (config/typing) · 🟡 small adapter · 🔴 per-control adapter required

| Concern | Native `<form>` | React 19 | Vue 3 | Svelte | Angular |
| --- | --- | --- | --- | --- | --- |
| Value **submission** (`name`→FormData) | ⚪ free (FACE) | ⚪ free (FACE, real form) | ⚪ free (FACE) | ⚪ free (FACE) | 🟡 free for raw `(ngSubmit)`+FormData; 🔴 CVA for Forms API |
| Constraint **validation** (`required`, bubble) | ⚪ free (FACE) | ⚪ free (FACE) | ⚪ free (FACE) | ⚪ free (FACE) | 🔴 bridge `validity`→Angular validator in CVA |
| Set **value into** control (controlled / `v-model` / `bind:` / `writeValue`) | ⚪ n/a | 🟢 prop assign (React 19 property match) | 🟢 prop via `v-model` (+isCustomElement) | 🟢 prop via `bind:` | 🔴 `writeValue` in CVA |
| Read **value out** (`onChange`/`@input`) | ⚪ n/a | 🟢 `onInput`/`onChange` | 🟢 `@input`/`@change` | 🟢 `on:input`/`on:change` | 🔴 `registerOnChange` in CVA |
| **Disabled** propagation | ⚪ `formDisabledCallback`/attr | 🟢 prop/attr | 🟢 prop/attr | 🟢 prop/attr | 🔴 `setDisabledState` in CVA |
| Build/compile recognition of custom tags | ⚪ | 🟢 (works; typing wrapper nice-to-have) | 🟢 `isCustomElement` config | 🟢 (native) | 🟢 `CUSTOM_ELEMENTS_SCHEMA` |
| Typed component API in templates/JSX | ⚪ | 🟢 `@lit/react` or forwardRef | 🟢 d.ts for `GlobalComponents` | 🟢 `svelte.JSX` defs | 🟢 directive typings |
| **Net wrapper effort** | **none** | **thin/optional** | **thin/optional** | **thin/optional** | **per-control CVA package** |

### How to read it for the wrapper specs
- **React / Vue / Svelte specs:** the wrapper is *optional sugar* — typed props, an
  `onChange`/`v-model`/`bind:value` convenience, and (React/Vue) build/SSR config. The
  platform already does submission + validation. Recommend `@lit/react` for React; thin
  `defineCustomElement`-style typing + `isCustomElement` for Vue; plain typed props for
  Svelte.
- **Angular spec:** the wrapper is *load-bearing*. Plan one `ControlValueAccessor`
  directive per control family (text-field family, selection-control family, slider,
  select/button-field, chip-field/typeahead for array/object values) plus
  `CUSTOM_ELEMENTS_SCHEMA`. This is the only framework where FACE does not remove the work.

---

## 5. Caveats / sharp edges for the wrapper authors

1. **`change` is not `composed`** (native parity) for selection controls and native text
   fields; the host re-dispatches it so listeners on the `u-*` element still fire. Bind on
   the element, never on a wrapper ancestor expecting `change` to cross the shadow
   boundary.
2. **`u-select` has no `value` *attribute*** — only the `value` IDL property. Initial
   selection is `<u-option selected>`. React/Vue/Svelte must set `.value` as a property
   (they do by default for custom elements); SSR can't express the initial value via an
   attribute.
3. **Multi-entry values** (`u-chip-field`, range `u-slider`) call `setFormValue(FormData)`
   — they submit *multiple* entries under one `name`. An Angular CVA must model the value
   as an array, not a string.
4. **`u-button`/`u-fab` are the form *submitter*, not value fields.** Their FACE role is to
   call `form.requestSubmit()` and patch `submitter`. Don't model them as bindable inputs.
5. **Angular requires `CUSTOM_ELEMENTS_SCHEMA`** in any module/standalone component using
   `u-*` tags, in addition to the CVA, or templates won't compile.
6. **Indeterminate checkbox** calls `setFormValue(null)` (excluded from submission). A CVA
   must treat indeterminate as "no value", not `false`.
7. **Validation surface lives only on the text-field family** (`validity`,
   `validationMessage`, `checkValidity`, `reportValidity`). Selection controls and slider
   are FACE for *value* but do not expose the rich validity API — an Angular validator
   bridge only applies to the text-field family + select.
