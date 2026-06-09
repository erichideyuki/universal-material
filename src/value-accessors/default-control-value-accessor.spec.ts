import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmDefaultControlValueAccessor } from './default-control-value-accessor';

@Component({
  template: `<u-text-field [formControl]="control"></u-text-field>`,
  standalone: false,
})
class HostComponent {
  control = new FormControl<string | null>('');
}

describe('UmDefaultControlValueAccessor', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [HostComponent, UmDefaultControlValueAccessor],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    el = (fixture.nativeElement as HTMLElement).querySelector('u-text-field');
  });

  it('writes the control value to the field', async () => {
    host.control.setValue('hello');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toBe('hello');
  });

  it('propagates user input to the control', () => {
    el.value = 'typed';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(host.control.value).toBe('typed');
  });

  it('reflects the disabled state', async () => {
    host.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeTrue();
  });
});
