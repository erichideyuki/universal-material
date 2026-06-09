import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmSelectControlValueAccessor, UmSelectOption } from './select-control-value-accessor';

@Component({
  template: `
    <u-select [formControl]="control">
      <u-option value="a">A</u-option>
      <u-option value="b">B</u-option>
    </u-select>
  `,
  standalone: false,
})
class HostComponent {
  control = new FormControl<string | null>(null);
}

describe('UmSelectControlValueAccessor', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: any;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [HostComponent, UmSelectControlValueAccessor, UmSelectOption],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    host = fixture.componentInstance;
    el = (fixture.nativeElement as HTMLElement).querySelector('u-select');
  });

  it('writes the control value to the select', async () => {
    host.control.setValue('b');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toBe('b');
  });

  it('propagates a selection to the control', () => {
    el.value = 'a';
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.control.value).toBe('a');
  });

  it('reflects the disabled state', async () => {
    host.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeTrue();
  });
});
