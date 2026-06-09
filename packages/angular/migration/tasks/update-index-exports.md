# Update `src/index.ts` — drop deleted components, register new CVAs

## Scope
`src/index.ts` **only**. SOLE editor of this file — run AFTER the four deletions and the two new CVAs exist.

## Context
Deleted: `collapse`, `slider`, `expansion-panel`(+container), `datepicker` module. Added:
`slider-control-value-accessor.ts` (`UmSliderControlValueAccessor`) and
`datepicker-control-value-accessor.ts` (`UmDatepickerControlValueAccessor`).

## Changes
**Remove**
- `import { ... DatepickerModule ... } from './datepicker/datepicker.module'` (top import, line ~7).
- `import { CollapseComponent } from './collapse/collapse.component'` (line ~16).
- `DatepickerModule` and `CollapseComponent` entries in the `UniversalMaterialModules` array.
- The `export {... Datepicker ...}` block (lines ~55-64), the `export { CollapseComponent }` block (~66-68),
  `export * from './slider/slider.component'` (~71), and the two expansion-panel `export *` lines (~74-75).

**Add**
- Imports next to the other CVAs:
  ```ts
  import { UmSliderControlValueAccessor } from './value-accessors/slider-control-value-accessor';
  import { UmDatepickerControlValueAccessor } from './value-accessors/datepicker-control-value-accessor';
  ```
- Add both to the `FormComponents` array (so they're declared + exported by `UniversalMaterialModule`).
- Re-export both:
  ```ts
  export * from './value-accessors/slider-control-value-accessor';
  export * from './value-accessors/datepicker-control-value-accessor';
  ```

## Acceptance
- `src/index.ts` references no `collapse`/`slider`/`expansion-panel`/`datepicker` paths.
- New CVAs imported, in `FormComponents`, and re-exported.

## Verify
```
grep -nE "collapse|slider/slider.component|expansion-panel|datepicker/datepicker.module" src/index.ts   # no matches
grep -nE "SliderControlValueAccessor|DatepickerControlValueAccessor" src/index.ts                        # present
```
