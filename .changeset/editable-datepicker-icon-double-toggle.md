---
"@universal-material/web": patch
---

Fix the calendar popover never opening from the trailing icon button in editable datepickers — the icon button's click handler and the trailing-slot click listener both toggled the menu, so a single click opened and immediately closed it. The slot listener is now the single toggle path.
