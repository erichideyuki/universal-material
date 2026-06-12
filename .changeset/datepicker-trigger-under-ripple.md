---
"@universal-material/web": patch
---

Fix the datepicker popover not opening on a real user click — the ripple overlay sat on top of the invisible trigger button and swallowed the click. The trigger is now slotted inside the ripple (the layout the ripple's `::slotted` styles were designed for), so clicks reach the trigger and the ripple still animates from the bubbled press.
