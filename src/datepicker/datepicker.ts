import { consume } from '@lit/context';
import { CSSResultGroup } from '@lit/reactive-element/css-tag';

import { html, HTMLTemplateResult, nothing, svg } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

import { CalendarValueType } from '../calendar/calendar-base.js';
import { Calendar } from '../calendar/calendar.js';
import { Menu } from '../menu/menu.js';
import { NativeTextFieldWrapper } from '../shared/char-count-text-field/native-text-field-wrapper.js';
import { localeContext } from '../shared/locale-context.js';
import { FieldValidity, TextFieldBase } from '../shared/text-field-base/text-field-base.js';
import { styles as textFieldStyles } from '../text-field/text-field.styles.js';
import { styles } from './datepicker.styles.js';
import { DatepickerFormat, formatIsoDate, parseIsoDate, toIsoDate } from './format.js';

import '../button/icon-button.js';
import '../calendar/calendar.js';
import '../menu/menu.js';
import '../ripple/ripple.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

@customElement('u-datepicker')
export class Datepicker extends NativeTextFieldWrapper<string | Date | null> {
  static override styles: CSSResultGroup = [TextFieldBase.styles, textFieldStyles, styles];

  /**
   * The BCP 47 locale tag forwarded to the underlying calendar and used for
   * non-editable display formatting.
   * When `null`, falls back to the surrounding `localeContext` and then to
   * the browser's `navigator.language`.
   */
  @property() locale: string | null = null;

  @consume({ context: localeContext, subscribe: true })
  @state()
  private readonly contextLocale: string | undefined;

  get #resolvedLocale(): string | null {
    return this.locale ?? this.contextLocale ?? null;
  }

  /**
   * Format used when displaying the value while the field is not editable.
   * Accepts the named presets `'short'`, `'medium'`, `'long'`, `'full'`,
   * the literal `'iso'` (keeps the ISO `YYYY-MM-DD` value), or an
   * `Intl.DateTimeFormatOptions` object for custom formatting.
   * In editable mode the input uses the browser's native `type="date"` mask
   * and ignores this property.
   */
  @property() format: DatepickerFormat = 'short';

  /**
   * Whether the input accepts manually-typed dates. When `false` (default),
   * the field is read-only and clicking anywhere opens the calendar popover.
   * When `true`, the input uses native `type="date"` and accepts keyboard input;
   * the calendar popover is opened via the trailing icon.
   */
  @property({ type: Boolean, reflect: true }) editable = false;

  /**
   * Whether the input is read-only. When set, manual typing is disabled even
   * if `editable` is `true`; the calendar popover remains available.
   */
  @property({ type: Boolean, reflect: true }) readOnly = false;

  /**
   * The positioning strategy used by the calendar popover. Use `'fixed'`
   * when the datepicker is rendered inside a clipped/scrollable container.
   * Defaults to `'fixed'` automatically when the datepicker is inside a
   * `u-dialog`, whose scrollable content would clip the popover.
   */
  @property({ reflect: true, attribute: 'menu-positioning' }) menuPositioning: 'relative' | 'fixed' = 'relative';

  /**
   * The earliest acceptable date as an ISO `YYYY-MM-DD` string. Earlier dates
   * are disabled in the calendar popover and fail constraint validation with
   * `rangeUnderflow`. When `null`, there is no lower bound.
   */
  @property() min: string | null = null;

  /**
   * The latest acceptable date as an ISO `YYYY-MM-DD` string. Later dates
   * are disabled in the calendar popover and fail constraint validation with
   * `rangeOverflow`. When `null`, there is no upper bound.
   */
  @property() max: string | null = null;

  /**
   * Controls the type produced by the `value` getter. With `'iso'` (default)
   * the value is read as an ISO `YYYY-MM-DD` string; with `'date'` it is read
   * as a `Date` object (`null` when empty). The setter accepts either form
   * regardless; the form always submits the ISO string.
   */
  @property({ attribute: 'value-type' }) valueType: CalendarValueType = 'iso';

  @query('input') input!: HTMLInputElement;
  @query('u-menu', true) private readonly _menu!: Menu;
  @query('u-calendar', true) private readonly _calendar!: Calendar;
  @query('.trailing-icon', true) private readonly _trailingSlot!: HTMLSlotElement;

  protected override renderControl(): HTMLTemplateResult {
    const displayValue = this.editable
      ? this._value
      : formatIsoDate(this._value, this.format, this.#resolvedLocale);

    return html`
      ${this.editable
        ? nothing
        : html`
          <u-ripple ?disabled=${this.disabled}>
            <button
              class="trigger"
              type="button"
              aria-haspopup="dialog"
              ?disabled=${this.disabled}
              @click=${this.#toggleMenu}></button>
          </u-ripple>
        `}
      <div class="input">
        <input
          type=${this.editable ? 'date' : 'text'}
          part="input"
          id=${this.id || nothing}
          aria-labelledby="label"
          aria-describedby="supporting-text"
          aria-haspopup="dialog"
          tabindex=${this.editable ? nothing : -1}
          ?readonly=${this.readOnly || !this.editable}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder ?? nothing}
          min=${(this.editable && this.min) || nothing}
          max=${(this.editable && this.max) || nothing}
          .value=${live(displayValue)}
          @input=${this._handleInput}
          @keydown=${this.#handleKeyDown} />
      </div>
    `;
  }

  protected override renderDefaultTrailingIcon() {
    const icon = svg`
      <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 -960 960 960" width="1em" fill="currentColor">
        <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33
        0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"/>
      </svg>`;

    // In editable mode the field itself is typeable, so the icon must be a
    // dedicated button for opening the calendar. In non-editable mode the
    // .trigger button covers the whole field, so the icon is just visual.
    return this.editable
      ? html`<u-icon-button
          type="button"
          aria-haspopup="dialog"
          aria-label="Open calendar"
          ?disabled=${this.disabled}>${icon}</u-icon-button>`
      : icon;
  }

  protected override renderAfterContent() {
    return html`
      <u-menu
        positioning=${this.menuPositioning}
        autoclose="outside"
        anchor-corner="end-start"
        direction="down-end"
        allow-overflow
        manualFocus
        @click=${this.#stopPropagation}>
        <u-calendar
          .value=${this._value}
          .locale=${this.locale}
          .min=${this.min}
          .max=${this.max}
          @input=${this.#handleCalendarInput}></u-calendar>
      </u-menu>
    `;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.hasAttribute('menu-positioning') && this.closest('u-dialog')) {
      this.menuPositioning = 'fixed';
    }

    void this.#attach();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._trailingSlot?.removeEventListener('click', this.#toggleMenu);
  }

  protected override _getPublicValue(): string | Date | null {
    if (this.valueType === 'date') {
      return parseIsoDate(this._value);
    }

    return this._value;
  }

  protected override _coerceValue(value: string | Date | null): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return toIsoDate(value);
    }

    return value;
  }

  protected override _handleInput(): void {
    super._handleInput();

    if (ISO_DATE.test(this._value)) {
      this._calendar.value = this._value;
    }

    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  }

  protected override _getValidity(): FieldValidity {
    const validity = super._getValidity();

    if (validity.flags.valueMissing || !ISO_DATE.test(this._value)) {
      return validity;
    }

    if (this.min && ISO_DATE.test(this.min) && this._value < this.min) {
      return {
        flags: { rangeUnderflow: true },
        message: `Value must be ${formatIsoDate(this.min, this.format, this.#resolvedLocale)} or later.`,
        anchor: this.input ?? undefined,
      };
    }

    if (this.max && ISO_DATE.test(this.max) && this._value > this.max) {
      return {
        flags: { rangeOverflow: true },
        message: `Value must be ${formatIsoDate(this.max, this.format, this.#resolvedLocale)} or earlier.`,
        anchor: this.input ?? undefined,
      };
    }

    return validity;
  }

  readonly #handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowDown' && !this._menu.open) {
      e.preventDefault();
      this._menu.show();
      return;
    }

    if (e.key === 'Escape' && this._menu.open) {
      e.preventDefault();
      this._menu.close();
      return;
    }

    this._handleKeyDown(e);
  };

  readonly #handleCalendarInput = (e: Event): void => {
    e.stopPropagation();
    const value = (e.target as Calendar).value;
    this.value = value;
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
    this._menu.close();
  };

  readonly #stopPropagation = (e: Event): void => {
    e.stopPropagation();
  };

  readonly #toggleMenu = (): void => {
    if (this.disabled) {
      return;
    }

    this._menu.toggle();
  };

  async #attach(): Promise<void> {
    await this.updateComplete;
    this._menu.anchorElement = this._container;
    this._trailingSlot.addEventListener('click', this.#toggleMenu);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'u-datepicker': Datepicker;
  }
}
