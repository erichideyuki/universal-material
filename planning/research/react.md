# Consuming @universal-material/web (Lit M3 inputs) from React

Research on the "value-accessor equivalent" for React: binding `value`, reacting to
`input`/`change`, controlled inputs, and form-library integration (react-hook-form,
Formik). Focused on the library's **form inputs** (`u-text-field`, `u-select`,
`u-typeahead`, `u-checkbox`/selection controls, `u-slider`, `u-chip-field`,
`u-button-field`).

Date: 2026-06-08. Verified against this repo's source.

---

## TL;DR

These components are **form-associated custom elements** (FACE): every input sets
`static formAssociated = true`, calls `attachInternals()`, and pushes its value with
`ElementInternals.setFormValue(...)`. They expose a `value` property and emit
**standard, bubbling `input` and `change` events** (not bespoke `CustomEvent`s for the
value). That combination collapses most of the usual web-component-in-React glue:

- Native `<form>` submission and `FormData` already capture the value — no React glue
  needed for plain HTML forms or for libraries that read `FormData`/the DOM.
- `validity` / `validationMessage` / `checkValidity()` / `form` behave like a native
  control.
- The remaining glue is only about **two-way binding into React state**: pushing
  `value` *down* as a DOM property (not an attribute) and reading `e.target.value` *up*
  on `input`/`change`.

Two viable strategies:

1. **`@lit/react` `createComponent` wrappers** — works on React 17/18/19, gives typed
   props + a typed `onInput`/`onChange`. **Recommended** for a published, framework-
   agnostic adapter.
2. **React 19 bare custom elements** — render `<u-text-field>` directly; React 19 sets
   properties and supports `on*` event props. Fewer deps but has naming caveats and no
   types. Good for app code already on React 19.

---

## Key facts (verified)

### This library's inputs
Grounded in the repo, not assumed:

- `src/shared/text-field-base/text-field-base.ts` → `static formAssociated = true`,
  `attachInternals()`, `value`/`validity`/`form` accessors, `checkValidity()`.
- `src/shared/char-count-text-field/native-text-field-wrapper.ts` → `value` getter/
  setter; the setter calls `elementInternals.setFormValue(value)`. `_handleInput()` sets
  `this.value = this.input.value`. The inner `<input>` fires native `input`; the host's
  `value` setter keeps form state in sync.
- `src/select/select.ts` → on selection it dispatches **both**
  `new InputEvent('input', { bubbles: true, composed: true })` **and**
  `new Event('change', { bubbles: true })`; has a `value` get/set.
- `src/typeahead/typeahead.ts` → `formAssociated`, `setFormValue`, dispatches `input`
  and `change` (plus a `selected` `CustomEvent` carrying `detail`).
- `src/shared/selection-control/selection-control.ts` (checkbox/radio/switch) →
  `formAssociated`, `@property() value = 'on'`, `setFormValue(checked ? value : null)`,
  redispatches `change`.
- `src/slider/slider.ts` → `formAssociated`, dispatches `input` (composed).
- `src/chip-field/chip-field.ts` → `formAssociated`, `setFormValue(FormData)`,
  dispatches `change`; emits a `remove` `CustomEvent`.

Practical consequence: for value binding you listen for **`input`** (per keystroke /
live) and/or **`change`** (on commit) and read **`event.target.value`**. The value goes
*in* via the `value` **property**. All standard names, all bubbling — so React's
synthetic `onChange`/`onInput` on a wrapper or React 19's `on*` work without bespoke
event maps for the value itself. (Bespoke `CustomEvent`s like `selected`/`remove` still
need explicit mapping.)

### React version landscape
- **React ≤ 18**: unknown props on a custom element are written as **attributes**, not
  properties, and **`on*` props are ignored** for non-built-in events. So you cannot pass
  a non-string `value`/object props, and you cannot subscribe to `input`/`change` from a
  custom element declaratively. You must use `ref` + `addEventListener` and imperatively
  set `el.value`. This is exactly the gap `@lit/react` fills.
- **React 19** (stable since Dec 2024): full custom-elements support; passes *Custom
  Elements Everywhere*. Client render: **if the prop name exists as a property on the
  element instance (`in` check), React assigns it as a property; otherwise as an
  attribute.** SSR: primitive props (string/number/`true`) render as attributes;
  object/function/`symbol`/`false` are omitted. Adds `on*` custom-event props.

### React 19 `on*` event caveat (important)
React 19 **lowercases** the event-handler prop name to derive the event type:
`onMyEvent` → listens for `"myevent"`, **not** `"my-event"` or `"MyEvent"`. There is **no
kebab-case support**. For this library:
- `input` and `change` are lowercase already, so `onInput` / `onChange` map correctly
  (these are also built-in React events, so they Just Work).
- The bespoke events (`selected`, `remove`) are lowercase single words, so
  `onselected` / `onremove`-style props *can* match — but React's prop-name casing rules
  around custom-vs-built-in `on*` are fiddly. **Prefer `@lit/react`'s explicit `events`
  map** (or `ref`+`addEventListener`) for anything beyond `input`/`change`.

### @lit/react
- Latest: **`@lit/react@1.0.8`**. Peer: `@types/react: "17 || 18 || 19"` (works across
  all three majors). It is the productized successor to `@lit-labs/react`.
- `createComponent({ tagName, elementClass, react, events, displayName? })`:
  - Interrogates the element class so React props with **property** names are set as
    **properties** (not attributes) — fixes the React ≤18 limitation for any version.
  - `events` maps a React prop name → DOM event name, wired via `addEventListener` in
    `componentDidMount`/`componentDidUpdate`.
  - Children render to the default slot; named slots via the standard `slot=""`
    attribute (wrap React subtrees in `<div slot="x" style={{display:'contents'}}>`).
  - Typed events via `EventName<T>`: `'onselected': 'selected' as EventName<CustomEvent<string>>`.

---

## What to build

A thin **React adapter package** (or a folder in the consumer app) exposing typed React
wrappers for each form input, plus an idiomatic `value`/`onChange` controlled API and
form-library bindings.

1. **Wrapper modules** — one `createComponent(...)` per element (`UTextField`,
   `USelect`, `UTypeahead`, `UCheckbox`, `USlider`, `UChipField`, …), each mapping at
   least `onInput`/`onChange`, plus bespoke events (`onSelected`, `onRemove`) where they
   exist. Wrappers must be created **once** at module scope (not inside render).
2. **A controlled-input convention** — document that callers pass `value` + an
   `onInput`/`onChange` that reads `e.target.value`. Because the element is form-
   associated, an *uncontrolled* usage (no `value` prop, read on submit) is also fully
   supported and is the simplest path with react-hook-form.
3. **Form-library bindings**:
   - **react-hook-form**: prefer **uncontrolled** via `register` where possible (FormData
     already has the value), else a `Controller` wrapper for controlled binding.
   - **Formik**: a small `useField` bridge mapping `field.value`/`onChange`.
4. **TypeScript types** — re-export the element instance types from
   `@universal-material/web` so wrapper props and refs are typed.
5. **Side-effect registration** — ensure the custom elements are defined before React
   mounts (import `@universal-material/web` once at app entry; wrappers reference the
   element classes, which register on import).
6. **(Optional) SSR/Next.js note** — see Gotchas.

---

## How (recommended approach)

**Use `@lit/react` `createComponent` wrappers.** It is the official Lit tooling, works on
React 17/18/19 (so the adapter isn't pinned to 19), produces typed props and a typed
`onInput`/`onChange`, and guarantees `value` is set as a **property**. For events beyond
`input`/`change`, the explicit `events` map avoids React 19's lowercase/kebab pitfalls.

Decision guide:
- **Publishing a reusable adapter / supporting React 17–19** → `@lit/react`. (Recommended.)
- **App is React 19-only and you want zero wrapper deps** → render the tags directly; use
  `onInput`/`onChange` (lowercase, built-in → safe) and set `value` as a property. Fall
  back to `ref`+`addEventListener` for `selected`/`remove`.
- **React ≤18 without `@lit/react`** → `ref` + `useEffect`/`addEventListener` +
  imperative `el.value =` (verbose; not recommended when `@lit/react` is available).

### Controlled vs uncontrolled
- **Controlled**: pass `value`, update on `onInput` (live) or `onChange` (on commit).
  The element's `.value` is set via `live()` internally
  (`.value=${live(this._value)}` in `text-field.ts`), so re-renders won't fight the DOM,
  and caret position is preserved on normal typing. Use `onChange` (commit) for the
  fewest surprises; use `onInput` when you need per-keystroke state.
- **Uncontrolled (recommended with form libs)**: omit `value`; let the FACE feed
  `FormData`. Read on submit, or register a `ref`. Simplest, fastest, no caret concerns.

### Build tooling / ESM
- `@universal-material/web` ships **ESM**. Vite and tsup consume it directly. With Vite,
  no special config is needed; just `import '@universal-material/web'` once.
- The library uses **standard decorators-emitting Lit output already built to `dist/`**,
  so consumers don't compile its TS — only their own wrapper files. tsup/Vite need no
  decorator config for the *consumer's* wrapper code (the wrappers are plain TS/JSX).
- Mark `react`/`react-dom` (and `@universal-material/web` if you re-publish) as
  `external`/`peerDependencies` in the adapter's build so they aren't bundled twice.

---

## Gotchas

1. **React ≤18 writes attributes, ignores `on*`.** Without `@lit/react` you cannot pass
   non-string props or subscribe to `input`/`change` declaratively. This is the single
   biggest reason to wrap.
2. **React 19 lowercases event prop names; no kebab-case.** `onMyEvent` → `"myevent"`.
   Safe for `input`/`change`; risky for multi-word custom events. Use `@lit/react`'s
   `events` map or `addEventListener` for `selected`/`remove`.
3. **`change` semantics differ from native React `<input>`.** On a native React input,
   `onChange` fires on *every keystroke*; here `change` fires on **commit/blur** (web-
   component semantics) and `input` fires live. Map intentionally: use `onInput` if you
   want React-style per-keystroke `onChange` behavior.
4. **Create wrappers at module scope.** Calling `createComponent` inside a component body
   makes a new component type each render → remounts the element and loses state/caret.
5. **Caret jump with controlled inputs.** General React-controlled-input hazard:
   asynchronous state updates push a stale `value` back and move the caret to the end.
   Update value synchronously in the handler. This library mitigates it with Lit's
   `live()` directive on the inner input, but async/debounced state in *your* React code
   can still cause it.
6. **Property vs attribute for `value`.** `value` must be set as a **property** (it's a
   getter/setter that calls `setFormValue`). `@lit/react` does this via the `in` check;
   bare React 19 also does (the instance has a `value` property). Setting a `value`
   *attribute* would not run the setter.
7. **Bespoke `CustomEvent` detail.** `u-typeahead` `selected` and `u-chip-field`
   `remove` carry data in `event.detail`, not `event.target.value`. Type them with
   `EventName<CustomEvent<...>>` in the `events` map.
8. **Element must be registered before render.** Import `@universal-material/web` (side-
   effecting) at the app entry; referencing the element class in `createComponent` also
   triggers registration. Note the repo's CLAUDE.md gotcha #2 (provider-before-consumer
   import order) for layout components — for inputs this is usually a non-issue.
9. **SSR / Next.js App Router.** Custom elements are client-only (they call
   `attachInternals()` in the constructor → no SSR DOM). Render wrappers in client
   components (`"use client"`). React 19 will emit primitive props as attributes during
   SSR, but the element won't upgrade/hydrate state until client JS runs; mark non-string
   props accordingly. For Next.js, lazy/`dynamic(..., { ssr: false })` the wrapper if
   `ElementInternals` access throws during SSR.
10. **react-hook-form `Controller` vs `register`.** Because these are FACE, **prefer
    `register`/uncontrolled** when you can read on submit — FormData already has the
    value, so you skip controlled-binding churn. Use `Controller` only when you need RHF
    to own the value (validation-on-change, transforms). With `Controller`, wire
    `onChange={(e) => field.onChange(e.target.value)}` and `value={field.value ?? ''}`.
11. **Formik has no FACE awareness.** Formik reads its own state, not `FormData`, so it is
    effectively controlled: bind `value={field.value}` and
    `onChange={(e) => setFieldValue(name, e.target.value)}` (read `e.target.value`, since
    Formik's default `handleChange` expects `e.target.name`/`value` and the host *does*
    expose both).
12. **`displayName`** — pass `createComponent({ ..., displayName: 'UTextField' })` for
    readable React DevTools output; otherwise it's anonymous.

---

## Official tooling

- **`@lit/react`** (`createComponent`, `useController`, `EventName`) — official Lit React
  wrapper. `npm i @lit/react`. Docs: https://lit.dev/docs/frameworks/react/
- **React 19** native custom-element support (no wrapper for the property/attribute +
  `on*` parts): https://react.dev/ ; deep dive:
  https://aleks-elkin.github.io/posts/2024-12-06-react-19/
- **Custom Elements Everywhere** (React 19 passes): https://custom-elements-everywhere.com/
- **react-hook-form** `Controller`/`register`: https://react-hook-form.com/docs/usecontroller/controller
- **`ce-la-react`** (muxinc) — alternative wrapper generator, SSR-leaning:
  https://github.com/muxinc/ce-la-react

---

## Minimal code sketch — wrapped input with two-way value binding

### 1. The wrapper (module scope, created once)

```tsx
// u-react.ts
import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { TextField } from '@universal-material/web'; // the Lit element class
import '@universal-material/web';                     // side-effect: registers <u-text-field>

export const UTextField = createComponent({
  react: React,
  tagName: 'u-text-field',
  elementClass: TextField,
  displayName: 'UTextField',
  events: {
    // `input` fires live (per keystroke); `change` fires on commit/blur.
    onInput: 'input' as EventName<InputEvent>,
    onChange: 'change' as EventName<Event>,
  },
});
```

### 2. Controlled usage (two-way binding into React state)

```tsx
import * as React from 'react';
import { UTextField } from './u-react';

export function NameField() {
  const [name, setName] = React.useState('');
  return (
    <UTextField
      label="Name"
      value={name}                                  // set as a DOM *property*
      // read e.target.value off the host element (form-associated <u-text-field>)
      onInput={(e) => setName((e.target as HTMLInputElement & { value: string }).value)}
    />
  );
}
```

### 3. react-hook-form — uncontrolled (recommended; FormData already has the value)

```tsx
import { useForm } from 'react-hook-form';
import { UTextField } from './u-react';

export function Form() {
  // The element is form-associated, so the native form/FormData carries the value.
  const { handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      {/* name="email" makes it part of FormData automatically */}
      <UTextField name="email" label="Email" />
      <button type="submit">Save</button>
    </form>
  );
}
```

### 3b. react-hook-form — controlled (when RHF must own the value)

```tsx
import { Controller, useForm } from 'react-hook-form';
import { UTextField } from './u-react';

export function ControlledForm() {
  const { control, handleSubmit } = useForm({ defaultValues: { email: '' } });
  return (
    <form onSubmit={handleSubmit(console.log)}>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <UTextField
            label="Email"
            value={field.value ?? ''}
            onChange={(e) => field.onChange((e.target as HTMLInputElement).value)}
          />
        )}
      />
      <button type="submit">Save</button>
    </form>
  );
}
```

### 4. React 19 without a wrapper (app code, no @lit/react)

```tsx
// React 19 sets `value` as a property (instance has a `value` setter) and supports on*.
// `onInput` / `onChange` are lowercase + built-in, so they map safely.
import '@universal-material/web';

export function NameField19() {
  const [name, setName] = React.useState('');
  return (
    // @ts-expect-error — no JSX intrinsic types for u-text-field without a wrapper
    <u-text-field
      value={name}
      onInput={(e: any) => setName(e.target.value)}
    />
  );
}
```

For bespoke events that aren't lowercase single words (or to be safe), fall back to a ref:

```tsx
const ref = React.useRef<HTMLElement>(null);
React.useEffect(() => {
  const el = ref.current;
  const onSel = (e: Event) => console.log((e as CustomEvent<string>).detail);
  el?.addEventListener('selected', onSel);
  return () => el?.removeEventListener('selected', onSel);
}, []);
// <u-typeahead ref={ref} />
```
