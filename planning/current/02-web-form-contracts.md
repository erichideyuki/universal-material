# Web component form/value contracts

Map of the form/value contract of every form-ish `u-*` web component in
`D:/Projects/universal-material-web/src`. For each element: the value
property name(s), the DOM events dispatched on user interaction, whether the
element is a **form-associated custom element** (FACE) via
`static formAssociated = true` + `attachInternals()`, and how `disabled` is
handled.

This is the crux for the framework wrappers: a FACE participates in native
`<form>` submission and validation on its own, so a framework binding only
needs to forward the value property and listen for the value-change event — it
does **not** need to reach into a hidden native control. The one non-FACE
input-like element (`u-field`) is a presentational wrapper around a slotted
native control and needs no bridge of its own.

## Summary table

| Element | Value prop(s) | User-interaction events (dispatched) | formAssociated? | disabled |
| --- | --- | --- | --- | --- |
| `u-text-field` | `value: string` | native `input` (composed, from inner `<input>`) — **no own dispatch** | ✅ yes (inherits `TextFieldBase`) | `@property disabled` (reflected, from `FieldBase`); forwarded to `<input ?disabled>` |
| `u-text-area` | `value: string` | native `input` (composed, from inner `<textarea>`) — **no own dispatch** | ✅ yes (`NativeTextFieldWrapper`) | reflected `disabled`; forwarded to `<textarea ?disabled>` |
| `u-search` | `value: string` | native `input` (composed, from inner `<input>`) — **no own dispatch** | ✅ yes (`NativeTextFieldWrapper`) | reflected `disabled` (from `FieldBase`) |
| `u-field` | none (slots a native control) | none of its own; tracks `empty` off the slotted control's `input` | ❌ **no** | reflected `disabled` (visual only; the slotted control owns form state) |
| `u-button-field` | `value: string` | **none** (selection driven externally / via menu) | ✅ yes (`TextFieldBase`) | reflected `disabled`; forwarded to `<button ?disabled>` |
| `u-select` | `value: string`, `selectedIndex: number` | `input` (composed) **and** `change` (bubbles, **not** composed) on user pick | ✅ yes (`TextFieldBase`) | reflected `disabled`; forwarded to combobox `<button ?disabled>` |
| `u-option` | `value: string`, `selected: boolean` (child of `u-select`) | none (calls back into parent `u-select._setSelectedByUser`) | ❌ no (menu item) | `disabled` skips selection |
| `u-checkbox` | `checked: boolean` (+ `value: string` submitted when checked), `indeterminate: boolean` | `input` (composed, native — not re-dispatched), `change` (re-dispatched, bubbles) | ✅ yes (`SelectionControl`) | reflected `disabled`; forwarded to `<input .disabled>` |
| `u-radio` | `checked: boolean` (+ `value: string`), grouped by `name` | `input` (composed, native), `change` (re-dispatched on click; **own** `change` bubbles on keyboard nav) | ✅ yes (`SelectionControl`) | reflected `disabled`; skipped in keyboard nav |
| `u-switch` | `checked: boolean` (+ `value: string`) | `input` (composed, native), `change` (re-dispatched, bubbles) | ✅ yes (`SelectionControl`) | reflected `disabled`; forwarded to `<input .disabled>` |
| `u-checkbox-list-item` | same as `u-checkbox` | same as `u-checkbox` | ✅ yes (mixin over `SelectionControl`) | same |
| `u-radio-list-item` | same as `u-radio` | same as `u-radio` | ✅ yes (mixin over `SelectionControl`) | same |
| `u-switch-list-item` | same as `u-switch` | same as `u-switch` | ✅ yes (mixin over `SelectionControl`) | same |
| `u-slider` | `value: number` (single) **or** `valueStart` + `valueEnd: number` (range) | `input` (bubbles, composed) continuously; `change` (bubbles, composed) on commit | ✅ yes (own `formAssociated`) | reflected `disabled`; forwarded to `<input ?disabled>` |
| `u-chip-field` | `value: any[]` (one entry per chip) | `change` (bubbles, **not** composed) on add/remove; native `input` (composed) while typing; `remove` CustomEvent (cancelable) | ✅ yes (`TextFieldBase`) | reflected `disabled`; forwarded to `<input ?disabled>` and chips |
| `u-datepicker` | `value: string` (ISO `YYYY-MM-DD`) | `input` (composed) on typing/calendar; `change` (bubbles, not composed) on calendar pick | ✅ yes (`NativeTextFieldWrapper`) | reflected `disabled`; forwarded to `<input ?disabled>` + trigger button |
| `u-range-datepicker` | `value: string` (`YYYY-MM-DD - YYYY-MM-DD`) | `input` (composed) on typing/calendar; `change` (bubbles, not composed) on commit | ✅ yes (`NativeTextFieldWrapper`) | reflected `disabled`; forwarded to `<input ?disabled>` + trigger button |
| `u-typeahead` | `value: any` | `input` (composed) **and** `change` (bubbles, not composed) on type/select; `selected` CustomEvent (cancelable) | ✅ yes (own `formAssociated`) | n/a — no `disabled` prop; drives an external target input by `target-id` |

Legend: "composed" = the event crosses the shadow boundary and is observable
on the host / outside. "bubbles, not composed" = the event was **re-dispatched
from the host itself** (a native `change` does not cross shadow DOM, so the
component re-emits it). See per-element citations below.

## Form-association infrastructure

Three base classes provide the FACE plumbing; everything else inherits:

- **`TextFieldBase`** — `src/shared/text-field-base/text-field-base.ts:18`
  declares `static readonly formAssociated = true`; constructor calls
  `this.elementInternals = this.attachInternals()` (line 61). It exposes
  `form`, `validity`, `validationMessage`, `checkValidity()`,
  `reportValidity()`, `required`, and pushes validity via
  `elementInternals.setValidity(...)` in `_syncValidity()` (lines 79-90),
  re-run on every `updated()` (line 112). `delegatesFocus: true`
  (line 22-25). Subclasses: `u-text-field` (via `NativeTextFieldWrapper`),
  `u-text-area`, `u-search`, `u-select`, `u-chip-field`, `u-button-field`,
  `u-datepicker`, `u-range-datepicker`.
- **`NativeTextFieldWrapper`** — `src/shared/char-count-text-field/native-text-field-wrapper.ts`
  extends `TextFieldBase` and adds the `value: string` accessor whose setter
  calls `this.elementInternals.setFormValue(value)` (line 19). Its
  `_handleInput()` (lines 61-64) copies `this.input.value` into `value`
  (which sets the form value) but **does not** dispatch any event — it relies
  on the native `<input>`/`<textarea>` `input` event being composed and
  bubbling out of the shadow root. Used by `u-text-field`, `u-text-area`,
  `u-search`, `u-datepicker`, `u-range-datepicker`.
- **`SelectionControl`** — `src/shared/selection-control/selection-control.ts:62`
  declares `static readonly formAssociated = true`; constructor
  `attachInternals()` (line 126). `checked` setter calls
  `setFormValue(checked ? this.value : null)` (line 119). `delegatesFocus: true`.
  Base for `u-checkbox`, `u-radio`, `u-switch` and their `*-list-item` mixin
  variants (`src/shared/selection-control/selection-control-list-item.ts`).

`u-slider` (`src/slider/slider.ts:44`) and `u-typeahead`
(`src/typeahead/typeahead.ts:22`) declare `formAssociated` and call
`attachInternals()` directly rather than via a shared base.

There is **no `formDisabledCallback`** anywhere in `src/` — disabled state is
driven solely by the reflected `disabled` property, not by an ancestor
`<fieldset disabled>`. Likewise, `formResetCallback` /
`formStateRestoreCallback` exist **only on `u-select`** (`src/select/select.ts:141`
and `:151`); the other FACEs do not reset to a default on `form.reset()`.

## Event dispatch citations (the load-bearing lines)

Text family (no own dispatch; native composed `input` bubbles out):
- `src/shared/char-count-text-field/native-text-field-wrapper.ts:61-64`
  `_handleInput() { this.value = this.input.value; ... }` — no `dispatchEvent`.
- `u-text-field` wires `@input=${this._handleInput}` on the inner `<input>`
  (`src/text-field/text-field.ts:80`); `u-text-area` the same on `<textarea>`
  (`src/text-area/text-area.ts:39`); `u-search` on its `<input>`
  (`src/search/search.ts:54`).

Select — `src/select/select.ts:184-185`:
```ts
this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
this.dispatchEvent(new Event('change', { bubbles: true }));
```
(only when `previousIndex !== newIndex`, inside `_setSelectedByUser`).

Selection controls — `src/shared/selection-control/selection-control.ts`:
- `#handleInput` (lines 178-182): updates `checked`, comment notes the native
  `input` event "bubbles and is composed, don't re-dispatch it."
- `#handleChange` (lines 184-187): `redispatchEvent(this, event)` — the native
  `change` is **not** composed, so it is re-dispatched from the host.
- Radio keyboard nav also fires its own `change`:
  `src/radio/radio.ts:129` `nextSibling.dispatchEvent(new Event('change', { bubbles: true }))`.

Slider — `src/slider/slider.ts`:
- `input`: lines 438, 455, 460, 465 — `new Event('input', { bubbles: true, composed: true })`
  (pointer drag, single keyboard input, start input, end input).
- `change`: line 469 — `new Event('change', { bubbles: true, composed: true })`
  (fired from `#handleChange`, i.e. drag end).

Chip field — `src/chip-field/chip-field.ts`:
- line 150: `this.dispatchEvent(new Event('change', { bubbles: true }))` (on add/remove).
- lines 167-172: `new CustomEvent('remove', { cancelable: true, detail: item })`.
- typing fires the native `<input>` `input` (composed) via `@input=${this.#handleInput}`
  (line 80); `#handleInput` only recomputes `empty`, no own dispatch.

Datepicker — `src/datepicker/datepicker.ts`:
- line 159: `input` (composed) on typed input (`_handleInput` override).
- lines 182-183: `input` (composed) **and** `change` (bubbles, not composed)
  on calendar pick (`#handleCalendarInput`).

Range datepicker — `src/datepicker/range-datepicker.ts`:
- line 158: `input` (composed) on typed input.
- line 181: `input` (composed) on calendar input.
- line 191: `change` (bubbles, not composed) on commit, only when the value
  matches the full `YYYY-MM-DD - YYYY-MM-DD` regex.

Typeahead — `src/typeahead/typeahead.ts`:
- lines 311-312 (`#setValueAndDispatchEvents`):
  `new InputEvent('input', { bubbles: true, composed: true })` then
  `new Event('change', { bubbles: true })` — fired on both typing (editable)
  and menu selection.
- lines 288-293: `new CustomEvent('selected', { cancelable: true, detail })`
  before committing a menu choice.

## Value property citations

- `u-text-field` / `u-text-area` / `u-search` / `u-datepicker` /
  `u-range-datepicker`: `value: string` accessor in
  `src/shared/char-count-text-field/native-text-field-wrapper.ts:11-21`
  (getter/setter; setter calls `setFormValue`).
- `u-button-field`: own `value: string` accessor `src/button-field/button-field.ts:17-26`.
- `u-select`: `value: string` (`src/select/select.ts:61-69`, `@state` getter
  derives from selected option) and `selectedIndex: number`
  (`src/select/select.ts:74-84`); `value || null` pushed to form at
  `src/select/select.ts:272`.
- `u-option`: `value: string` (`src/select/option.ts:22-34`),
  `selected: boolean` (`:39-51`), `defaultSelected` reads the `selected`
  attribute (`:53-59`).
- `u-checkbox` / `u-radio` / `u-switch`: `checked: boolean` accessor
  `src/shared/selection-control/selection-control.ts:107-120` (reads/writes the
  inner `<input>.checked`); `value: string` (default `'on'`)
  `src/shared/selection-control/selection-control.ts:102`, submitted only when
  checked. `u-checkbox` adds `indeterminate: boolean`
  (`src/checkbox/checkbox.ts:28-43`) which sets the form value to `null`.
- `u-slider`: `value: number` (`src/slider/slider.ts:63`), or
  `valueStart` / `valueEnd: number` (`:66`, `:69`) in range mode.
- `u-chip-field`: `value: any[]` accessor `src/chip-field/chip-field.ts:45-52`;
  each item appended to FormData under `name` (`:54-62`).
- `u-typeahead`: `value: any` accessor `src/typeahead/typeahead.ts:123-134`
  (setter calls `setFormValue` and mirrors text onto the external target).

## Implications for framework bridges

1. **Almost everything is a native form-associated custom element.** Every
   user-facing input (`text-field`, `text-area`, `search`, `select`,
   `checkbox`, `radio`, `switch`, their list-item variants, `slider`,
   `chip-field`, `datepicker`, `range-datepicker`, `typeahead`,
   `button-field`) is a FACE. They submit through a native `<form>` and run
   constraint validation via `ElementInternals` with no extra glue. A
   framework binding (Angular `ControlValueAccessor`, React controlled-input
   wrapper, Vue `v-model`) only needs to (a) write the value property and
   (b) read it back on the value-change event.

2. **The `name` is a content attribute, not a JS property, for the text
   family.** `name` is declared as a property **only** on `u-chip-field`
   (`src/chip-field/chip-field.ts:19`), `u-slider`
   (`src/slider/slider.ts:87`), and the selection controls
   (`src/shared/selection-control/selection-control.ts:74`). The other FACEs
   (`text-field`, `text-area`, `search`, `select`, `datepicker`,
   `range-datepicker`, `button-field`) rely on the global `name` **attribute**
   that the form machinery reads off any form-associated element. Bridges that
   forward `name` should set the attribute, not assume a property.

3. **Listen to BOTH `input` and `change`, and know which is which.**
   - Continuous / per-keystroke updates arrive as `input` (always composed,
     so observable on the host). For the plain text family this is the native
     control's own `input` event — the host does **not** re-emit it, but
     because it is composed it surfaces on the host anyway.
   - Committed updates arrive as `change`. For selection controls / select /
     datepickers / chip-field / typeahead this `change` is **re-dispatched
     from the host and is NOT composed** — listeners must be attached on the
     element itself (or an ancestor in the same tree), not rely on crossing
     another shadow boundary. The slider is the exception: its `change` is
     `composed: true`.
   - A two-way binding should generally write on `input` (live) and may also
     observe `change`. An Angular `ControlValueAccessor` typically maps
     `input` → `onChange` and `change` → `onTouched`-ish commit; both are
     available on every value-bearing element except `u-button-field` (which
     emits neither — its value is set programmatically).

4. **Non-string value shapes need (de)serialization in the bridge.**
   - `u-slider` value is a **number** (`valueAsNumber`-style), and in range
     mode it is a **pair** (`valueStart`/`valueEnd`) submitted as
     `name-start` / `name-end` FormData entries
     (`src/slider/slider.ts:477-481`). A single scalar `v-model` cannot
     represent range mode — bind the two properties separately.
   - `u-chip-field` value is an **array** (`any[]`), submitted as repeated
     FormData entries under one `name`. The array is mutated in place by
     `add()` / `removeAt()`; the doc warns that pushing to `value` directly
     won't re-render — bridges must call those methods or reassign `value`.
   - `u-typeahead` value is **`any`** (often an object). Form submission
     stringifies whatever is passed to `setFormValue`.
   - `u-checkbox` exposes `indeterminate`; an indeterminate checkbox submits
     `null` (no value). Tri-state bindings must map this explicitly.

5. **`u-field` is the only non-FACE and needs no bridge.** It is a
   presentational shell (`src/field/field.ts`) that slots a native
   `<input>/<select>/<textarea>/<button>` and only tracks the `empty` state
   off that control's `input` event (lines 19-37). The slotted **native**
   control is the form participant; a framework binds to that native element
   directly, not to `u-field`.

6. **`u-option` is not itself a control.** It carries `value` and `selected`
   but delegates user selection back to its parent `u-select`
   (`src/select/option.ts:109-124`). Bind to `u-select`, not to options.

7. **`u-typeahead` has no `disabled` and no inner control of its own.** It
   binds to an external target input via `target-id`
   (`src/typeahead/typeahead.ts:152-163`) and mirrors values onto it. A bridge
   should treat the typeahead as a controller attached to a separate input,
   and disable that target input separately if needed.

8. **Validation surface.** All `TextFieldBase` descendants expose
   `checkValidity()` / `reportValidity()` / `validity` / `validationMessage`
   and honor `required` (`u-select` and `u-text-field` provide richer
   `_getValidity()` overrides — `u-text-field` delegates to the native input's
   `ValidityState`, `src/text-field/text-field.ts:89-114`; `u-select` checks
   `value === ''`, `src/select/select.ts:191-199`). `u-slider`,
   `u-typeahead`, and the `SelectionControl` family do **not** override
   validity beyond what `ElementInternals` gives by default (the selection
   controls don't call `setValidity`, so they're always valid). A bridge that
   maps framework validators onto the element should prefer the
   `TextFieldBase` API where present.
