import { Component, CUSTOM_ELEMENTS_SCHEMA, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TextInputDirective } from './text-input.directive';
import { TextFieldModule } from './text-field.module';

@Component({
  template: `<input uTextInput>`,
  standalone: false,
})
class HostComponent {}

describe('TextInputDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let inputDe: DebugElement;
  let input: HTMLInputElement;
  let directive: TextInputDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TextFieldModule],
      declarations: [HostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    inputDe = fixture.debugElement.query(By.directive(TextInputDirective));
    input = inputDe.nativeElement as HTMLInputElement;
    directive = inputDe.injector.get(TextInputDirective);
  });

  it('instantiates on the host input', () => {
    expect(directive).toBeTruthy();
    expect(input.tagName.toLowerCase()).toBe('input');
  });

  it('applies the u-text-input class by default', () => {
    expect(input.classList.contains('u-text-input')).toBeTrue();
  });

  it('reports empty based on the native input value', () => {
    expect(directive.empty).toBeTrue();

    input.value = 'hello';
    expect(directive.empty).toBeFalse();
  });
});
