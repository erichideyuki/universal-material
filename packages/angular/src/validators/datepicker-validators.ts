import { Directive, forwardRef, Input, OnChanges, Provider, SimpleChanges } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_RANGE = /^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/;

const getStartDate = (value: string): string | null => {
  if (ISO_DATE.test(value)) {
    return value;
  }

  if (ISO_DATE_RANGE.test(value)) {
    return value.split(' - ')[0];
  }

  return null;
};

const getEndDate = (value: string): string | null => {
  if (ISO_DATE.test(value)) {
    return value;
  }

  if (ISO_DATE_RANGE.test(value)) {
    return value.split(' - ')[1];
  }

  return null;
};

const DATEPICKER_MIN_VALIDATOR: Provider = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => UmDatepickerMinValidator),
  multi: true,
};

/**
 * Validator directive for the `min` bound of `u-datepicker`/`u-range-datepicker`.
 * Declaring `min` as an input keeps the binding from reaching the element, so the
 * directive re-reflects it via `attr.min` to keep the calendar constrained.
 * On a range value, `min` validates the range start.
 */
@Directive({
  selector:
    'u-datepicker[min][formControlName],u-datepicker[min][formControl],u-datepicker[min][ngModel],' +
    'u-range-datepicker[min][formControlName],u-range-datepicker[min][formControl],u-range-datepicker[min][ngModel]',
  providers: [DATEPICKER_MIN_VALIDATOR],
  host: { '[attr.min]': 'min ?? null' },
  standalone: false,
})
export class UmDatepickerMinValidator implements Validator, OnChanges {
  @Input() min: string | null = null;

  private _onChange?: () => void;

  ngOnChanges(changes: SimpleChanges): void {
    if ('min' in changes) {
      this._onChange?.();
    }
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string | null;

    if (!value || !this.min || !ISO_DATE.test(this.min)) {
      return null;
    }

    const start = getStartDate(value);

    if (!start || start >= this.min) {
      return null;
    }

    return { min: { min: this.min, actual: value } };
  }

  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }
}

const DATEPICKER_MAX_VALIDATOR: Provider = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => UmDatepickerMaxValidator),
  multi: true,
};

/**
 * Validator directive for the `max` bound of `u-datepicker`/`u-range-datepicker`.
 * Declaring `max` as an input keeps the binding from reaching the element, so the
 * directive re-reflects it via `attr.max` to keep the calendar constrained.
 * On a range value, `max` validates the range end.
 */
@Directive({
  selector:
    'u-datepicker[max][formControlName],u-datepicker[max][formControl],u-datepicker[max][ngModel],' +
    'u-range-datepicker[max][formControlName],u-range-datepicker[max][formControl],u-range-datepicker[max][ngModel]',
  providers: [DATEPICKER_MAX_VALIDATOR],
  host: { '[attr.max]': 'max ?? null' },
  standalone: false,
})
export class UmDatepickerMaxValidator implements Validator, OnChanges {
  @Input() max: string | null = null;

  private _onChange?: () => void;

  ngOnChanges(changes: SimpleChanges): void {
    if ('max' in changes) {
      this._onChange?.();
    }
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string | null;

    if (!value || !this.max || !ISO_DATE.test(this.max)) {
      return null;
    }

    const end = getEndDate(value);

    if (!end || end <= this.max) {
      return null;
    }

    return { max: { max: this.max, actual: value } };
  }

  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }
}
