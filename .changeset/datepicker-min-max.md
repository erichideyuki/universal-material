---
"@universal-material/web": patch
"@universal-material/angular": patch
---

Add `min`/`max` (ISO `YYYY-MM-DD`) to the date components. `u-calendar`/`u-range-calendar` disable out-of-range days, months, years and the nav arrows; `u-datepicker`/`u-range-datepicker` forward the bounds to the calendar popover (and to the native `input[type=date]` in editable mode) and report `rangeUnderflow`/`rangeOverflow` through constraint validation. The Angular package ships `UmDatepickerMinValidator`/`UmDatepickerMaxValidator`, which mirror the bounds into Angular forms as `min`/`max` errors while re-reflecting the attributes onto the element.
