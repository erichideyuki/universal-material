# Add `UmDatepickerControlValueAccessor` for `<u-datepicker>` / `<u-range-datepicker>`

## Scope
New file `src/value-accessors/datepicker-control-value-accessor.ts`. Registered in `update-index-exports.md`.

## Context
Web 3.9.0 `Datepicker` and `RangeDatepicker` extend `NativeTextFieldWrapper`: text-field-like with a `value`
property (single = ISO `YYYY-MM-DD` string; range = the component's range value), `disabled`, and they
dispatch `input` (bubbles, composed) and `change` (bubbles) on selection (`src/datepicker/datepicker.ts:159,182-183`,
`range-datepicker.ts:158,181,191`). The deleted Angular datepicker provided form binding; this CVA replaces it.
Pass the value through (don't coerce) so both single string and range values work. Model on the typeahead CVA.

## Implementation
```ts
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Directive, ElementRef, forwardRef, Provider, Renderer2, inject } from '@angular/core';
import { Datepicker, RangeDatepicker } from '@universal-material/web';

const DATEPICKER_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => UmDatepickerControlValueAccessor),
  multi: true,
};

@Directive({
  selector:
    'u-datepicker[ngModel],u-datepicker[formControlName],u-datepicker[formControl],' +
    'u-range-datepicker[ngModel],u-range-datepicker[formControlName],u-range-datepicker[formControl]',
  providers: [DATEPICKER_VALUE_ACCESSOR],
  host: {
    '(input)': '_handleChange()',
    '(change)': '_handleChange()',
    '(blur)': 'onTouched()',
  },
  standalone: false,
})
export class UmDatepickerControlValueAccessor implements ControlValueAccessor {
  private _renderer = inject(Renderer2);
  private _elementRef = inject<ElementRef<Datepicker | RangeDatepicker>>(ElementRef);

  onChange = (_: any) => {};
  onTouched = () => {};

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {}

  writeValue(value: any): void {
    this.setProperty('value', value ?? null);
  }

  protected setProperty(key: string, value: any): void {
    this._renderer.setProperty(this._elementRef.nativeElement, key, value);
  }

  registerOnChange(fn: (_: any) => {}): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.setProperty('disabled', isDisabled); }

  _handleChange(): void {
    this.onChange(this._elementRef.nativeElement.value);
  }
}
```

## Acceptance
- `writeValue('2024-01-15')` sets `el.value`; a `change`/`input` from the element propagates `el.value`.
- `setDisabledState(true)` sets `el.disabled=true`.
- Works for both `u-datepicker` and `u-range-datepicker`.

## Verify
Covered by `tests/datepicker-cva.md` spec; `ng test` green.
