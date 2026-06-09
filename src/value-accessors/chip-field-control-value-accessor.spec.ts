import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmChipFieldControlValueAccessor } from './chip-field-control-value-accessor';

@Component({
  template: `<u-chip-field [formControl]="control"></u-chip-field>`,
  standalone: false,
})
class HostComponent {
  control = new FormControl<any[] | null>([]);
}

describe('UmChipFieldControlValueAccessor', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [HostComponent, UmChipFieldControlValueAccessor],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    el = (fixture.nativeElement as HTMLElement).querySelector('u-chip-field');
  });

  it('writes the control value (array) to the element', async () => {
    host.control.setValue(['alpha', 'beta']);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toEqual(['alpha', 'beta']);
  });

  it('propagates a change to the control', () => {
    el.value = ['gamma'];
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.control.value).toEqual(['gamma']);
  });

  it('reflects the disabled state', async () => {
    host.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeTrue();
  });
});
