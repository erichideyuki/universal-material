---
"@universal-material/angular": minor
---

Add a two-input binding option for `u-range-datepicker`, mirroring `mat-date-range-input`: hidden `input[uStartDate]`/`input[uEndDate]` carriers placed inside the element bind each end of the range to its own form control (`formControlName`/`ngModel`), while `UmRangeDatepickerDirective` combines/splits the element's `YYYY-MM-DD - YYYY-MM-DD` value and only disables the element when both ends are disabled.
