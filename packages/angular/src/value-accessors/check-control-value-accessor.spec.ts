import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmCheckControlValueAccessor } from './check-control-value-accessor';

@Component({
  template: `<u-checkbox [formControl]="control"></u-checkbox>`,
  standalone: false,
})
class CheckboxHostComponent {
  control = new FormControl<boolean | null>(false);
}

@Component({
  template: `<u-switch [formControl]="control"></u-switch>`,
  standalone: false,
})
class SwitchHostComponent {
  control = new FormControl<boolean | null>(false);
}

function setup<T>(type: new (...args: any[]) => T, tag: string): { fixture: ComponentFixture<T>; host: any; el: any } {
  TestBed.configureTestingModule({
    imports: [ReactiveFormsModule],
    declarations: [type as any, UmCheckControlValueAccessor],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  const el = (fixture.nativeElement as HTMLElement).querySelector(tag) as any;
  return { fixture, host: fixture.componentInstance as any, el };
}

describe('UmCheckControlValueAccessor', () => {
  for (const { name, type, tag } of [
    { name: 'u-checkbox', type: CheckboxHostComponent, tag: 'u-checkbox' },
    { name: 'u-switch', type: SwitchHostComponent, tag: 'u-switch' },
  ]) {
    describe(name, () => {
      it('writes the control value to checked', async () => {
        const { fixture, host, el } = setup(type, tag);
        host.control.setValue(true);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(el.checked).toBeTrue();
      });

      it('propagates a change to the control', () => {
        const { host, el } = setup(type, tag);
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        expect(host.control.value).toBeTrue();
      });

      it('reflects the disabled state', async () => {
        const { fixture, host, el } = setup(type, tag);
        host.control.disable();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(el.disabled).toBeTrue();
      });
    });
  }
});
