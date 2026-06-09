# @universal-material/react

Typed **React wrappers** for [`@universal-material/web`](https://www.npmjs.com/package/@universal-material/web) — the Material 3 (Lit) web-component library. One `U*` component per `u-*` custom element, generated from the web library's element manifest, built with [`@lit/react`](https://www.npmjs.com/package/@lit/react)'s `createComponent`.

Every wrapper:

- sets known props (`value`, `checked`, …) as **DOM properties**, not attributes, so the IDL setters run (this is what makes value binding and form participation work);
- wires the element's events (`input`, `change`, plus bespoke `selected`/`remove`) as typed `on*` handlers;
- works on **React 17, 18 and 19** (React ≤18 ignores `on*` and writes unknown props as attributes; React 19 lowercases event names — `@lit/react` smooths over both).

## Install

```sh
npm i @universal-material/react @universal-material/web react react-dom
```

`@universal-material/web` and `react`/`react-dom` are **peer dependencies** — install them alongside this package. Importing anything from `@universal-material/react` also imports `@universal-material/web` once for its side effect, which **registers every `<u-*>` custom element**. You do not need a separate `import '@universal-material/web'`.

```tsx
import { UTextField, USelect, UCheckbox, UButton } from '@universal-material/react';
```

## Controlled usage

The value goes **in** as a DOM property (`value` / `checked`); the value comes **out** by listening to `input` (live) / `change` (committed) on the element and reading `e.target.value` (or `e.target.checked`).

```tsx
import { useState } from 'react';
import { UTextField } from '@universal-material/react';

function Email() {
  const [value, setValue] = useState('');
  return (
    <UTextField
      label="Email"
      value={value}
      onInput={(e) => setValue((e.target as HTMLInputElement).value)}
    />
  );
}
```

### Value / event contract per component

| Component(s) | tag(s) | Two-way prop | Events to map | Read value from |
| --- | --- | --- | --- | --- |
| Text field / area / search | `UTextField`, `UTextArea`, `USearch` | `value: string` | `onInput` + `onChange` | `e.target.value` |
| Datepicker(s) | `UDatepicker`, `URangeDatepicker` | `value: string` | `onInput` + `onChange` | `e.target.value` |
| Select | `USelect` | `value: string` (+ `selectedIndex`) | `onInput` + `onChange` | `e.target.value` (IDL prop only — **no `value` attribute**) |
| Checkbox / radio / switch (+ `*-list-item`) | `UCheckbox`, `URadio`, `USwitch`, `UCheckboxListItem`, `URadioListItem`, `USwitchListItem` | `checked: boolean` | `onChange` | `e.target.checked` |
| Slider | `USlider` | `value: number` or `valueStart`/`valueEnd` | `onInput` (drag) + `onChange` (commit) | `e.target.value` |
| Chip field | `UChipField` | `value: any[]` | `onChange` + `onRemove` (`CustomEvent`) | `e.target.value` |
| Typeahead | `UTypeahead` | `value: any` | `onInput` + `onChange` + `onSelected` (`CustomEvent`) | `e.target.value` |

### Checkbox / switch / radio divergence

Selection controls are **not** text inputs: bind **`checked`** (a boolean), listen on **`onChange`**, and read **`e.target.checked`**. They do not emit `input` and carry no string `value` payload.

```tsx
import { UCheckbox } from '@universal-material/react';

<UCheckbox
  checked={agree}
  onChange={(e) => setAgree((e.target as HTMLInputElement).checked)}
/>;
```

### Bespoke events carry data in `e.detail`

`UTypeahead` emits `onSelected` and `UChipField` emits `onRemove` as `CustomEvent`s — read the payload from `e.detail` (the *value* itself still comes from `e.target.value`):

```tsx
<UTypeahead onSelected={(e) => console.log(e.detail)} />
<UChipField onRemove={(e) => console.log(e.detail)} />
```

The `EventName` helper from `@lit/react` is re-exported for typing your own listeners:

```ts
import type { EventName } from '@universal-material/react';
```

## Uncontrolled usage (the simplest path)

Every input `u-*` element is a **Form-Associated Custom Element (FACE)**: it calls `attachInternals()` and pushes its value via `ElementInternals.setFormValue`. So native `<form>` / `FormData` submission and constraint validation are **free** — give the element a `name`, read it on submit, and keep **zero React state**.

```tsx
function Signup() {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    console.log(data.get('email'), data.get('agree'));
  }
  return (
    <form onSubmit={onSubmit}>
      <UTextField name="email" />
      <UCheckbox name="agree" value="yes" />
      <UButton type="submit">Sign up</UButton>
    </form>
  );
}
```

## react-hook-form

### `register` (uncontrolled — preferred)

Because the elements are FACE, the uncontrolled path is the simplest: let RHF read the value from the form on submit. Spread `register` and forward the `ref`/`name`:

```tsx
import { useForm } from 'react-hook-form';
import { UTextField } from '@universal-material/react';

function Form() {
  const { register, handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit(console.log)}>
      <UTextField {...register('email')} />
    </form>
  );
}
```

### `Controller` (controlled)

When you need RHF to own the value (computed defaults, cross-field validation), use `Controller` and bridge `field.value` → `value` and `onChange`/`onInput` → `field.onChange(e.target.value)`:

```tsx
import { useForm, Controller } from 'react-hook-form';
import { UTextField } from '@universal-material/react';

function Form() {
  const { control } = useForm({ defaultValues: { email: '' } });
  return (
    <Controller
      name="email"
      control={control}
      render={({ field }) => (
        <UTextField
          value={field.value}
          onChange={(e) => field.onChange((e.target as HTMLInputElement).value)}
        />
      )}
    />
  );
}
```

For checkbox/switch/radio inside a `Controller`, bridge `checked` ↔ `e.target.checked` instead of `value`.

## Next.js / SSR

Custom elements are **client-only** — they call `attachInternals()` in their constructor, which throws during server rendering. Render the wrappers from a **client component**:

```tsx
'use client';
import { UTextField } from '@universal-material/react';
```

If `ElementInternals` still throws during SSR (some runtimes evaluate the constructor eagerly), defer the wrapper to the client:

```tsx
import dynamic from 'next/dynamic';
const UTextField = dynamic(
  () => import('@universal-material/react').then((m) => m.UTextField),
  { ssr: false },
);
```

## Using bare `<u-*>` elements (React 19, no wrapper)

React 19 binds custom-element properties and `on*` handlers natively, so you can use the elements without a wrapper if you supply the JSX intrinsic types yourself. This package ships the `createComponent` wrappers (the cross-version path); bare-element typings are not packaged. The wrappers remain the recommended, version-portable approach.

## License

MIT
