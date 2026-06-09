# Delete Angular `collapse` (conflicts with native `u-collapse`)

## Scope
`src/collapse/**` only. Does **not** edit `src/index.ts` (see `update-index-exports.md`).

## Context
Web 3.9.0 registers `<u-collapse>` as a native custom element (`@customElement('u-collapse')`).
The Angular `CollapseComponent` declares `selector: 'u-collapse'` → dual-registration conflict.
No demo page exists for collapse (lib-only).

## Changes
- Delete the entire `src/collapse/` directory:
  - `src/collapse/collapse.component.ts`
  - `src/collapse/collapse.component.spec.ts`
  - any co-located `*.html` / `*.scss`.

## Acceptance
- `src/collapse/` no longer exists.
- No remaining `import ... from '.../collapse/collapse.component'` except in `src/index.ts` (handled by the index task).

## Verify
```
grep -rn "collapse/collapse.component" src   # only src/index.ts may remain (until index task runs)
```
