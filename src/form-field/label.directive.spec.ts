import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FormFieldComponent } from './form-field.component';
import { FormFieldModule } from './form-field.module';

@Component({
  template: `<u-form-field><label uLabel>Name</label></u-form-field>`,
  standalone: false,
})
class HostComponent {}

describe('LabelDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormFieldModule],
      declarations: [HostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('creates the host with a projected label without throwing', () => {
    expect(fixture.componentInstance).toBeTruthy();
    const label = (fixture.nativeElement as HTMLElement).querySelector('[uLabel]');
    expect(label).toBeTruthy();
  });

  it('adds the u-text-field-label class to the label element', () => {
    const label = (fixture.nativeElement as HTMLElement).querySelector('[uLabel]')!;
    expect(label.classList.contains('u-text-field-label')).toBeTrue();
  });

  it('flags the parent form-field as having a label', () => {
    const formFieldDebugEl = fixture.debugElement.query(
      (de) => de.nativeElement.tagName.toLowerCase() === 'u-form-field',
    );
    const formField = formFieldDebugEl.componentInstance as FormFieldComponent;
    expect(formField._hasLabel).toBeTrue();
  });
});
