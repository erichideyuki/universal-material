# Demo: remove the slider page (component deleted)

## Scope
`demo/src/app/components/slider/**` + the slider route + the slider nav entry.

## Context
The slider demo page imports the deleted `SliderComponent` from `@universal-material/angular`
(`slider-example.component.ts`), and the page is routed/linked. With the Angular slider gone, remove the page.
(Native `<u-slider>` + the new `UmSliderControlValueAccessor` remain available to consumers; a native showcase
can be re-added later.)

## Changes
- Delete `demo/src/app/components/slider/` entirely.
- `demo/src/app/app.routing.ts`: remove the `{ path: 'slider', loadComponent: ... }` route object.
- `demo/src/app/navigation/navigation.component.html`: remove the `routerLink="slider"` list item (line ~11).

## Acceptance / Verify
```
grep -rniE "slider" demo/src/app/app.routing.ts demo/src/app/navigation/navigation.component.html   # no matches
test ! -d demo/src/app/components/slider && echo OK
```
> Shared files (`app.routing.ts`, `navigation.component.html`) — apply serially with the other demo tasks.
