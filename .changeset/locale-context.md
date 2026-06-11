---
"@universal-material/web": minor
"@universal-material/angular": minor
---

Add a locale context for locale-aware components. The web package exposes `localeContext` and the `provideLocale(contextRoot, locale)` helper; calendars and datepickers now resolve their locale as: explicit `locale` property → surrounding context → `navigator.language`. The Angular package adds the `[uLocale]` directive, which provides the context to every descendant component.
