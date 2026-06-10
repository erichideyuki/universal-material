import { Directive, ElementRef, forwardRef, inject, OnDestroy, Provider, Renderer2 } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RangeDatepicker } from '@universal-material/web';

/**
 * Coordinates the `uStartDate`/`uEndDate` value accessors of a
 * `u-range-datepicker`, splitting and combining the element's
 * `YYYY-MM-DD - YYYY-MM-DD` value so each end binds to its own form control,
 * mirroring `mat-date-range-input` with `matStartDate`/`matEndDate`.
 */
@Directive({
  selector: 'u-range-datepicker',
  standalone: false,
})
export class UmRangeDatepickerDirective {
  readonly element: RangeDatepicker = inject<ElementRef<RangeDatepicker>>(ElementRef).nativeElement;

  private readonly _renderer = inject(Renderer2);
  private readonly _disabledParts = [false, false];

  getPart(index: 0 | 1): string {
    const parts = (this.element.value ?? '').split(' - ');

    return parts.length === 2 ? parts[index] : '';
  }

  setPart(index: 0 | 1, value: string | null): void {
    const parts = [this.getPart(0), this.getPart(1)];
    parts[index] = value ?? '';

    const combined = !parts[0] && !parts[1] ? '' : `${parts[0]} - ${parts[1]}`;
    this._renderer.setProperty(this.element, 'value', combined);
  }

  /** The range datepicker is only disabled when both ends are disabled, like `mat-date-range-input`. */
  setPartDisabled(index: 0 | 1, disabled: boolean): void {
    this._disabledParts[index] = disabled;
    this._renderer.setProperty(this.element, 'disabled', this._disabledParts[0] && this._disabledParts[1]);
  }
}

@Directive()
export abstract class UmRangeDatepickerPartControlValueAccessor implements ControlValueAccessor, OnDestroy {
  protected abstract readonly _index: 0 | 1;

  private readonly _rangeDatepicker = inject(UmRangeDatepickerDirective, { optional: true });

  onChange = (_: any) => {};
  onTouched = () => {};

  constructor() {
    if (!this._rangeDatepicker) {
      throw new Error('uStartDate/uEndDate must be placed inside a <u-range-datepicker> element.');
    }

    this._rangeDatepicker.element.addEventListener('input', this._handleChange);
    this._rangeDatepicker.element.addEventListener('change', this._handleChange);
    this._rangeDatepicker.element.addEventListener('blur', this._handleTouched);
  }

  ngOnDestroy(): void {
    this._rangeDatepicker!.element.removeEventListener('input', this._handleChange);
    this._rangeDatepicker!.element.removeEventListener('change', this._handleChange);
    this._rangeDatepicker!.element.removeEventListener('blur', this._handleTouched);
  }

  writeValue(value: any): void {
    this._rangeDatepicker!.setPart(this._index, value ?? null);
  }

  registerOnChange(fn: (_: any) => {}): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._rangeDatepicker!.setPartDisabled(this._index, isDisabled);
  }

  private readonly _handleChange = (): void => {
    this.onChange(this._rangeDatepicker!.getPart(this._index));
  };

  private readonly _handleTouched = (): void => {
    this.onTouched();
  };
}

const START_DATE_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => UmStartDateControlValueAccessor),
  multi: true,
};

/**
 * Binds a form control to the start date of the enclosing `u-range-datepicker`.
 * The input is a hidden value carrier — the range datepicker renders its own
 * field — so it only exists to anchor `formControlName`/`ngModel`.
 */
@Directive({
  selector: 'input[uStartDate]',
  providers: [START_DATE_VALUE_ACCESSOR],
  host: { hidden: '' },
  standalone: false,
})
export class UmStartDateControlValueAccessor extends UmRangeDatepickerPartControlValueAccessor {
  protected readonly _index = 0;
}

const END_DATE_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => UmEndDateControlValueAccessor),
  multi: true,
};

/**
 * Binds a form control to the end date of the enclosing `u-range-datepicker`.
 * The input is a hidden value carrier — the range datepicker renders its own
 * field — so it only exists to anchor `formControlName`/`ngModel`.
 */
@Directive({
  selector: 'input[uEndDate]',
  providers: [END_DATE_VALUE_ACCESSOR],
  host: { hidden: '' },
  standalone: false,
})
export class UmEndDateControlValueAccessor extends UmRangeDatepickerPartControlValueAccessor {
  protected readonly _index = 1;
}
