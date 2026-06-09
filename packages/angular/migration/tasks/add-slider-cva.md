# Add `UmSliderControlValueAccessor` for native `<u-slider>`

## Scope
New file `src/value-accessors/slider-control-value-accessor.ts`. Registered in `update-index-exports.md`.

## Context
Web 3.9.0 `Slider` (`src/slider/slider.ts`): single-thumb `value: number`; range mode uses
`valueStart`/`valueEnd: number` and `range: boolean` (auto-true when both set). Fires `input` (bubbles,
composed) on drag/keyboard and `change` (bubbles, composed) on commit. Has `disabled: boolean`.
No CVA exists today. Model on the custom CVAs in this folder (chip-field/typeahead).

## Implementation
```ts
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Directive, ElementRef, forwardRef, Provider, Renderer2, inject } from '@angular/core';
import { Slider } from '@universal-material/web';

const SLIDER_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => UmSliderControlValueAccessor),
  multi: true,
};

@Directive({
  selector: 'u-slider[ngModel],u-slider[formControlName],u-slider[formControl]',
  providers: [SLIDER_VALUE_ACCESSOR],
  host: {
    '(input)': '_handleChange()',
    '(change)': '_handleChange()',
    '(blur)': 'onTouched()',
  },
  standalone: false,
})
export class UmSliderControlValueAccessor implements ControlValueAccessor {
  private _renderer = inject(Renderer2);
  private _elementRef = inject<ElementRef<Slider>>(ElementRef);

  onChange = (_: any) => {};
  onTouched = () => {};

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {}

  writeValue(value: any): void {
    const el = this._elementRef.nativeElement;
    if (el.range || (value !== null && typeof value === 'object')) {
      const start = Array.isArray(value) ? value[0] : value?.start;
      const end = Array.isArray(value) ? value[1] : value?.end;
      this.setProperty('valueStart', start ?? null);
      this.setProperty('valueEnd', end ?? null);
    } else {
      this.setProperty('value', value ?? null);
    }
  }

  protected setProperty(key: string, value: any): void {
    this._renderer.setProperty(this._elementRef.nativeElement, key, value);
  }

  registerOnChange(fn: (_: any) => {}): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.setProperty('disabled', isDisabled); }

  _handleChange(): void {
    const el = this._elementRef.nativeElement;
    this.onChange(el.range ? { start: el.valueStart, end: el.valueEnd } : el.value);
  }
}
```

## Acceptance
- Single-thumb: `writeValue(50)` sets `el.value=50`; user `input` propagates `el.value` to the control.
- Range: `writeValue({start,end})` (or `[start,end]`) sets `valueStart`/`valueEnd`; change emits `{start,end}`.
- `setDisabledState(true)` sets `el.disabled=true`.

## Verify
Covered by `tests/slider-cva.md` spec; `ng test` green.
