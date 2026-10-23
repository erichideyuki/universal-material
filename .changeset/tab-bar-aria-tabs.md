---
"@universal-material/web": patch
---

Expose the ARIA tabs pattern on `u-tab-bar`/`u-tab`: the container that holds the tabs is a `tablist`, each tab's inner button has `role="tab"`, and `aria-selected` follows the active tab (clicks and `activeTab`/`activeTabIndex`). Screen readers now announce "tab, selected, 2 of 3" instead of a plain button. `ButtonWrapper` gains a protected `getAriaSelected()` method (default `null`, no attribute) for subclasses whose role supports selection. Keyboard behavior is unchanged: every tab stays in the Tab order, without arrow-key navigation.
