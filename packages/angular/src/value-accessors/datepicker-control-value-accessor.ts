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

  registerOnChange(fn: (_: any) => {}): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.setProperty('disabled', isDisabled);
  }

  _handleChange(): void {
    this.onChange(this._elementRef.nativeElement.value);
  }
}
