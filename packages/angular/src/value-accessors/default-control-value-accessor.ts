import { Directive, ElementRef, Renderer2, inject } from '@angular/core';
import { COMPOSITION_BUFFER_MODE, DefaultValueAccessor, NgControl } from '@angular/forms';

@Directive({
  // NOTE: u-button-field is intentionally excluded — it exposes a `value` setter but dispatches no
  // input/change events, so DefaultValueAccessor cannot observe user changes (display-only control).
  selector: 'u-text-field[ngModel],u-text-field[formControlName],u-text-field[formControl],u-text-area[ngModel],u-text-area[formControlName],u-text-area[formControl],u-search[ngModel],u-search[formControlName],u-search[formControl]',
  standalone: false,
})
export class UmDefaultControlValueAccessor extends DefaultValueAccessor {

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    const renderer = inject(Renderer2);
    const elementRef = inject(ElementRef);
    const _compositionMode = inject(COMPOSITION_BUFFER_MODE, { optional: true })!;
    const ngControl = inject(NgControl, { optional: true })!;

    super(renderer, elementRef, _compositionMode);

    if (!ngControl || ngControl.valueAccessor) {
      return;
    }

    ngControl.valueAccessor = this;
  }
}
