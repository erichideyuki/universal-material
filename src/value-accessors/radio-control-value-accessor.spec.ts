import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmRadioControlValueAccessor } from './radio-control-value-accessor';

@Component({
  template: `
    <u-radio name="grp" [value]="'a'" [formControl]="control"></u-radio>
    <u-radio name="grp" [value]="'b'" [formControl]="control"></u-radio>
  `,
  standalone: false,
})
class HostComponent {
  control = new FormControl<string | null>(null);
}

describe('UmRadioControlValueAccessor', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let radios: any[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [HostComponent, UmRadioControlValueAccessor],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    radios = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('u-radio')) as any[];
  });

  it('checks the radio whose value matches the control', async () => {
    host.control.setValue('b');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(radios[1].checked).toBeTrue();
    expect(radios[0].checked).toBeFalse();
  });

  it('propagates a selection to the control', () => {
    radios[0].checked = true;
    radios[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.control.value).toBe('a');
  });

  it('reflects the disabled state', async () => {
    host.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(radios[0].disabled).toBeTrue();
    expect(radios[1].disabled).toBeTrue();
  });
});
