import { Component, ContentChild, ElementRef, HostBinding, HostListener, InjectionToken, Input, ViewChild, output, input, inject } from '@angular/core';
import { LabelDirective } from './label.directive';
import { InputBaseComponent } from '../shared/input-base.component';
import { FormFieldAppearance } from './form-field-appearance';

export const FORM_FIELD_DEFAULT_APPEARANCE = new InjectionToken('FORM_FIELD_DEFAULT_APPEARANCE');

@Component({
  selector: 'u-form-field',
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.scss'],
  standalone: false,
})
export class FormFieldComponent {
  readonly _elementRef = inject(ElementRef);


  _appearanceClass!: string;
  _appearance!: FormFieldAppearance;
  _defaultAppearance: FormFieldAppearance;
  _input: InputBaseComponent | null = null;
  _hasLabel = false;

  @HostBinding('class.u-form-field-selection')
readonly selectionField = input(false);

  set labelWidth(width: number) {
    this._elementRef.nativeElement.style.setProperty('--u-text-field-label-width', `${width}px`);
    this._elementRef.nativeElement.style.setProperty('--u-text-field-label-half-width', `${width / 2}px`);
  }

  @HostBinding('style.margin-bottom')
  get removeMarginStyle() {
    return this.removeMargin() ? '0' : '';
  }

  readonly invalid = input(false);
  readonly removeMargin = input(false);
  readonly supportingText = input<string | null>(null);
  readonly errorText = input<string | null>(null);
  readonly activated = output<void>();

  @Input()
  get appearance(): FormFieldAppearance {
    return this._appearance;
  }
  set appearance(value: FormFieldAppearance) {
    this._appearance = value;

    if (!value || value === 'default') {
      value = this._defaultAppearance;
    }

    if (value.indexOf('search') > -1) {
      this._appearanceClass = 'u-search-field';
      return;
    }

    this._appearanceClass = `u-text-field-${value}`;
  }

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    const _elementRef = this._elementRef;
    const defaultAppearance = inject<FormFieldAppearance>(FORM_FIELD_DEFAULT_APPEARANCE, { optional: true })!;

    this._defaultAppearance = defaultAppearance || 'box';
    this.appearance = this._defaultAppearance;
    _elementRef.nativeElement.classList.add('u-form-field');
  }

  click(): void {

    if (!this._input?.disabled) {
      this._input?.focus();
      this.activated.emit();
    }
  }

  @HostListener('mousedown', ['$event'])
  mouseDown(e: MouseEvent): void {
    if (!this._input?.disabled) {
      e.preventDefault();
    }
  }
}
