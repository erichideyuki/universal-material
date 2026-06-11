import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmDatepickerControlValueAccessor } from '../value-accessors/datepicker-control-value-accessor';
import { UmDatepickerMaxValidator, UmDatepickerMinValidator } from './datepicker-validators';

@Component({
  template: `<u-datepicker [formControl]="control" [min]="min" [max]="max"></u-datepicker>`,
  standalone: false,
})
class DatepickerValidatorsHostComponent {
  control = new FormControl<string | null>(null);
  min: string | null = '2024-01-10';
  max: string | null = '2024-01-20';
}

function setup(): {
  fixture: ComponentFixture<DatepickerValidatorsHostComponent>;
  host: DatepickerValidatorsHostComponent;
  el: any;
} {
  TestBed.configureTestingModule({
    imports: [ReactiveFormsModule],
    declarations: [
      DatepickerValidatorsHostComponent,
      UmDatepickerControlValueAccessor,
      UmDatepickerMinValidator,
      UmDatepickerMaxValidator,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  });
  const fixture = TestBed.createComponent(DatepickerValidatorsHostComponent);
  fixture.detectChanges();
  const el = (fixture.nativeElement as HTMLElement).querySelector('u-datepicker') as any;
  return { fixture, host: fixture.componentInstance, el };
}

describe('UmDatepickerMinValidator / UmDatepickerMaxValidator', () => {
  it('flags a value before min with the min error', () => {
    const { host } = setup();
    host.control.setValue('2024-01-05');
    expect(host.control.errors).toEqual({ min: { min: '2024-01-10', actual: '2024-01-05' } });
  });

  it('flags a value after max with the max error', () => {
    const { host } = setup();
    host.control.setValue('2024-01-25');
    expect(host.control.errors).toEqual({ max: { max: '2024-01-20', actual: '2024-01-25' } });
  });

  it('accepts a value inside [min, max]', () => {
    const { host } = setup();
    host.control.setValue('2024-01-15');
    expect(host.control.errors).toBeNull();
  });

  it('accepts an empty value', () => {
    const { host } = setup();
    host.control.setValue(null);
    expect(host.control.errors).toBeNull();
  });

  it('validates the start of a range value against min', () => {
    const { host } = setup();
    host.control.setValue('2024-01-05 - 2024-01-15');
    expect(host.control.errors).toEqual({ min: { min: '2024-01-10', actual: '2024-01-05 - 2024-01-15' } });
  });

  it('validates the end of a range value against max', () => {
    const { host } = setup();
    host.control.setValue('2024-01-12 - 2024-01-25');
    expect(host.control.errors).toEqual({ max: { max: '2024-01-20', actual: '2024-01-12 - 2024-01-25' } });
  });

  it('re-validates when min changes', () => {
    const { fixture, host } = setup();
    host.control.setValue('2024-01-15');
    expect(host.control.errors).toBeNull();

    host.min = '2024-01-18';
    fixture.detectChanges();
    expect(host.control.errors).toEqual({ min: { min: '2024-01-18', actual: '2024-01-15' } });
  });

  it('re-reflects min/max onto the element so the calendar stays constrained', async () => {
    const { fixture, el } = setup();
    await fixture.whenStable();
    expect(el.getAttribute('min')).toBe('2024-01-10');
    expect(el.getAttribute('max')).toBe('2024-01-20');
    expect(el.min).toBe('2024-01-10');
    expect(el.max).toBe('2024-01-20');
  });

  it('flags a Date value before min with the min error', () => {
    const { host } = setup();
    host.control.setValue(new Date(2024, 0, 5) as any);
    expect(host.control.errors?.['min']).toBeTruthy();
  });

  it('flags a { start, end } range of Dates outside the bounds', () => {
    const { host } = setup();
    host.control.setValue({ start: new Date(2024, 0, 12), end: new Date(2024, 0, 25) } as any);
    expect(host.control.errors?.['max']).toBeTruthy();
  });

  it('accepts a Date value inside [min, max]', () => {
    const { host } = setup();
    host.control.setValue(new Date(2024, 0, 15) as any);
    expect(host.control.errors).toBeNull();
  });

  it('removes the attributes when min/max are cleared', () => {
    const { fixture, host, el } = setup();
    host.min = null;
    host.max = null;
    fixture.detectChanges();
    expect(el.hasAttribute('min')).toBeFalse();
    expect(el.hasAttribute('max')).toBeFalse();
  });
});
