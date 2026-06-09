# Delete Angular `expansion-panel` (conflicts with native `u-expansion-panel`)

## Scope
`src/expansion-panel/**` only. Demo removal is in `demo-remove-expansion-panel.md`. Index edits in `update-index-exports.md`.

## Context
Web 3.9.0 registers `<u-expansion-panel>` and `<u-expansion-panel-container>` natively.
Angular `ExpansionPanelComponent` (`selector: 'u-expansion-panel'`) and
`ExpansionPanelContainerComponent` (`selector: 'u-expansion-panel-container'`) collide.

## Changes
- Delete the entire `src/expansion-panel/` directory, including:
  - `src/expansion-panel/expansion-panel.component.ts` (+ `.spec.ts`, `.html`, `.scss`)
  - `src/expansion-panel/expansion-panel-container/expansion-panel-container.component.ts` (+ `.spec.ts`, `.html`, `.scss`)

## Acceptance
- `src/expansion-panel/` no longer exists.

## Verify
```
grep -rn "expansion-panel" src   # only src/index.ts may remain until the index task runs
```
