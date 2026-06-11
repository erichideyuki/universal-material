---
"@universal-material/web": patch
---

Fix a TypeError in the dialog when it is disconnected in the same tick it was connected — the content ResizeObserver is created in a deferred task and `disconnectedCallback` called `disconnect()` on it unguarded. The observer is now skipped when the element is no longer connected and the disconnect is null-safe.
