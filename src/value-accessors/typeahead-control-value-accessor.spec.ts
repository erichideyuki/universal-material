import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UmTypeaheadControlValueAccessor } from './typeahead-control-value-accessor';

@Component({
  template: `<u-typeahead [formControl]="control"></u-typeahead>`,
  standalone: false,
})
class HostComponent {
  control = new FormControl<any>(null);
}

describe('UmTypeaheadControlValueAccessor', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [HostComponent, UmTypeaheadControlValueAccessor],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    el = (fixture.nativeElement as HTMLElement).querySelector('u-typeahead');
  });

  it('writes the control value to the element', async () => {
    host.control.setValue('foo');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.value).toBe('foo');
  });

  it('propagates a change to the control', () => {
    el.value = 'bar';
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.control.value).toBe('bar');
  });

  it('reflects the disabled state', async () => {
    host.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.disabled).toBeTrue();
  });
});
