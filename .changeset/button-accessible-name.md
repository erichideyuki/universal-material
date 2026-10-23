---
"@universal-material/web": patch
---

Fix the accessible name of `u-button`, `u-tab`, `u-chip`, `u-fab` (extended, with `label`) and `u-fab-menu-item`. Their inner `<button>`/`<a>` points `aria-labelledby` at `#text`, but only the drawer, menu, navigation-bar and navigation-rail items rendered that element, so screen readers (and `getByRole('button', { name })`) saw a nameless button. The visible label now carries `id="text"`; on a toggle `u-button` with a `label-selected` slot it moves to the selected label while selected. Icons stay out of the name, and `aria-label` (plus `aria-label-selected` on toggle buttons, now also on link buttons) still replaces the label. `u-icon-button` and an icon-only `u-fab` have no text and still need `aria-label`.
