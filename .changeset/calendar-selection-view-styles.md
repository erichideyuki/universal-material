---
"@universal-material/web": patch
---

Fix the calendar year and month selection views rendering unstyled — the cells had no grid or pill styles and overflowed the popover. Both views now render a 3-column grid with Material pill cells (outlined current, filled selected), and the header chevron rotates while a selection view is open.
