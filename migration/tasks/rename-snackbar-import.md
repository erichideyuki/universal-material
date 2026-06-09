# Rename `UmSnackbar` → `Snackbar` (web 3.9.0 dropped the `Um` prefix)

## Scope
`src/snackbar/snackbar.service.ts` only.

## Context
Web 3.9.0 exports the class as `Snackbar` (`src/snackbar/snackbar.ts` → `export class Snackbar`). The old
`UmSnackbar` no longer exists, so the import fails to compile.

## Changes
- Line 5: `import { UmSnackbar } from '@universal-material/web';` → `import { Snackbar } from '@universal-material/web';`
- Line 33: `const snackbar = UmSnackbar.show({` → `const snackbar = Snackbar.show({`

Do **not** rename the Angular service class itself.

## Acceptance
- No `UmSnackbar` token remains in the file; `Snackbar.show(...)` is used.

## Verify
```
grep -n "UmSnackbar" src/snackbar/snackbar.service.ts   # no matches
```
