---
"@universal-material/web": patch
"@universal-material/angular": patch
---

Add `value-type` (`'iso'` default | `'date'`) to the date components. With `value-type="date"`, `value` reads as `Date` objects (`{ start, end }` on the range components) instead of ISO strings; the setter accepts either form regardless and forms keep submitting the ISO string. The Angular `uStartDate`/`uEndDate` accessors and the min/max validators understand both modes.
