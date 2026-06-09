# Delete Angular `datepicker` module (conflicts with native `u-datepicker`)

## Scope
`src/datepicker/**` only. Demo removal in `demo-remove-datepicker.md`. Index edits in `update-index-exports.md`.

## Context
Web 3.9.0 ships native `<u-datepicker>` and `<u-range-datepicker>` (text-field-like, ISO string `value`,
fires `input`/`change`). The whole Angular datepicker module re-implements `u-datepicker`/`u-datepicker-input`/
`u-datepicker-content` and conflicts. Angular form binding is replaced by `datepicker-control-value-accessor.ts`
(`add-datepicker-cva.md`).

## Changes
- Delete the entire `src/datepicker/` directory (component, base, input, content, adapter, default-adapter,
  config/state/day/week/month/year models, module, and all `*.spec.ts`).

## Acceptance
- `src/datepicker/` no longer exists.
- No `DatepickerModule`/`DatepickerComponent`/`DatepickerAdapter`/etc. imports remain outside `src/index.ts`.

## Verify
```
grep -rniE "datepicker" src   # only src/index.ts may remain until the index task runs
```
