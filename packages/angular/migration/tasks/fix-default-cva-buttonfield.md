# Drop `u-button-field` from the default CVA selector (it has no value events)

## Scope
`src/value-accessors/default-control-value-accessor.ts` (selector only).

## Context
`UmDefaultControlValueAccessor extends DefaultValueAccessor`, which syncs on the `input` event.
Web 3.9.0 `ButtonField` (`src/button-field/button-field.ts`) has a `value` getter/setter only and
**dispatches no `input`/`change`** — its value changes via internal menu selection without events.
So binding `[(ngModel)]`/`formControl` to `u-button-field` through `DefaultValueAccessor` silently never
updates the control. It must not claim that selector.

`u-text-field`, `u-text-area`, `u-search` stay (they fire `input`). `u-datepicker` is handled by its own CVA.

## Changes
- In the `@Directive({ selector: ... })` string, remove the three `u-button-field[...]` clauses:
  `u-button-field[ngModel],u-button-field[formControlName],u-button-field[formControl],`
- Resulting selector keeps only `u-text-field`, `u-text-area`, `u-search` variants.

## Acceptance
- `default-control-value-accessor.ts` selector contains no `u-button-field`.
- `u-button-field` is documented as display-only (not a reactive-forms control).

## Verify
```
grep -n "u-button-field" src/value-accessors/default-control-value-accessor.ts   # no matches
```
