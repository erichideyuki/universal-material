---
"@universal-material/web": minor
---

`u-chip-field`'s `formatter` can now render rich chip labels. A returned string is rendered as HTML, sanitized with DOMPurify (the same treatment `DialogBuilder` gives its message, which strips custom elements); return an `HTMLElement` or a Lit `TemplateResult` to render web components, mirroring `u-typeahead`'s `template`. Values rendered without a formatter (e.g. typed text) stay plain text.

The formatter is now display only: native form submission sends each item's `toString()` instead of the formatter output, matching `u-typeahead`. String formatters that return user-provided text containing `<` or `&` should escape it, since it is now parsed as markup.
