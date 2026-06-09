# Demo: remove the datepicker page (module deleted)

## Scope
`demo/src/app/components/datepicker/**` + the datepicker route + the datepicker nav entry.

## Context
The datepicker demo page (`datepicker.component.ts`, `datepicker-example/*`) demonstrates the deleted Angular
datepicker module. Remove the page. (Native `<u-datepicker>`/`<u-range-datepicker>` + the new
`UmDatepickerControlValueAccessor` remain for consumers.)

## Changes
- Delete `demo/src/app/components/datepicker/` entirely.
- `demo/src/app/app.routing.ts`: remove the `{ path: 'datepicker', loadComponent: ... }` route object.
- `demo/src/app/navigation/navigation.component.html`: remove the `routerLink="datepicker"` list item (line ~8).

## Acceptance / Verify
```
grep -rniE "datepicker" demo/src/app/app.routing.ts demo/src/app/navigation/navigation.component.html   # no matches
test ! -d demo/src/app/components/datepicker && echo OK
```
> Shared files — apply serially with the other demo tasks.
