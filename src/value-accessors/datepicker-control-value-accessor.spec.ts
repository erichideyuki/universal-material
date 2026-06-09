import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmDatepickerControlValueAccessor } from './datepicker-control-value-accessor';

@Component({
  template: `<u-datepicker editable [formControl]="control"></u-datepicker>`,
  standalone: false,
})
class DatepickerHostComponent {
  control = new FormControl<string | null>(null);
}

function setup(): { fixture: ComponentFixture<DatepickerHostComponent>; host: DatepickerHostComponent; el: any } {
  TestBed.configureTestingModule({
    imports: [ReactiveFormsModule],
    declarations: [DatepickerHostComponent, UmDatepickerControlValueAccessor],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  });
  const fixture = TestBed.createComponent(DatepickerHostComponent);
  fixture.detectChanges();
  const el = (fixture.nativeElement as HTMLElement).querySelector('u-datepicker') as any;
  return { fixture, host: fixture.componentInstance, el };
}

describe('UmDatepickerControlValueAccessor', () => {
  it('writes the control value to the datepicker', async () => {
    const { fixture, host, el } = setup();
    host.control.setValue('2024-01-15');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toBe('2024-01-15');
  });

  it('propagates a datepicker change to the control', () => {
    const { host, el } = setup();
    el.value = '2024-02-20';
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.control.value).toBe('2024-02-20');
  });

  it('reflects the disabled state', async () => {
    const { fixture, host, el } = setup();
    host.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeTrue();
  });
});
