import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmSliderControlValueAccessor } from './slider-control-value-accessor';

@Component({
  template: `<u-slider [formControl]="control"></u-slider>`,
  standalone: false,
})
class SingleHostComponent {
  control = new FormControl<number | null>(0);
}

@Component({
  template: `<u-slider range [formControl]="control"></u-slider>`,
  standalone: false,
})
class RangeHostComponent {
  control = new FormControl<any>({ start: 20, end: 80 });
}

function setup<T>(type: new (...args: any[]) => T): { fixture: ComponentFixture<T>; host: any; el: any } {
  TestBed.configureTestingModule({
    imports: [ReactiveFormsModule],
    declarations: [type as any, UmSliderControlValueAccessor],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  const el = (fixture.nativeElement as HTMLElement).querySelector('u-slider') as any;
  return { fixture, host: fixture.componentInstance as any, el };
}

describe('UmSliderControlValueAccessor', () => {
  it('writes the control value to a single-thumb slider', async () => {
    const { fixture, host, el } = setup(SingleHostComponent);
    host.control.setValue(42);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toBe(42);
  });

  it('propagates single-thumb input to the control', () => {
    const { host, el } = setup(SingleHostComponent);
    el.value = 65;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(host.control.value).toBe(65);
  });

  it('reflects the disabled state', async () => {
    const { fixture, host, el } = setup(SingleHostComponent);
    host.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeTrue();
  });

  it('writes start/end to a range slider', async () => {
    const { fixture, el } = setup(RangeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.valueStart).toBe(20);
    expect(el.valueEnd).toBe(80);
  });

  it('propagates a range change to the control as {start,end}', async () => {
    const { fixture, host, el } = setup(RangeHostComponent);
    await fixture.whenStable();
    el.valueStart = 30;
    el.valueEnd = 70;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.control.value).toEqual({ start: 30, end: 70 });
  });
});
