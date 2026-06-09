import { Directive, ElementRef, inject } from '@angular/core';

import { FormFieldComponent } from './form-field.component';

@Directive({
  selector: '[uLabel]',
  standalone: false,
})
export class LabelDirective {

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    const elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    const formField = inject(FormFieldComponent, { optional: true })!;

    if (formField) {
      elementRef.nativeElement.classList.add('u-text-field-label');
      formField._hasLabel = true;
      formField.labelWidth = elementRef.nativeElement.offsetWidth;
      new ResizeObserver(() => formField.labelWidth = elementRef.nativeElement.offsetWidth)
        .observe(elementRef.nativeElement);

    }
  }
}
