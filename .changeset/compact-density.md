---
"@universal-material/web": minor
---

Add a desktop **compact** density mode. Call `provideCompact()` once during app setup to register a `compactContext` provider on `document.body` (pass a narrower element to scope it, or `false` to start comfortable) and every density-aware component switches to a denser layout. Components also accept a `compact` boolean attribute that overrides the inherited context (resolution order: own `compact` → context → `false`).

Affected components:

- **Buttons** (`u-button`, `u-icon-button`) — a compact context flips the default `size` from `small` to `extra-small` (no `compact` attribute; an explicit `size` still wins).
- **Fields** (`u-text-field`, `u-text-area`, `u-select`, `u-chip-field`, `u-button-field`, `u-search`, `u-datepicker`, `u-range-datepicker`, `u-typeahead`) — control height `56px → 48px` (denser box; the floating label keeps its type).
- **Rows** — `u-list-item` (and `u-checkbox-list-item` / `u-radio-list-item` / `u-switch-list-item`), `u-menu-item`, `u-drawer-item`, `u-overflow-menu` `56px → 40/44/32px`.
- **`u-chip`** `32px → 28px`, **`u-tab`** `48/64px → 40/48px`, **`u-expansion-panel`** header `48px → 40px`.

Every compact dimension is a dedicated CSS variable (`--u-field-compact-min-height`, `--u-list-item-compact-min-height`, `--u-menu-item-compact-height`, `--u-chip-compact-height` / `--u-chip-compact-padding`, `--u-tab-compact-height` / `--u-tab-compact-with-icon-height`, `--u-drawer-item-compact-height`, `--u-expansion-panel-compact-header-min-height` / `--u-expansion-panel-compact-header-padding`, `--u-overflow-menu-compact-items-height`, `--u-field-compact-vertical-padding`) — the compact styles never override the base `--u-*` tokens, so a consumer's comfortable-size customization and the compact size stay independent.
