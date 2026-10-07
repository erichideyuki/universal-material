---
"@universal-material/web": patch
---

Fix the calendar selection band (`u-range-calendar`, and the new `u-week-calendar`) disappearing on opaque surfaces. The band is a `z-index: -1` pseudo-element, but the day cell had no stacking context of its own, so the band escaped behind an opaque ancestor (e.g. a filled card) and the range looked like two disconnected endpoints. The day cell now establishes its own stacking context (`isolation: isolate`) so the band always paints above the host surface and below the day number.
