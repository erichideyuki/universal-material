---
"@universal-material/web": minor
---

Add `u-week-calendar` — an inline calendar that selects a whole week at a time. Clicking any day selects the week containing it, the week is highlighted as a continuous band, and hovering a day previews its week. It extends the shared calendar base, so `locale`, `min`/`max`, `month`/`year` and `value-type` all apply; `date-outside-month` defaults to `true` so weeks straddling a month boundary stay whole. The value is the week's start date (ISO `YYYY-MM-DD`, or a `Date` with `value-type="date"`), and the first weekday follows the locale.
