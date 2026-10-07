---
description: Use u-chip, u-chip-set (groups), and u-chip-field (chip input) — including toggle vs clickable semantics for selectors.
---

# Chips

Three pieces:

- `<u-chip>` — a compact element representing an attribute, filter, or action.
- `<u-chip-set>` — groups chips with consistent spacing/wrapping.
- `<u-chip-field>` — text field that renders each entered value as a chip.

## Single chip

```html
<u-chip>Default</u-chip>

<u-chip>
  <span
    class="material-symbols-outlined"
    slot="leading-icon"
    >label</span
  >
  With icon
</u-chip>

<u-chip elevated>Elevated</u-chip>

<u-chip
  removable
  (remove)="onRemove($event)"
  >Removable</u-chip
>
```

## Selection: `clickable` vs `toggle`

This distinction matters and is easy to get wrong:

- **`clickable`** — chip fires `click` and shows ripple/hover. Use for **radio-like** patterns: combine with `[selected]="x === value"` + `(click)="x = value"` so one is always selected.
- **`toggle`** — chip flips its own `selected` state on click and emits `change`. Use for **independent boolean filters** where multiple can be on/off.

Radio-like (one of several):

```html
<u-chip-set>
  <u-chip
    clickable
    [selected]="format === 'short'"
    (click)="format = 'short'"
  >
    <span
      class="material-symbols-outlined"
      slot="icon-selected"
      >done</span
    >
    Short
  </u-chip>
  <u-chip
    clickable
    [selected]="format === 'long'"
    (click)="format = 'long'"
  >
    <span
      class="material-symbols-outlined"
      slot="icon-selected"
      >done</span
    >
    Long
  </u-chip>
</u-chip-set>
```

Independent filters:

```html
<u-chip-set>
  <u-chip
    toggle
    [(selected)]="showImages"
    >Images</u-chip
  >
  <u-chip
    toggle
    [(selected)]="showVideos"
    >Videos</u-chip
  >
  <u-chip
    toggle
    [(selected)]="showAudio"
    >Audio</u-chip
  >
</u-chip-set>
```

A plain `<u-chip>` (no `clickable`, no `toggle`) is a static informational chip — no ripple, no hover.

## `<u-chip-set>`

Spaces and wraps chips for you. No props needed for the basics. The chip's **`remove` event bubbles and composes**, so you can delegate on the set instead of wiring each chip:

```ts
chipSet.addEventListener("remove", (e) => {
  const chip = e.target; // the <u-chip> being removed
  // e.preventDefault() here to keep the chip in the DOM (drive removal from your own state)
});
```

## `<u-chip-field>` — chip input

A text field where each typed value (separated by Enter or comma) becomes a removable chip:

```html
<u-chip-field
  label="Tags"
  #tags
></u-chip-field>

<script>
  document.querySelector("u-chip-field").value = ["ts", "lit"];
  document.querySelector("u-chip-field").addEventListener("change", (e) => {
    console.log(e.target.value); // string[]
  });
</script>
```

For object-valued chips (e.g. typeahead-driven), set a `formatter` that maps each item to its label. It is display only — `value` and the submitted form data are untouched. A returned string is rendered as **HTML** (sanitized with DOMPurify, which strips custom elements); return an `HTMLElement` or a Lit `TemplateResult` to render web components:

```html
<u-chip-field label="Recipients" manual></u-chip-field>

<script>
  const chipField = document.querySelector("u-chip-field");

  chipField.formatter = (person) =>
    `<strong>${person.name}</strong> <span style="color: var(--u-color-on-surface-variant)">${person.email}</span>`;

  chipField.value = [{ name: "Ana", email: "ana@example.com" }];
</script>
```

## Compact density

`<u-chip>` takes a `compact` boolean attribute — or inherits it app-wide from `provideCompact(document.body)` — shrinking it `32 → 28px`. Retune with `--u-chip-compact-height` / `--u-chip-compact-padding`. See the **setup** skill for `provideCompact()`.

## Caveats

- Always include `<span slot="icon-selected">done</span>` on `clickable`/`toggle` chips so users see the check when selected.
- Don't use `toggle` for radio-like selectors — the user could deselect the only choice and the UI ends up in an invalid empty state.
- `<u-chip-field>` is form-associated; pair with a `<form>` for native submit.
- **The `remove` event bubbles and composes** — listen on the chip or delegate on the parent `<u-chip-set>`. The chip also **removes itself from the DOM** on remove unless you `preventDefault()` the event (do so when the chip's presence is driven by your own state).
- **`<u-chip-field>` value:** reassign `.value = [...]` to re-render (mutating the array in place does not). Use `add(value, triggerChange?)` / `removeAt(index, triggerChange?)` to mutate, and set a `formatter` (`value => string | HTMLElement | TemplateResult`) for object items — otherwise objects render as `[object Object]`. A string formatter output is HTML (DOMPurify strips scripts/handlers and custom elements, but escape user-provided text yourself if `<` or `&` must stay literal); without a formatter, values render as plain text. Native form submission sends each item's `toString()` — object items submit `[object Object]`, so read `.value` (or use the Angular accessor) instead. The `change` event only fires on user add/remove (or when `triggerChange` is true).
