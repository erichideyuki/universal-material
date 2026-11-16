---
"@universal-material/web": minor
---

Make `u-fab-menu` accessible and controllable:

- **Toggle name and state**: `aria-label` on `u-fab-menu` now names the toggle FAB (rendered in the shadow root, it was nameless), and the toggle's button exposes `aria-expanded`. The toggle is `type="button"`, and the inner FAB that only reserves its size no longer puts a nameless button in the Tab order.
- **`open` is public**: a reflected boolean property/attribute, plus `show()`, `close()` and `toggle()`, with the same events as `u-menu`: cancelable `open`/`close` before the change and `opened`/`closed` after the animation.
- **Closing**: the menu closes when an item is clicked (unless the item's click handler calls `preventDefault()`), on Escape (focus returns to the toggle) and on a click outside it. When the clicked item had keyboard focus, focus also returns to the toggle. `focus()` on the host focuses the toggle.
- **Closed items are inert**: they leave the Tab order and the accessibility tree while the menu is closed (the visual transition is unchanged).

`ButtonWrapper` (every button-like component) now forwards `aria-expanded` from the host to its inner button/link and re-renders when `aria-label` or `aria-expanded` changes after the first render, so e.g. `<u-icon-button aria-label="More" aria-expanded="false">` works as a menu trigger.
