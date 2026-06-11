import { property } from 'lit/decorators.js';

import { TextFieldBase } from '../text-field-base/text-field-base.js';

export abstract class NativeTextFieldWrapper<TValue = string> extends TextFieldBase {
  protected _value = '';

  /**
   * The current value of the field. The canonical string form is submitted
   * with the associated form; subclasses may expose a converted public type
   * via `_getPublicValue`/`_coerceValue`.
   */
  @property()
  get value(): TValue {
    return this._getPublicValue();
  }

  set value(value: TValue) {
    this._setValue(this._coerceValue(value));
  }

  /**
   * Mirrors the native `autocomplete` attribute on the underlying input
   */
  @property({ reflect: true }) autocomplete: 'on' | 'off' | string | undefined;

  #maxlength: number | undefined;

  /**
   * Maximum number of characters the field accepts. When set, drives the
   * automatic character counter shown in the supporting text.
   */
  @property({ type: Number, reflect: true })
  get maxlength(): number | undefined {
    return this.#maxlength;
  }

  set maxlength(value: number) {
    this.#maxlength = value;
    this.#updateCounter();
  }

  /**
   * The ARIA role applied to the inner input element
   */
  @property({ reflect: true }) override role: string | null = null;

  override focus() {
    this.input.focus();
  }

  abstract input: HTMLInputElement | HTMLTextAreaElement;

  /** Maps the canonical string value to the public `value` type. */
  protected _getPublicValue(): TValue {
    return this._value as TValue;
  }

  /** Maps a publicly assigned value to the canonical string form. */
  protected _coerceValue(value: TValue): string {
    return (value as unknown as string) ?? '';
  }

  protected _setValue(value: string) {
    this._value = value;
    this.empty = !value;
    this.elementInternals.setFormValue(value);
    this.#updateCounter();
  }

  protected _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.elementInternals.form?.requestSubmit();
    }
  }

  protected _handleInput() {
    this._setValue(this.input.value);
  }

  #updateCounter() {
    if (this.maxlength) {
      this._innerCounter = `${this._value.length}/${this.maxlength}`;
      return;
    }

    this._innerCounter = undefined;
  }
}
