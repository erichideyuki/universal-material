# Rename `UmButtonColor`/`UmButtonVariant` → `ButtonColor`/`ButtonVariant`

## Scope
`src/dialog/confirm-dialog/confirm-dialog-config.model.ts` and
`src/dialog/confirm-dialog/confirm-dialog.service.ts`.

## Context
Web 3.9.0 exports `ButtonColor` and `ButtonVariant` types from `src/button/button.ts`
(`export type ButtonVariant = ...`, `export type ButtonColor = ...`). `Um`-prefixed aliases are gone.

## Changes
- `confirm-dialog-config.model.ts`
  - Line 5: `import { UmButtonColor, UmButtonVariant } from '@universal-material/web';` → `import { ButtonColor, ButtonVariant } from '@universal-material/web';`
  - Line 23: `variant?: UmButtonVariant;` → `variant?: ButtonVariant;`
  - Line 24: `color?: UmButtonColor;` → `color?: ButtonColor;`
- `confirm-dialog.service.ts`
  - Line 3: `import { ConfirmDialogBuilder, UmButtonColor, UmButtonVariant } from '@universal-material/web';` → `import { ConfirmDialogBuilder, ButtonColor, ButtonVariant } from '@universal-material/web';`
  - Lines 21, 29: `as UmButtonVariant` → `as ButtonVariant`
  - Lines 22, 30: `as UmButtonColor` → `as ButtonColor`

## Acceptance
- No `UmButtonColor`/`UmButtonVariant` tokens remain in either file.

## Verify
```
grep -rnE "UmButtonColor|UmButtonVariant" src/dialog   # no matches
```
