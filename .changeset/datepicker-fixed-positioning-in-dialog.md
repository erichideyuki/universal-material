---
"@universal-material/web": patch
---

Fix the datepicker popover being clipped (effectively never showing) when the datepicker sits inside a dialog — the dialog's scrollable content swallowed the relatively-positioned popover. Datepickers and range datepickers now default to `menu-positioning="fixed"` when inside a `u-dialog`; an explicit `menu-positioning` attribute still wins.
