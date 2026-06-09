# Consuming a Lit custom-elements library from Svelte (5 + legacy 4)

Research notes for shipping `@universal-material/web` (a Lit / `u-*` custom-elements
library) to Svelte consumers. Covers Svelte 5 (runes) and legacy Svelte 4. All findings
are grounded in the official Svelte docs plus the relevant `sveltejs/svelte` issues.

---

## TL;DR

- **No wrapper package is needed.** Svelte (4 and 5) consumes standard custom elements
  natively. The deliverable is **documentation + TypeScript ambient types**, not a
  `@universal-material/web-svelte` runtime shim. Svelte is the framework with the *best*
  out-of-the-box custom-element support (unlike React ≤18, it does not need
  `@lit/react` style wrappers).
- **Props vs attributes is automatic** via the `prop in node` heuristic: if a JS property
  with that name exists on the element instance, Svelte assigns the **property**; otherwise
  it sets an **attribute**. This is exactly what a Lit element wants (Lit reactive
  properties live on the instance), so complex values (objects/arrays/`Date`) flow through
  as properties with no `JSON.stringify` dance — *as long as the element is upgraded first*.
- **`bind:value` does NOT work on third-party custom elements.** Two-way binding via `bind:`
  is reserved for native form elements and Svelte components. Use an event listener
  (`on:input` / `on:change`) to read back changes, and set the value as a normal prop to
  write. Optionally wrap that pattern in a Svelte **action** or a small `.svelte` wrapper to
  recover a `bind:`-like feel.
- **Events: use `on:eventname`** (legacy directive). It compiles to
  `addEventListener('eventname', …)`, so it works for *any* event name including the
  library's `change`, `input`, `remove`, `selected`, `open`, `close`. In Svelte 5 runes
  mode the modern `oneventname` attribute form also works for lowercase names, but **`on:`
  is the safest, most portable choice** and is required for hyphenated event names.
- **`composed: true` matters.** This library dispatches its `input` events with
  `composed: true` (and most events with `bubbles: true`), so they cross the shadow
  boundary and reach Svelte listeners. Confirmed good. (See the event inventory below.)

---

## What to build

1. **A Svelte usage guide** (docs page + a `skills/`-style snippet) that shows:
   - importing/registering the elements once (side-effect import of the bundle),
   - setting props (incl. objects/`Date`) and why no serialization is needed,
   - listening to events with `on:change` / `on:input`,
   - the `bind:value` limitation and the recommended action/wrapper workaround,
   - SvelteKit SSR guard (client-only registration).
2. **Ambient TypeScript declarations** so `<u-button>` etc. type-check in `.svelte` files.
   Ship a `.d.ts` (e.g. `svelte.d.ts`) consumers can reference, and/or document the
   `svelte/elements` module-augmentation pattern. This is the only "tooling" artifact.
3. **(Optional) thin `.svelte` wrappers** for the few field-like components where a true
   `bind:value` ergonomic is desirable (e.g. `u-field`, `u-select`, `u-typeahead`,
   `u-datepicker`). These are convenience, not a requirement — keep them out of the core
   package or in an optional subpath so plain custom-element usage stays the default.

**Not needed:** a runtime wrapper/adapter library, a Vite plugin, or any build-time
transform. Svelte's compiler handles custom elements directly.

---

## How Svelte binds props/attributes on custom elements

### The `prop in node` heuristic (the whole story)

> "If a corresponding property exists on the custom element at runtime, Svelte will pass
> the data as a property. Otherwise, it will pass it as an attribute."

Mechanically, Svelte checks `if (prop in node)` against the **live element instance**.
Preact uses the identical rule. Consequences for a Lit library:

- Lit declares reactive properties with `@property()`, so `value`, `disabled`, `selected`,
  `label`, etc. are real instance properties → Svelte sets them as **properties**. Good:
  objects/arrays/`Date`/functions pass through by reference (no string coercion).
- A name with **no** matching instance property (e.g. `class`, `slot`, `data-*`, or a
  reflected-only attribute the element doesn't expose as a property) is set as an
  **attribute**.

```svelte
<!-- `value` is a property on the element → set as a JS property (object passes by ref) -->
<u-typeahead {value} {items} />
<!-- `class` is not a property → set as an attribute -->
<u-button class="hero">Save</u-button>
```

### Gotcha: timing / upgrade order (the big one)

The heuristic reads the element instance, so **the custom element must already be defined
(`customElements.define` has run) when Svelte sets the data**. If the element is still an
unupgraded `HTMLUnknownElement`, `prop in node` is `false` and Svelte silently sets an
**attribute** instead of the property — your object becomes `[object Object]` or is dropped.
This is the root cause of several open reports
([svelte#13785](https://github.com/sveltejs/svelte/issues/13785),
[svelte#15455](https://github.com/sveltejs/svelte/issues/15455)).

Mitigations to document:
- **Import/register the library eagerly** (top-level side-effect import) so the elements are
  defined before any component using them renders.
- For objects that must land as properties regardless of timing, use the **`setProperties`
  action** pattern (below) or `bind:this` + an effect — both assign with `node[key] = value`
  in JS, bypassing the heuristic entirely.

### Forcing property vs attribute when the heuristic is wrong

`setProperties` action (always assigns as JS property):

```svelte
<script>
  function setProperties(node, props) {
    const apply = () => Object.entries(props).forEach(([k, v]) => (node[k] = v));
    apply();
    return { update(next) { props = next; apply(); } };
  }
</script>

<u-typeahead use:setProperties={{ items: ['Amy', 'Bill'], value: selected }} />
```

`setAttributes` action (forces a real attribute, e.g. to hit a `:host([flag])` selector):

```svelte
<u-chip use:setAttributes={{ selected: on ? '' : undefined }}>Tag</u-chip>
```

### The `on*`-prefix trap (naming)

From the Svelte custom-elements docs:

> "Don't declare properties or attributes starting with `on`, as their usage will be
> interpreted as an event listener. Svelte treats `<custom-element oneworld={true}>` as
> `customElement.addEventListener('eworld', true)` (not `customElement.oneworld = true`)."

So **never name a public attribute/property `on…`** in the library (none currently do —
good). If a consumer ever needs such a name, they must set it via `bind:this`/action.

---

## `bind:value` support on custom elements and its limits

**`bind:` two-way binding is NOT available for third-party custom elements.** It is
restricted to native form elements (`<input>`, `<select>`, `<textarea>`, media, etc.) and
Svelte components. Attempting `bind:value` on `<u-field>` does not create a working
two-way binding (long-standing limitation;
[svelte#3566](https://github.com/sveltejs/svelte/issues/3566),
[svelte#6484](https://github.com/sveltejs/svelte/issues/6484), still open in Svelte 5).

This is **fine** for this library because the components are designed to emit DOM
`input`/`change` events (see inventory). The idiomatic Svelte pattern is one-way prop +
event read-back:

```svelte
<script>
  let value = '';
</script>

<!-- write: prop in -->
<!-- read:  event out -->
<u-field
  {value}
  on:input={(e) => (value = e.target.value)}
/>
<p>Current: {value}</p>
```

### Recovering a `bind:`-like ergonomic

Two clean options to document:

1. **Action** that wires the listener + writes the property, paired with `bind:this`-free usage:

   ```svelte
   <script>
     // two-way action: writes node.value, listens for input/change
     function model(node, get) {
       node.value = get();
       const on = () => node.dispatchEvent; // noop guard
       const handler = (e) => node.__set?.(e.target.value);
       node.addEventListener('input', handler);
       return {
         update(next) { if (node.value !== next) node.value = next; },
         destroy() { node.removeEventListener('input', handler); },
       };
     }
   </script>
   ```

   (In practice the simplest robust form is a tiny `.svelte` wrapper, below.)

2. **A thin `.svelte` wrapper component** that exposes a real `bind:value`, because
   `bind:` *does* work on Svelte components:

   ```svelte
   <!-- UField.svelte -->
   <script>
     export let value = '';
   </script>
   <u-field {value} on:input={(e) => (value = e.target.value)} {...$$restProps}>
     <slot />
   </u-field>
   ```

   Consumer then writes `<UField bind:value={name} />` and gets true two-way binding.

### `bind:this` for imperative access

`bind:this` works on custom elements and is the escape hatch for imperative APIs / forcing
properties:

```svelte
<script>
  let el;
  $effect(() => { if (el) el.complexProp = bigObject; }); // Svelte 5 rune
  // Svelte 4: onMount(() => { el.complexProp = bigObject; });
</script>
<u-typeahead bind:this={el} />
```

---

## Events (CustomEvent) handling

### Use `on:eventname` — it is `addEventListener` under the hood

The legacy `on:` directive compiles to `addEventListener('eventname', handler)` and works
for **arbitrary event names**, including the library's events:

```svelte
<u-field   on:input={(e) => value = e.target.value} on:change={onCommit} />
<u-chip    on:remove={(e) => removeChip(e)} />
<u-typeahead on:selected={(e) => pick(e.detail)} />
<u-dialog  on:close={onClose} on:closed={afterClose} />
```

- `e.target` is the `u-*` element; for `CustomEvent` payloads read `e.detail`.
- Works identically in Svelte 4 and Svelte 5 (deprecated but fully supported in 5).

### Svelte 5 specifics

- In runes mode, lowercase events also accept the **attribute form** `onchange={…}` /
  `oninput={…}`, which likewise attaches a native listener for custom elements.
- **Hyphenated event names** (e.g. a hypothetical `u-change`) have **no valid
  `on*` attribute form** (`onu-change` is not a legal identifier). For those, **`on:` is
  mandatory** (`on:u-change={…}`). Recommend the library keep dispatching simple,
  hyphen-free event names (it does) so both syntaxes stay available.
- **Event delegation caveat:** some built-in `onevent` attributes are *delegated* to the
  root in Svelte 5. If a consumer calls `stopPropagation()` in a child, a delegated handler
  may never fire. Custom-element listeners added via `on:` are **not** delegated, so this
  mostly affects native events — worth a one-line note.
- `createEventDispatcher` is deprecated in Svelte 5 (Svelte→Svelte component events), but
  that is irrelevant here: custom elements emit real DOM `CustomEvent`s, which are the
  native, non-deprecated path.

### Why this library's events "just work"

The components dispatch native DOM events that cross the shadow boundary:

| Component(s)              | Event(s)                          | Flags |
| ------------------------- | --------------------------------- | ----- |
| `u-field`-family inputs   | `input` (`InputEvent`), `change`  | `input`: `bubbles + composed`; `change`: `bubbles` |
| `u-chip`                  | `change`, `remove` (`CustomEvent`)| `bubbles` |
| `u-chip-field`            | `change`, `remove` (`CustomEvent`)| `bubbles` |
| `u-typeahead`             | `input`, `change`, `selected` (`CustomEvent` w/ `detail`) | `input`: `bubbles + composed` |
| `u-calendar`/`u-datepicker`| `input`, `change`                | `input`: `bubbles + composed` |
| `u-dialog`                | `cancel`, `close`, `closed`       | `cancel`/`close`: `cancelable` |
| `u-menu`                  | `open`, `close`, `opened`         | `open`/`close`: `cancelable` |

The `composed: true` on `input` is what lets the value escape the shadow root and reach
Svelte's listener — confirmed present, so no extra config is required on the consumer side.

---

## Svelte 5 runes implications

- **Props are plain values now** (`let value = $state('')`). Pass them straight into the
  custom element; reads/writes through `$state` integrate with the prop-in / event-out
  pattern with no special handling.
- **Prefer `$effect` over `onMount`** for imperatively setting properties via `bind:this`,
  so the effect re-runs when the source value changes:
  `$effect(() => { if (el) el.items = items; });`
- Runes mode does **not** change the custom-element prop/attribute heuristic or the
  `bind:value` limitation — both behave the same as legacy mode.
- The event attribute form (`onclick`, `oninput`) is the runes-idiomatic style for native
  names, but `on:` remains valid and is required for hyphenated/odd event names.

---

## Typing custom elements in Svelte (TypeScript)

Two supported approaches. Ship one of these as a `.d.ts` in the package (and document it).

### Option A — augment `svelte/elements` (recommended, modern)

```ts
// src/universal-material-web.d.ts  (in the CONSUMER app, or shipped by the library)
import type { HTMLAttributes } from 'svelte/elements';

declare module 'svelte/elements' {
  export interface SvelteHTMLElements {
    'u-button': HTMLAttributes<HTMLElement> & {
      variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
      disabled?: boolean;
    };
    'u-field': HTMLAttributes<HTMLElement> & {
      value?: string;
      label?: string;
      'on:input'?: (e: CustomEvent | InputEvent) => void;
      'on:change'?: (e: Event) => void;
    };
    // … one entry per u-* element
  }
}

export {};
```

### Option B — `svelteHTML` namespace (also works; used by older setups)

```ts
declare namespace svelteHTML {
  interface IntrinsicElements {
    'u-field': {
      value?: string;
      'on:input'?: (e: CustomEvent<any>) => void;
    };
  }
}
```

**Placement:** put the `.d.ts` **inside the consumer's `src/`** and ensure
`tsconfig.json` `"include": ["src/**/*"]` (or an explicit `files`/`types` reference) picks
it up. svelte-check / the Svelte language server then type-check `u-*` tags and their
attributes/events in `.svelte` files. A library can ship this file and tell consumers to
`/// <reference types="@universal-material/web/svelte" />` or add it to `types`.

**Reality check:** without these declarations, `<u-field>` still *renders and works* — you
just lose attribute/event autocompletion and get "unknown element" type noise. So typing is
a DX nicety, not a correctness requirement.

---

## Build tooling

- **No special build step.** `@sveltejs/vite-plugin-svelte` / SvelteKit compile `.svelte`
  files that reference custom elements with zero extra config. Just `npm i` the library and
  `import '@universal-material/web'` once (side-effect import that runs
  `customElements.define`).
- **Where to register:** a top-level side-effect import in the app entry (or a root
  `+layout.svelte`/`+layout.ts`) guarantees elements are defined before use — important for
  the prop-in-node heuristic (above).
- **SSR / SvelteKit:** `customElements` and `HTMLElement` are browser-only. Importing a
  custom-elements bundle at module top level on the server throws
  `HTMLElement is not defined` / `window is not defined`. Guard it:
  - register inside `onMount` (runs client-only), **or**
  - guard with SvelteKit's `browser` flag: `import { browser } from '$app/environment';
    if (browser) await import('@universal-material/web');`, **or**
  - set `export const ssr = false;` on pages that must render the elements (last resort;
    loses SSR). The elements render client-side after hydration; SSR emits the bare custom
    tag, which is fine for non-critical content.
- **`customElement: true` is irrelevant here.** That Svelte compiler option is for
  *authoring* Svelte components as custom elements, not for *consuming* third-party ones.
  Do not enable it.

---

## A bind sketch (the recommended consumer pattern, end to end)

```svelte
<script lang="ts">
  // 1) Register once (client-only in SvelteKit; top-level is fine in plain Vite SPA).
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  onMount(() => { if (browser) import('@universal-material/web'); });

  // Svelte 5 runes:
  let name = $state('');
  let tags = $state<string[]>(['a', 'b']);

  // Svelte 4 equivalent: `let name = '';` `let tags = ['a','b'];`
</script>

<!-- WRITE: value flows in as a property (object/array pass by reference once upgraded). -->
<!-- READ:  on:input / on:change flow out; e.target is the <u-field>. -->
<u-field
  {name}
  value={name}
  on:input={(e) => (name = (e.target as HTMLInputElement).value)}
  on:change={(e) => console.log('committed', name)}
/>

<u-typeahead
  value={name}
  items={tags}
  on:selected={(e: CustomEvent) => (name = e.detail)}
/>

<p>name = {name}</p>
```

For a true `bind:value`, wrap once and bind to the wrapper (Svelte components support `bind:`):

```svelte
<!-- UField.svelte -->
<script lang="ts">
  export let value = '';
</script>
<u-field {value} on:input={(e) => (value = (e.target as HTMLInputElement).value)}>
  <slot />
</u-field>

<!-- App.svelte -->
<UField bind:value={name} />
```

---

## Gotchas (quick list)

1. **`bind:value` does not work on `u-*` elements** — use prop-in + `on:input`/`on:change`,
   or a thin `.svelte` wrapper to expose a real `bind:value`.
2. **Prop-vs-attribute is timing-sensitive.** If the element isn't defined yet,
   `prop in node` is false and Svelte sets an *attribute*, mangling objects. Register the
   library eagerly; or set objects via `bind:this`/`use:setProperties`.
3. **Never expose `on*`-prefixed attributes/props** — Svelte parses them as event listeners
   (`oneworld` → `addEventListener('eworld', …)`).
4. **SSR breaks on top-level import** (`HTMLElement is not defined`). Register in `onMount`
   or behind `browser`, or `ssr = false` the page.
5. **Hyphenated event names require `on:`** (no `onfoo-bar` attribute form). Library uses
   simple names, so both `on:change` and `onchange` work — prefer `on:` for portability.
6. **`composed: true` is required for shadow-DOM events to reach Svelte** — this library
   already sets it on `input`; verify any new events do too.
7. **`createEventDispatcher` deprecation (Svelte 5)** is a *component-event* concern, not a
   custom-element one — ignore it for this integration.
8. **Delegated `onevent` + `stopPropagation`** can swallow events in Svelte 5; `on:`
   listeners on custom elements are not delegated, so they're unaffected.

---

## Official tooling / references

- Svelte — Custom elements: https://svelte.dev/docs/svelte/custom-elements
- Svelte — `bind:`: https://svelte.dev/docs/svelte/bind
- Svelte — `on:` (legacy directive): https://svelte.dev/docs/svelte/legacy-on
- Svelte 5 migration guide (events / `createEventDispatcher`): https://svelte.dev/docs/svelte/v5-migration-guide
- Svelte — TypeScript / typing custom elements (`svelte/elements`, `svelteHTML`): https://svelte.dev/docs/svelte/typescript
- CSS-Tricks — Using Custom Elements in Svelte (property/attribute rules, `setProperties`/`setAttributes` actions): https://css-tricks.com/using-custom-elements-in-svelte/
- Issue: enable `bind:value` on custom elements — https://github.com/sveltejs/svelte/issues/3566
- Issue: allow binding to custom elements — https://github.com/sveltejs/svelte/issues/6484
- Issue: Svelte 5 prop→attribute mapping inconsistent — https://github.com/sveltejs/svelte/issues/13785
- Issue: unable to set custom element property instead of attribute — https://github.com/sveltejs/svelte/issues/15455
- SvelteKit — web components & SSR — https://github.com/sveltejs/kit/issues/2666
- (Note: lit.dev has no dedicated "Svelte" framework page — `https://lit.dev/docs/frameworks/svelte/` is 404. Lit's general "Frameworks" guidance applies, but Svelte needs no Lit-specific wrapper.)
