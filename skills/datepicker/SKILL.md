---
description: Use u-datepicker and u-range-datepicker — calendar popover for single or range date selection, with editable input mode, locales, and display formats.
---

# Date picker

`<u-datepicker>` (single date) and `<u-range-datepicker>` (date range) are form-associated text fields with a calendar popover. For inline-only usage, the library also exposes `<u-calendar>` and `<u-range-calendar>`.

## Single date

```html
<u-datepicker
  label="Date"
  placeholder="YYYY-MM-DD"
></u-datepicker>
```

By default the value reads as ISO `YYYY-MM-DD` (suitable for form submission) — see "Value type" below to read `Date` objects instead. The displayed value is formatted per the `format` prop.

## Display formats

```html
<u-datepicker
  label="Short"
  format="short"
></u-datepicker>
<!-- 12/31/2025 -->
<u-datepicker
  label="Medium"
  format="medium"
></u-datepicker>
<!-- Dec 31, 2025 -->
<u-datepicker
  label="Long"
  format="long"
></u-datepicker>
<!-- December 31, 2025 -->
<u-datepicker
  label="Full"
  format="full"
></u-datepicker>
<!-- Wednesday, December 31, 2025 -->
<u-datepicker
  label="ISO"
  format="iso"
></u-datepicker>
<!-- 2025-12-31 -->

<u-datepicker
  label="Custom"
  [format]="{ year: 'numeric', month: '2-digit', day: '2-digit' }"
>
</u-datepicker>
```

`format` accepts named presets, `'iso'`, or any `Intl.DateTimeFormatOptions` object.

## Locale

```html
<u-datepicker
  label="Data"
  locale="pt-BR"
  format="long"
></u-datepicker>
<u-datepicker
  label="日付"
  locale="ja-JP"
  format="full"
></u-datepicker>
```

When omitted, falls back to `navigator.language`. Also drives the calendar's month/weekday labels.

## Editable input mode

Default — clicking the field opens the calendar; typing is blocked.

```html
<u-datepicker label="Date"></u-datepicker>
```

Editable — the input becomes a native `<input type="date">`; the trailing calendar icon opens the popover:

```html
<u-datepicker
  label="Date"
  editable
></u-datepicker>
```

In editable mode the browser's native date-format mask is hidden until the user focuses the field (so it doesn't visually collide with the floating label).

## Read-only

```html
<u-datepicker
  label="Date"
  value="2025-12-31"
  readOnly
></u-datepicker>
```

## Min and max dates

`min`/`max` (ISO `YYYY-MM-DD`) bound what the user can pick — out-of-range days, months, years and the nav arrows are disabled in the calendar:

```html
<u-datepicker
  label="Date"
  min="2026-06-05"
  max="2026-06-25"
></u-datepicker>
<u-calendar
  min="2026-06-05"
  max="2026-06-25"
></u-calendar>
```

They also drive constraint validation: a value before `min` reports `rangeUnderflow`, after `max` reports `rangeOverflow` (surfaced by `checkValidity()`/`reportValidity()`/`validity` and blocking native form submit). On `<u-range-datepicker>`, `min` applies to the range start and `max` to the range end. In editable mode the bounds are also forwarded to the native `<input type="date">`.

## Value type: ISO strings or Date objects

By default `value` reads as an ISO string (`'iso'`). With `value-type="date"` it reads as `Date` objects instead — `Date | null` on `<u-datepicker>`/`<u-calendar>`, and `{ start: Date | null, end: Date | null } | null` on the range components:

```html
<u-datepicker
  value-type="date"
  label="Date"
></u-datepicker>
<u-range-datepicker
  value-type="date"
  label="Stay"
></u-range-datepicker>
```

The setter accepts either form regardless of `value-type` (an ISO string, a `Date`, or `{ start, end }` for ranges; time parts are dropped). Forms always submit the ISO string. `min`/`max` stay ISO strings in both modes.

## Range

```html
<u-range-datepicker
  label="Stay"
  placeholder="YYYY-MM-DD - YYYY-MM-DD"
  format="medium"
></u-range-datepicker>
```

Value format is `YYYY-MM-DD - YYYY-MM-DD`. Same `format`/`locale`/`editable`/`readOnly` props.

## Inline calendar (no field)

`<u-calendar>` (single) and `<u-range-calendar>` (range) embed the calendar in your own layout (sidebars, custom popovers).

```html
<u-calendar
  id="cal"
  locale="pt-BR"
></u-calendar>
<script>
  const cal = document.getElementById("cal");
  cal.value = "2026-06-02"; // ISO get/set (range: 'YYYY-MM-DD - YYYY-MM-DD')
  cal.addEventListener("change", () => console.log(cal.value)); // a pick also fires `input`
</script>
```

Inline-calendar gotchas (not obvious):

- `value` is an ISO string by default (`value-type="date"` switches it to `Date` objects). A day click fires **both** `input` and `change`, with `e.target.value` = the value in the configured type.
- Setting `.value` does **not** move the displayed month — set `.month` / `.year` separately to open on a specific month.
- `locale` drives the month/weekday labels (defaults to `navigator.language`; use `locale="pt-BR"` for Portuguese).

## Positioning inside clipped containers

`menu-positioning="fixed"` lets the popover escape any scrollable wrapper:

```html
<u-datepicker
  label="Date"
  menu-positioning="fixed"
></u-datepicker>
```

## Caveats

- `value` is ISO by default; `value-type="date"` switches reads to `Date` objects, but the form still submits the ISO string. Format strings only affect display.
- In editable mode the field uses the browser's native `<input type="date">`, which means OS-level keyboard handling and locale conventions for the typing UX.
- The popover opens below the field with `direction="down-end"`. Use `menu-positioning="fixed"` if the field is in a scaffold scroll area to avoid being clipped.
