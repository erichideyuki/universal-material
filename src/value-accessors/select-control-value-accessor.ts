import { afterNextRender, Directive, ElementRef, forwardRef, Provider, Renderer2, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, NgSelectOption, SelectControlValueAccessor } from '@angular/forms';

const SELECT_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => UmSelectControlValueAccessor),
  multi: true,
};

@Directive({
  selector: 'u-select[ngModel],u-select[formControlName],u-select[formControl]',
  providers: [SELECT_VALUE_ACCESSOR],
  standalone: false,
})
export class UmSelectControlValueAccessor extends SelectControlValueAccessor {

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);


  constructor() {
    const _element = inject(ElementRef);
    const _renderer = inject(Renderer2);

    super(_renderer, _element);
  }

  _writeValueAfterRender(): void {
    // @ts-ignore
    queueMicrotask(() => super['_writeValueAfterRender']());
  }
}

@Directive({
  selector: 'u-option',
  standalone: false,
})
export class UmSelectOption extends NgSelectOption {

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    const _element = inject(ElementRef);
    const _renderer = inject(Renderer2);
    const _select = inject(UmSelectControlValueAccessor, { optional: true, host: true })!;

    super(_element, _renderer, _select);
  }

  override ngOnDestroy() {
    setTimeout(() =>
      super.ngOnDestroy(), 1000);
  }
}
