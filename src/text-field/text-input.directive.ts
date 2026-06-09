import { Directive, HostBinding, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

import { TextInputBase } from '../shared/text-input-base';
import { FormFieldComponent } from '../form-field/form-field.component';

@Directive({
  selector: '[uTextInput]',
  standalone: false,
})
export class TextInputDirective extends TextInputBase {
  override readonly ngControl: NgControl;


  @HostBinding('class.u-text-input')
readonly setInputClass = input(true);

  constructor() {
    const ngControl = inject(NgControl, { optional: true, self: true })!;
    const formField = inject(FormFieldComponent, { optional: true })!;

    super(ngControl, formField);
    this.ngControl = ngControl;

    this._elementRef.nativeElement.addEventListener('click', (e: Event) => e.stopPropagation());
  }
}
