# Demo: remove the expansion-panel page (components deleted)

## Scope
`demo/src/app/components/expansion-panel/**` + the expansion-panel route + the nav entry.

## Context
The expansion-panel demo page imports the deleted `ExpansionPanelComponent` /
`ExpansionPanelContainerComponent`. Remove the page. (Native `<u-expansion-panel>` /
`<u-expansion-panel-container>` remain for consumers.)

## Changes
- Delete `demo/src/app/components/expansion-panel/` entirely.
- `demo/src/app/app.routing.ts`: remove the `{ path: 'expansion-panel', loadComponent: ... }` route object.
- `demo/src/app/navigation/navigation.component.html`: remove the `routerLink="expansion-panel"` list item (line ~18).

## Acceptance / Verify
```
grep -rniE "expansion-panel" demo/src/app/app.routing.ts demo/src/app/navigation/navigation.component.html   # no matches
test ! -d demo/src/app/components/expansion-panel && echo OK
```
> Shared files — apply serially with the other demo tasks.
