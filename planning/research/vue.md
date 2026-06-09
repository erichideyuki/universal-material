# Consuming a Lit custom-elements library from Vue 3

> Scope: how a Vue 3 app consumes `<u-*>` Lit components from `@universal-material/web`,
> with emphasis on the **value-binding / `v-model` story**. Lit components are *plain
> custom elements* — there is nothing Vue-specific about them — so everything below is
> standard "Vue + native custom element" behavior plus a couple of Lit-friendly conventions.
> Vue 3 has **first-class, well-documented** custom-element interop; the integration is
> light and mostly a matter of compiler config + knowing the `v-model` expansion rules.

---

## TL;DR / recommendation

- **Documentation-only is the right default.** Ship a short "Using with Vue" guide, not a
  wrapper package. Vue 3's custom-element support is good enough that a thin
  `defineComponent` wrapper per component buys little and adds a maintenance/version-coupling
  burden. (Contrast with React 18 and earlier, where wrappers were genuinely needed —
  Vue does not have that problem.)
- The **one mandatory step** consumers must do is tell the Vue template compiler that
  `u-*` tags are custom elements via `compilerOptions.isCustomElement` (otherwise Vue logs
  `Failed to resolve component: u-button`). Everything else (prop→DOM-property binding,
  event listening) works out of the box.
- **`v-model` works**, but you must understand that on a custom element Vue treats it like a
  **native element**, i.e. it expands to `:value` + `@input`. If your component's two-way
  property isn't named `value` or doesn't dispatch `input`, use a **`v-model` argument**
  (`v-model:checked`) or fall back to explicit `:prop` + `@event`.
- Provide **TypeScript types** via a `GlobalComponents` augmentation so templates get
  autocomplete and type-checking. This is cheap and high-value; ship it as an optional
  `.d.ts` or a documented snippet.

---

## What to build

Concretely, deliver these (in priority order):

1. **A "Using with Vue 3" docs page** covering: the `isCustomElement` Vite snippet, importing
   the library for side effects, prop binding, event handling, and the `v-model` rules below.
   This is the load-bearing deliverable.
2. **An optional TypeScript type-augmentation file** (`vue.d.ts` snippet or a shipped
   `*/vue` types entry) that augments `vue`'s `GlobalComponents` so `<u-button>` etc. are
   typed in templates. Generate it from the same JSDoc/`@property` metadata the project
   already uses for `docs:apis`.
3. **(Optional, only if demand appears) thin `defineComponent` wrappers.** Most teams won't
   need them. Document the escape hatch instead of shipping it. See "Wrappers vs docs" below.

You do **not** need: a Vue plugin, `app.use(...)` install, a separate build target, or
`@vitejs/plugin-vue` changes inside *this* repo — the config lives in the *consumer's* app.

---

## How

### 1. Configure the compiler so `u-*` tags are custom elements (REQUIRED)

`isCustomElement` is a **compile-time** option, so it must be passed through the build tool,
not at runtime (runtime form only works with the in-browser/runtime compiler).

**Vite + `@vitejs/plugin-vue` (the canonical setup):**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Treat every <u-*> tag as a custom element (skip Vue component resolution)
          isCustomElement: (tag) => tag.startsWith('u-'),
        },
      },
    }),
  ],
})
```

Recommend the `tag.startsWith('u-')` predicate (precise) over the broad
`tag.includes('-')` (which would also swallow any dashed Vue component name).

**Vue CLI / webpack (`vue-loader`) — for completeness:**

```js
// vue.config.js
module.exports = {
  chainWebpack: (config) => {
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap((options) => ({
        ...options,
        compilerOptions: { isCustomElement: (tag) => tag.startsWith('u-') },
      }))
  },
}
```

**Runtime/in-browser compiler only** (no build step — Vue 2 `ignoredElements` moved here in
Vue 3):

```js
app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('u-')
```

Then import the library once for its side effects (the `@customElement('u-...')`
registrations) — typically in `main.ts`:

```ts
import '@universal-material/web' // registers all <u-*> custom elements
```

### 2. Binding props / DOM properties

Vue 3 is smart about custom elements: when it sets a binding, it **checks whether the key
exists as a DOM property** on the element (an `in` check) and, if so, sets it as a **DOM
property**; otherwise it sets an **attribute**. Because Lit components reflect their
`@property` declarations as real DOM properties, plain `:prop` binding "just works" for
strings, booleans, numbers, **and** objects/arrays:

```html
<u-button :disabled="isDisabled">Save</u-button>
<u-list :items="rows"></u-list>        <!-- object/array passed as a DOM property -->
```

Two override modifiers exist for the rare cases where the heuristic guesses wrong:

- **`.prop`** — force a DOM property. Shorthand is a leading dot.
  ```html
  <u-element :user.prop="{ name: 'jack' }"></u-element>
  <u-element .user="{ name: 'jack' }"></u-element>   <!-- shorthand -->
  ```
- **`.attr`** — force an HTML attribute (string-coerced).
  ```html
  <u-element :aria-label.attr="label"></u-element>
  ```

Guidance for consumers: prefer plain `:prop`. Reach for `.prop` only when passing complex
data to a property the `in` check misses, and `.attr` only when you specifically need the
value reflected as a string attribute (e.g. an attribute the component reads via
`attributeChangedCallback` but doesn't expose as a property).

### 3. Listening to events

Custom-element events are listened to with `@event-name`. Read the payload off the native
event (`$event.detail` for Lit `CustomEvent`s, or `$event.target.value` for value-ish
events):

```html
<u-select @change="onChange($event)"></u-select>
<u-field @input="text = $event.target.value"></u-field>
```

### 4. The `v-model` / value-binding story (the important part)

**Key fact:** Vue's template compiler decides how to expand `v-model` based on whether the
tag is a **component** or a **plain element**. A tag matched by `isCustomElement` is a plain
element, so `v-model` uses the **native-element expansion**, *not* the component
(`modelValue` / `update:modelValue`) expansion.

On a native/custom element, the default `v-model` expands to:

```html
<u-field v-model="text" />

<!-- compiles to -->
<u-field :value="text" @input="text = $event.target.value" />
```

So **default `v-model` on a custom element works iff** the component:
- exposes a `value` DOM property (so `:value` binds), and
- dispatches an `input` event whose `target.value` holds the new value.

That's the native-input contract. If your component follows it (text-field-like
components typically do), `v-model="x"` works with zero extra code.

When the component **doesn't** match that contract — different property name, or it fires
`change` instead of `input`, or the payload lives on `event.detail` — use one of these:

**(a) `v-model` with an argument** to target a different prop + matching `update:` event.
On a custom element `v-model:foo` binds `:foo` and listens for `@update:foo`:

```html
<u-checkbox v-model:checked="agreed" />
<!-- ≈  :checked="agreed" @update:checked="agreed = $event" -->
```

This only helps if the component emits the `update:foo` event Vue expects. Most third-party
custom elements emit DOM-native events (`change`, `input`) instead, so in practice…

**(b) explicit `:prop` + `@event`** is the most robust, dependency-free pattern and the one
to lead with in docs:

```html
<!-- checkbox firing a native `change` with the value on event.target.checked -->
<u-checkbox
  :checked="agreed"
  @change="agreed = $event.target.checked"
/>

<!-- select: value lives on the element via native `change` (NOT composed, no `detail`) -->
<u-select
  :value="choice"
  @change="choice = $event.target.value"
/>
```

**Modifiers note:** the native `v-model` modifiers `.lazy` (listen on `change` not `input`),
`.number`, and `.trim` apply to the native expansion. `.lazy` is the clean way to make a
default `v-model` listen to `change` instead of `input` — but it still reads
`$event.target.value`, so it only helps when the value lives there.

> Recommendation for this library: make value-bearing inputs follow the **native contract**
> (a `value` property + an `input` (live) and/or `change` (committed) event whose
> `target.value`/`target.checked` carries the value). That makes `v-model` "just work" for
> consumers and matches the project's existing "native `<select>`/`<input>` parity" stance
> (e.g. the recent `u-select` native-`<select>` parity commit). Document which event each
> component dispatches and where the value lives.

### 5. Typing components for the template compiler (TypeScript)

Without typings, `<u-button>` in a `.vue` template is untyped (works at runtime, no
IntelliSense / type errors). Augment Vue's `GlobalComponents` with a small helper Vue
itself documents for **non-Vue web components**:

```ts
// vue-shims.d.ts  (ship this, or document it)
import type {
  HTMLAttributes,
  PublicProps,
  EmitFn,
} from 'vue'

// --- Vue's recommended helper for non-Vue custom elements ---
type EventMap = { [event: string]: Event }
type VueEmit<T extends EventMap> = EmitFn<{ [K in keyof T]: (event: T[K]) => void }>

type DefineCustomElement<
  ElementType extends HTMLElement,
  Events extends EventMap = {},
  SelectedAttributes extends keyof ElementType = keyof ElementType,
> = new () => ElementType & {
  /** @deprecated template prop types only — do not use on a ref */
  $props: HTMLAttributes & Partial<Pick<ElementType, SelectedAttributes>> & PublicProps
  /** @deprecated template prop types only — do not use on a ref */
  $emit: VueEmit<Events>
}

import type { Button } from '@universal-material/web' // the Lit class

declare module 'vue' {
  interface GlobalComponents {
    'u-button': DefineCustomElement<
      Button,
      { click: MouseEvent }        // events → typed @click etc.
      // optionally narrow the 3rd param to the public @property names
    >
    // 'u-select': DefineCustomElement<Select, { change: CustomEvent }>
    // ...one entry per component
  }
}

export {}
```

Notes:
- Pass the **element class** (the Lit `Button`), whose `@property` fields become typed
  template props via `Pick<ElementType, SelectedAttributes>`.
- The third type param lets you restrict which properties show up as template props
  (e.g. only public `@property` names, not every `HTMLElement` member).
- For JSX/TSX consumers, augment `JSX.IntrinsicElements` instead of `GlobalComponents`.
- This is exactly the kind of file you can **codegen** from the project's existing JSDoc/
  `@property` analysis (the `docs:apis` pipeline) — one `GlobalComponents` entry per
  `@customElement`.

### 6. Build tooling summary

- **Vite (recommended):** `@vitejs/plugin-vue` with the `compilerOptions.isCustomElement`
  predicate shown above. No other plugins needed. Vite handles the Lit ESM fine.
- **Vue CLI / webpack:** `vue-loader` `chainWebpack` tap (shown above).
- **Nuxt 3:** set it via `vue.compilerOptions.isCustomElement` in `nuxt.config.ts`
  (`{ vue: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('u-') } } }`),
  and import the library in a **client-only** plugin (see SSR gotcha).
- The consumer does **not** need to transpile the library's decorators — they consume the
  already-built `dist/` ESM. Lit's `experimentalDecorators` concern only applies to authors
  writing *their own* Lit components in the same project.

---

## Gotchas

1. **`isCustomElement` is compile-time.** Setting it at runtime
   (`app.config.compilerOptions.isCustomElement`) has **no effect** with a build step (Vite,
   Vue CLI) because templates are precompiled. It must go in the build config. Forgetting it
   produces `[Vue warn]: Failed to resolve component: u-button` and the tag may render as an
   unknown element.

2. **`v-model` is NOT `modelValue` here.** Because the tag is a custom element, Vue uses the
   **native** `v-model` expansion (`:value` + `@input`), *not* the component
   `modelValue`/`update:modelValue` expansion. People coming from Vue-component land expect
   `modelValue` and get confused. Lead the docs with `:prop` + `@event` and present
   `v-model` as sugar that only works when the component matches the native input contract.

3. **`v-model` ignores `value`/`checked`/`selected` HTML attributes in markup.** Vue treats
   the bound JS ref as the single source of truth; initial state must be set in script, not
   only via an attribute in the template. (True for native and custom elements alike.)

4. **Prop vs attribute surprises.** Vue's `in`-operator heuristic sets a DOM property when
   the key exists on the element, else an attribute. If a Lit `@property` isn't reflected /
   isn't present as a property at bind time, complex values may stringify into an attribute
   (`[object Object]`). Fix with `.prop` (force property) — or `.attr` for the inverse case.
   This was the crux of the real-world vuejs `#13718` Lit-in-Vue report.

5. **Boolean attribute coercion.** Passing a boolean to a *reflected* attribute can differ
   from setting the property (presence-based attributes). Prefer property binding
   (`:disabled="x"`) and ensure the component's boolean `@property` is the source of truth;
   use `.attr` only if you deliberately want attribute reflection.

6. **Event casing / `CustomEvent` payloads.** Vue listens to the exact event name you write
   in `@name`; DOM events are case-sensitive. Lit `CustomEvent`s carry data on
   `event.detail`, not `event.target.value` — wiring a `v-model`-style two-way bind to such a
   component requires explicit `@event="x = $event.detail..."`. Document the event name +
   payload location per component.

7. **SSR / Nuxt:** custom elements aren't defined on the server (no `customElements`
   registry in Node). Import the library and render `u-*` tags **client-side only**
   (e.g. Nuxt `.client.ts` plugin + `<ClientOnly>` or `import.meta.client` guards), or you'll
   hit `customElements is not defined` / hydration mismatches. Lit also ships shadow-DOM CSS
   inside JS, which duplicates styles under naive SSR. This library is client-targeted; just
   flag the client-only requirement.

8. **Don't over-broaden the predicate.** `isCustomElement: (tag) => tag.includes('-')` makes
   Vue stop resolving *any* dashed tag as a component — including legitimately-named Vue
   components (`<my-widget>`). Scope to the `u-` prefix.

9. **Two-way for non-`value` props needs a thought.** `v-model:checked` etc. only auto-works
   if the element emits `update:checked`. Third-party custom elements emit `change`/`input`,
   not `update:*`, so for checkboxes/switches/selects, `:checked` + `@change` (or a tiny
   wrapper, see below) is the reliable path.

---

## Official tooling / sources

- **Vue — "Vue and Web Components"** (custom-element interop, `isCustomElement` for Vite &
  Vue CLI, Passing DOM Properties `.prop`, `DefineCustomElement<>` TS helper +
  `GlobalComponents` augmentation, SSR notes):
  <https://vuejs.org/guide/extras/web-components.html>
- **Vue — "Component v-model"** (how `v-model` expands; native `<input>` →
  `:value` + `@input`; `v-model:arg`; modifiers; `defineModel`):
  <https://vuejs.org/guide/components/v-model.html>
- **Vue 3 Migration — "Custom Elements Interop"** (Vue 2 `ignoredElements` → Vue 3
  compile-time `isCustomElement`; `is`/`vue:` rules):
  <https://v3-migration.vuejs.org/breaking-changes/custom-elements-interop>
- **Vue — `v-bind` directive** (`.prop` / `.attr` modifiers):
  <https://vuejs.org/api/built-in-directives.html#v-bind>
- **`@vitejs/plugin-vue`** — the plugin that surfaces `template.compilerOptions`:
  <https://github.com/vitejs/vite-plugin-vue>
- **vuejs/discussions #13718** — real-world "external Lit components in Vue" prop/attr
  stripping report and the `.prop`/`.attr` resolution (LinusBorg):
  <https://github.com/orgs/vuejs/discussions/13718>

> Note: Lit's own site has a React framework guide (`@lit/react`) but **no dedicated Vue
> wrapper package** — the official Lit + Vue guidance is "Vue supports custom elements
> natively; configure `isCustomElement`," which is exactly the Vue docs above.

---

## Wrappers vs documentation-only

**Recommendation: documentation-only (+ optional types).** Reasons:

- Vue 3 binds props as DOM properties and listens to events on custom elements **natively** —
  the main thing wrappers solve in other frameworks is already handled.
- A `defineComponent` wrapper per component duplicates the API surface, couples the wrapper's
  version to the library's, and must be regenerated on every prop/event change — high upkeep
  for marginal ergonomic gain.
- The one genuine ergonomic gap is **`v-model` on non-native-contract props** (checkbox
  `checked` + `change`, select `value` + `change`-on-`detail`). That's better solved by
  (a) making components follow the native input contract, and (b) a documented `:prop`+`@event`
  snippet — not a whole wrapper layer.

**If a team really wants `v-model="x"` everywhere**, the escape hatch is a *tiny local*
wrapper they write (not something to ship):

```vue
<!-- UCheckbox.vue — consumer-side convenience wrapper, optional -->
<script setup lang="ts">
const model = defineModel<boolean>()      // Vue 3.4+
</script>

<template>
  <u-checkbox
    :checked="model"
    @change="model = ($event.target as any).checked"
  />
</template>
```

Document this pattern; don't ship N of them. If, later, real consumer demand appears, the
library could codegen wrappers from the same metadata that drives `docs:apis` — but start
with docs + types.

---

## v-model code sketch (consumer-facing, end-to-end)

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue({ template: { compilerOptions: {
    isCustomElement: (tag) => tag.startsWith('u-'),
  } } })],
})
```

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import '@universal-material/web'   // side-effect: registers all <u-*> elements
createApp(App).mount('#app')
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { ref } from 'vue'
const name    = ref('Ada')      // text field — follows native value/input contract
const agreed  = ref(false)      // checkbox  — native `change` + target.checked
const choice  = ref('a')        // select    — native input/change; value on target.value
</script>

<template>
  <!-- 1. Native-contract input: v-model "just works" (-> :value + @input) -->
  <u-field v-model="name" label="Name" />

  <!-- 2. Equivalent explicit form (what (1) compiles to) -->
  <u-field :value="name" @input="name = ($event.target as any).value" />

  <!-- 3. Checkbox: no native `value`/`input` contract -> explicit :prop + @event -->
  <u-checkbox
    :checked="agreed"
    @change="agreed = ($event.target as any).checked"
  >I agree</u-checkbox>

  <!-- 4. Select: native `input`/`change` (not composed, no `detail`); value on target.value -->
  <u-select
    :value="choice"
    @change="choice = ($event.target as any).value"
  >
    <u-option value="a">A</u-option>
    <u-option value="b">B</u-option>
  </u-select>

  <!-- 5. v-model with an ARGUMENT (only if the element emits `update:checked`) -->
  <!-- <u-checkbox v-model:checked="agreed" /> -->

  <p>{{ name }} / {{ agreed }} / {{ choice }}</p>
</template>
```

**Mental model to put in the docs, one line:**
> On a `u-*` custom element, `v-model="x"` ≡ `:value="x" @input="x = $event.target.value"`.
> If the component doesn't expose `value` + `input`, bind `:prop` and `@event` explicitly
> (or `v-model:arg` when the element emits `update:arg`).
