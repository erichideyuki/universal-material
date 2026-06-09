# Delete Angular `slider` component (conflicts with native `u-slider`)

## Scope
`src/slider/**` only. Demo removal in `demo-remove-slider.md`. Index edits in `update-index-exports.md`.

## Context
Web 3.9.0 registers `<u-slider>` natively (single `value` + range `valueStart`/`valueEnd`, fires
`input`/`change`). The Angular `SliderComponent` (`selector: 'u-slider'`) collides and its form
integration is superseded by the new `slider-control-value-accessor.ts` (`add-slider-cva.md`).

## Changes
- Delete the entire `src/slider/` directory:
  - `src/slider/slider.component.ts` (+ `.spec.ts`, `.html`, `.scss`).

## Acceptance
- `src/slider/` no longer exists.
- Form binding to `<u-slider>` is provided by the new CVA, not this component.

## Verify
```
grep -rn "slider/slider.component" src   # only src/index.ts may remain until the index task runs
```
