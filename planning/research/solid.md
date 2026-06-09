# Consuming Universal Material Web from SolidJS

> **Status: OPTIONAL / STRETCH TARGET.** SolidJS is not a primary consumer of this
> library. This document captures the research needed *if* we decide to ship a
> SolidJS quick-start, example, or types package later. Nothing here is required
> for the core (Lit + Angular docs) deliverables. Treat the "What to build"
> section as a backlog of opt-in nice-to-haves, not committed work.

SolidJS is one of the best frameworks in the ecosystem for consuming custom
elements. It scores a **perfect 16/16** on
[Custom Elements Everywhere](https://custom-elements-everywhere.com/libraries/solid/results/results.html)
(0 failures, 0 caveats) — it passes every data test (boolean, number, string,
array, object, camelCase property names) and every event test (lowercase,
kebab-case, camelCase, CAPScase, PascalCase). This means our `u-*` components
work in Solid **with no wrapper required** — but there are two real gotchas
around property *casing* and *custom-event* names that a consumer must know.

---

## What to build

None of this is required. In rough priority order if we ever invest:

1. **A doc snippet / example** showing the three load-bearing patterns:
   `prop:` for camelCase/complex properties, `attr:`/`bool:` for attributes, and
   `on:` for kebab-case custom events. This is 90% of the value for ~zero cost.
2. **A `solid-js` JSX type augmentation** (`.d.ts`) so `<u-button>` etc. are
   typed in Solid TSX. Can be hand-written or generated from a Custom Elements
   Manifest (see *Official tooling*). Ship as an optional secondary entry point
   (e.g. `@universal-material/web/solid-types`) so it doesn't pollute the
   default types.
3. **(Probably skip)** A `solid-element`-style wrapper package. Not needed —
   Solid renders our raw custom elements correctly. `solid-element` is for
   *authoring* web components in Solid, not for *consuming* them; it's the wrong
   tool here. Only revisit if we want first-class Solid components with
   signal-based two-way binding sugar.

---

## How it works

### Props vs. attributes — Solid's heuristic for custom elements

Solid's JSX compiler treats **custom elements differently from built-in
elements** ([RFC #2322](https://github.com/solidjs/solid/discussions/2322)):

- On a **built-in** element, `foo={x}` sets the **attribute** `foo` by default.
- On a **custom element** (any tag containing a `-`), `foo={x}` sets the **JS
  property** `foo` by default — *unless* no such property exists, in which case
  it falls back to an attribute.

This default is exactly right for Lit: Lit reactive properties are real JS
accessors, so `<u-select value={v}>` assigns the `value` *property* and complex
values (objects, arrays) survive intact. No `JSON.stringify` dance, no
`.serialize` — this is why Solid passes the array/object data tests.

Explicit directives override the heuristic (Lit-inspired, same spellings):

| Directive | Effect | Use for |
| --- | --- | --- |
| `prop:foo={x}` or `.foo={x}` | force a **JS property** | camelCase props, complex values, disambiguation |
| `attr:foo={x}` | force an **HTML attribute** (string; `null`/`undefined` removes it) | reflected string attrs, SSR-visible attrs |
| `bool:foo={x}` or `?foo={x}` | boolean attribute (present when truthy) | presence-style boolean attrs |

`attr:` reference: [Solid docs — attr:*](https://docs.solidjs.com/reference/jsx-attributes/attr).

### GOTCHA #1 — camelCase property names get lowercased

This is the single most important thing for a Lit consumer. Solid's compiler
**lowercases the bare prop key** before assigning it, even on custom elements,
because it can't statically know the element's property names. So:

```tsx
// WRONG — Solid writes `el.someprop = x` (lowercased) → never reaches `someProp`
<u-some-thing someProp={x} />
```

The community rule of thumb is "make your element map dash-case attributes to
camelCase properties and it just works"
([discussion #1800](https://github.com/solidjs/solid/discussions/1800)). Lit
*does* do this for attributes (`some-prop` attribute ↔ `someProp` property), so
**kebab-case attribute form works** when the value is a string:

```tsx
<u-some-thing some-prop="hello" />   // sets the attribute → Lit reflects to someProp
```

But for **non-string** camelCase properties (objects, arrays, numbers you want
kept as numbers) you must use `prop:` with the exact casing:

```tsx
<u-some-thing prop:someProp={someObject} />   // exact casing preserved
```

> Rule for our library: tell Solid consumers to prefer `prop:camelCaseName` for
> any camelCase property, and reserve bare kebab-case for plain string
> attributes. Our components already declare matching `some-prop`/`someProp`
> attribute↔property pairs via Lit, so simple string cases are painless.

### Events — delegated `on*` vs. native `on:*`

Solid has two event syntaxes
([Event handlers docs](https://docs.solidjs.com/concepts/components/event-handlers)):

- **`onClick`, `onInput`, …** — *delegated*, case-insensitive synthetic events.
  Solid attaches a single listener at the document root for a known set of
  common DOM events and dispatches as they bubble. Efficient, but only for that
  built-in delegated set.
- **`on:eventname`** — a *native, non-delegated* `addEventListener`, attached
  directly to the element, **case-sensitive**, and supporting listener options
  via `on:eventname={{ handler, options }}`.

### GOTCHA #2 — custom events must use `on:` with exact casing

Lit components dispatch `CustomEvent`s with library-specific names (often
kebab-case like `selection-change`, or camelCase). These are **not** in Solid's
delegated set, and delegated handlers are lowercased — so you **must** use
`on:` with the **exact event name** the component dispatches:

```tsx
// A component dispatching a kebab-case CustomEvent (hypothetical) needs on: with the EXACT name:
<u-some-widget on:some-custom-event={e => handle(e.detail)} />

// u-select fires native `input`/`change` (value on target.value) — these ARE in Solid's
// delegated set, so onInput/onChange work too; on: is only mandatory for real CustomEvents:
<u-select prop:value={value()} on:change={e => setValue((e.currentTarget as HTMLSelectElement).value)} />
<u-field onInput={e => setValue((e.target as HTMLInputElement).value)} />
```

Notes:
- `on:` is case-sensitive: `on:selectionChange` ≠ `on:selection-change`. Match
  the `dispatchEvent` string verbatim.
- For the event to reach Solid's handler from inside a shadow root, the
  `CustomEvent` must be `composed: true` (and `bubbles` if you rely on
  bubbling). Our components should already set this; if a Solid consumer can't
  catch an event, check the dispatch options first
  ([issue #320](https://github.com/solidjs/solid/issues/320),
  [issue #2103](https://github.com/solidjs/solid/issues/2103)).
- Solid also supports a bound-handler array form for perf:
  `on:selection-change={[handler, rowData]}` calls `handler(rowData, event)`.

### Two-way `value` binding

Solid has no `v-model`/`[(ngModel)]` two-way sugar — binding is explicit, which
is clean and unambiguous. Use a signal: write the property in, read it back out
of the custom event:

```tsx
import { createSignal } from "solid-js";

function Demo() {
  const [value, setValue] = createSignal("");
  return (
    <u-select
      prop:value={value()}
      on:input={e => setValue((e.currentTarget as HTMLInputElement).value)}
    />
  );
}
```

- The setter from `on:` re-runs the component's reactive scope, and `prop:value`
  reassigns the element property — a clean unidirectional loop that *behaves*
  two-way.
- Whether you use `on:input`, `on:change`, or a custom `on:xxx-change` depends
  on what each `u-*` component emits — document the canonical event per
  component (this mirrors the Angular `ControlValueAccessor` event mapping work).
- A `ref` is available if a consumer needs imperative access:
  `<u-dialog ref={el => (dialogRef = el)} />` then `dialogRef.show()`.

### Do you need a wrapper? — No.

Because Solid sets properties on custom elements by default and supports native
event listeners via `on:`, **raw `u-*` tags work directly in Solid TSX**. No
runtime wrapper, no `solid-element`. The only thing worth shipping is **types**
(below). `solid-element`/`@solidjs/element` are for *authoring* custom elements
*in* Solid (`customElement(tag, defaults, fn)`, `noShadowDOM()`) — irrelevant to
*consuming* ours.

---

## Gotchas (quick reference)

1. **camelCase property names get lowercased** in bare JSX → use
   `prop:camelCaseName={...}` (exact casing) for any camelCase or non-string
   property. Bare `kebab-case="string"` is fine for plain string attributes.
2. **Custom events need `on:exact-event-name`** — delegated `onFoo` won't catch
   them and lowercases the name. Match the `dispatchEvent` string verbatim.
3. **Shadow-DOM events need `composed: true`** to escape the shadow boundary and
   reach a Solid handler; `bubbles` too if you rely on bubbling.
4. **`prop:` vs `attr:` vs `bool:`** — when in doubt, force the intent
   explicitly. `prop:`/`.` = property, `attr:` = attribute, `bool:`/`?` =
   boolean attribute. Don't rely on the heuristic for anything non-obvious.
5. **No two-way binding sugar** — wire `prop:value` in + `on:…` out manually
   with a signal. This is by design, not a limitation.
6. **Default types don't know `u-*` tags** — without a JSX augmentation, Solid
   TSX will type-error on unknown elements (or silently `any` depending on
   config). Ship/point to a `.d.ts`.
7. **`solid-element` is a red herring** for consumers — it's for authoring web
   components in Solid, not consuming external ones.

---

## Official tooling

- **No wrapper library needed.** Solid consumes custom elements natively;
  there's no Solid equivalent of `@lit/react`'s `createComponent` because none
  is required.
- **`solid-element` / `@solidjs/element`** — official Solid package for
  *authoring* web components with Solid (`customElement`, `noShadowDOM`,
  `registerCustomElement`, `withSolid`). Not used for consumption.
- **JSX typing** — two routes:
  - *Hand-written augmentation* of `solid-js` `JSX.IntrinsicElements`
    (see sketch below). Minimal, no build step.
  - *Generated from a Custom Elements Manifest* (`custom-elements.json`, which
    this repo can produce via `@custom-elements-manifest/analyzer`) using a
    tool such as
    [`custom-element-solidjs-integration`](https://www.npmjs.com/package/custom-element-solidjs-integration)
    or the [WC Toolkit JSX types generator](https://wc-toolkit.com/integrations/jsx/).
    Best if we want the types to track the API automatically — aligns with the
    `gulp docs:apis` / manifest direction the project already has.
- **Build tooling** — nothing special. Solid projects (Vite + `vite-plugin-solid`,
  or the Solid Start metaframework) import the library's ESM bundle and
  `import '@universal-material/web'` for the side-effecting `customElements.define`
  registrations, exactly like any other framework. The only knob is making sure
  the registration import isn't tree-shaken away (it has side effects, so it
  won't be, but document the bare `import` form).

---

## Sketch — minimal Solid consumption + types

**1. Register the elements (once, app entry):**

```ts
// main.tsx — side-effecting import registers all <u-*> via customElements.define
import "@universal-material/web";
```

**2. Optional JSX type augmentation** (ship as `…/solid-types.d.ts`):

```ts
// solid-types.d.ts
import type { JSX } from "solid-js";

// Helper: map a Lit element's public props to Solid's prop: form so camelCase
// props are typed and assigned as properties, plus allow the common directives.
type SolidProps<T> = Partial<{
  [K in keyof T as `prop:${string & K}`]: T[K];
}> &
  JSX.HTMLAttributes<T> & {
    // Map the component's REAL events. u-* value inputs fire native `input`/`change`
    // (value on `target.value`); only add `on:<kebab-name>` for genuine CustomEvents the
    // component actually dispatches (e.g. u-typeahead's `selected`, u-chip-field's `remove`).
    "on:input"?: (e: Event) => void;
    "on:change"?: (e: Event) => void;
  };

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "u-button": SolidProps<import("@universal-material/web").Button>;
      "u-select": SolidProps<import("@universal-material/web").Select>;
      // …one entry per component, ideally code-generated from the manifest
    }
  }
}
```

**3. Use it:**

```tsx
import { createSignal } from "solid-js";

export default function App() {
  const [value, setValue] = createSignal("a");
  return (
    <>
      {/* property in (camelCase → prop:), value out via native `change` (value on target.value) */}
      <u-select
        prop:value={value()}
        on:change={(e) => setValue((e.currentTarget as HTMLSelectElement).value)}
      >
        <u-option value="a">A</u-option>
        <u-option value="b">B</u-option>
      </u-select>

      {/* plain string attribute — bare kebab-case is fine */}
      <u-button variant="filled" onClick={() => setValue("a")}>
        Reset
      </u-button>

      <p>Selected: {value()}</p>
    </>
  );
}
```

---

## Sources

- [Custom Elements Everywhere — Solid results (16/16)](https://custom-elements-everywhere.com/libraries/solid/results/results.html)
- [Solid docs — attr:* directive](https://docs.solidjs.com/reference/jsx-attributes/attr)
- [Solid docs — on:* / on* event handlers](https://docs.solidjs.com/concepts/components/event-handlers)
- [RFC #2322 — Rethinking template-prop → attribute/property mapping](https://github.com/solidjs/solid/discussions/2322)
- [Discussion #1800 — web-component property casing lowercased](https://github.com/solidjs/solid/discussions/1800)
- [Discussion #1123 — extending JSX.IntrinsicElements for custom elements](https://github.com/solidjs/solid/discussions/1123)
- [Issue #320 — custom-event delegation opt-in / on: workaround](https://github.com/solidjs/solid/issues/320)
- [Issue #2103 — shadow-root events have wrong target](https://github.com/solidjs/solid/issues/2103)
- [solid-element (npm) — authoring web components in Solid](https://www.npmjs.com/package/solid-element)
- [custom-element-solidjs-integration (npm) — manifest → Solid JSX types](https://www.npmjs.com/package/custom-element-solidjs-integration)
- [WC Toolkit — JSX types generator](https://wc-toolkit.com/integrations/jsx/)
