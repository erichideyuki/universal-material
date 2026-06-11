import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  UmEndDateControlValueAccessor,
  UmRangeDatepickerDirective,
  UmStartDateControlValueAccessor,
} from './date-range-control-value-accessors';

@Component({
  template: `
    <u-range-datepicker>
      <input uStartDate [formControl]="start" />
      <input uEndDate [formControl]="end" />
    </u-range-datepicker>
  `,
  standalone: false,
})
class DateRangeHostComponent {
  start = new FormControl<string | null>(null);
  end = new FormControl<string | null>(null);
}

function setup(): { fixture: ComponentFixture<DateRangeHostComponent>; host: DateRangeHostComponent; el: any } {
  TestBed.configureTestingModule({
    imports: [ReactiveFormsModule],
    declarations: [
      DateRangeHostComponent,
      UmRangeDatepickerDirective,
      UmStartDateControlValueAccessor,
      UmEndDateControlValueAccessor,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  });
  const fixture = TestBed.createComponent(DateRangeHostComponent);
  fixture.detectChanges();
  const el = (fixture.nativeElement as HTMLElement).querySelector('u-range-datepicker') as any;
  return { fixture, host: fixture.componentInstance, el };
}

describe('UmStartDateControlValueAccessor / UmEndDateControlValueAccessor', () => {
  it('combines both control values into the range datepicker value', async () => {
    const { fixture, host, el } = setup();
    host.start.setValue('2024-01-10');
    host.end.setValue('2024-01-20');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toBe('2024-01-10 - 2024-01-20');
  });

  it('writes a partial value when only the start is set', async () => {
    const { fixture, host, el } = setup();
    host.start.setValue('2024-01-10');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toBe('2024-01-10 - ');
  });

  it('clears the element value when both controls are cleared', async () => {
    const { fixture, host, el } = setup();
    host.start.setValue('2024-01-10');
    host.end.setValue('2024-01-20');
    host.start.setValue(null);
    host.end.setValue(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toBe('');
  });

  it('propagates a range datepicker change to both controls', () => {
    const { host, el } = setup();
    el.value = '2024-02-05 - 2024-02-15';
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.start.value).toBe('2024-02-05');
    expect(host.end.value).toBe('2024-02-15');
  });

  it('propagates a partial selection (start picked, end cleared)', () => {
    const { host, el } = setup();
    el.value = '2024-02-05 - 2024-02-15';
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.value = '2024-03-01 - ';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(host.start.value).toBe('2024-03-01');
    expect(host.end.value).toBe('');
  });

  it('only disables the element when both controls are disabled', async () => {
    const { fixture, host, el } = setup();
    host.start.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeFalse();

    host.end.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeTrue();

    host.start.enable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeFalse();
  });

  it('hides the carrier inputs', () => {
    const { fixture } = setup();
    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input');
    inputs.forEach((input) => expect(input.hasAttribute('hidden')).toBeTrue());
  });

  describe('value-type="date"', () => {
    it('combines Date control values into a { start, end } object', async () => {
      const { fixture, host, el } = setup();
      el.valueType = 'date';

      host.start.setValue(new Date(2024, 0, 10) as any);
      host.end.setValue(new Date(2024, 0, 20) as any);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(el.value.start.getTime()).toBe(new Date(2024, 0, 10).getTime());
      expect(el.value.end.getTime()).toBe(new Date(2024, 0, 20).getTime());
    });

    it('propagates a range change to both controls as Dates', () => {
      const { host, el } = setup();
      el.valueType = 'date';

      el.value = { start: new Date(2024, 1, 5), end: new Date(2024, 1, 15) };
      el.dispatchEvent(new Event('change', { bubbles: true }));

      expect((host.start.value as unknown as Date).getTime()).toBe(new Date(2024, 1, 5).getTime());
      expect((host.end.value as unknown as Date).getTime()).toBe(new Date(2024, 1, 15).getTime());
    });
  });
});
