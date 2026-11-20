import { CSSResultGroup } from '@lit/reactive-element/css-tag';

import { html, HTMLTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { CalendarBase } from './calendar-base.js';
import { styles } from './week-calendar.styles.js';

import '../ripple/ripple.js';

/** Rows of days the calendar grid renders below the weekday header. */
const WEEK_ROWS = 6;

/**
 * Inline calendar that selects a whole **week** at a time. Clicking any day
 * selects the week that contains it; the week is highlighted as a continuous
 * band, and hovering a day previews its week.
 *
 * The selected week is represented by its **start date** — the first day of
 * the week, honoring the locale's first weekday.
 */
@customElement('u-week-calendar')
export class WeekCalendar extends CalendarBase {
  static override styles: CSSResultGroup = [styles, CalendarBase.styles];

  @state() weekStartValue: Date | null = null;
  @state() private _hoverWeekStart: Date | null = null;

  constructor() {
    super();

    // A selected week is only whole when the leading/trailing days of the
    // adjacent months are rendered, so weeks never get clipped at month edges.
    this.dateOutsideMonth = true;
  }

  /**
   * The selected week, represented by its **start date** (the first day of the
   * week). Read as an ISO `YYYY-MM-DD` string (empty when no week is selected),
   * or as a `Date` (`null` when empty) when `value-type` is `'date'`. Accepts
   * any date within a week when set — it is normalized to that week's start.
   */
  @property()
  get value(): string | Date | null {
    if (this.valueType === 'date') {
      return this.weekStartValue ? new Date(this.weekStartValue) : null;
    }

    return this._getDateString(this.weekStartValue);
  }

  set value(value: string | Date | null) {
    const date = this._getDateFromValue(value);
    this.weekStartValue = date ? this.#getWeekStart(date) : null;
  }

  protected override _selectDate(date: Date): void {
    this.weekStartValue = this.#getWeekStart(date);

    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * One interaction row per displayed week, laid over the grid. The week — not
   * the day — is the unit, so each row owns the hover preview, the click and a
   * week-wide ripple (the per-day ripple is suppressed in the styles).
   */
  protected override _renderGridOverlay(): HTMLTemplateResult {
    return html`
      ${Array.from({ length: WEEK_ROWS }, (_, row) => html`
        <div
          class="week-row"
          style="top: ${(row + 1) * 48}px"
          @mouseenter=${() => {
            this._hoverWeekStart = this.#rowWeekStart(row);
          }}
          @mouseleave=${() => {
            this._hoverWeekStart = null;
          }}
          @click=${() => this._selectDate(this.#rowWeekStart(row))}>
          <u-ripple></u-ripple>
        </div>
      `)}
    `;
  }

  protected override _getSelectedDateClasses(date: Date): Record<string, boolean> {
    const classes: Record<string, boolean> = {};

    this.#applyWeekClasses(classes, date, this.weekStartValue, 'week');

    if (this._hoverWeekStart && this.weekStartValue?.getTime() !== this._hoverWeekStart.getTime()) {
      this.#applyWeekClasses(classes, date, this._hoverWeekStart, 'week-hover');
    }

    return classes;
  }

  #applyWeekClasses(classes: Record<string, boolean>, date: Date, weekStart: Date | null, prefix: string): void {
    if (!weekStart) {
      return;
    }

    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);

    if (date < weekStart || date > weekEnd) {
      return;
    }

    classes[prefix] = true;

    if (date.getTime() === weekStart.getTime()) {
      classes[`${prefix}-start`] = true;
    }

    if (date.getTime() === weekEnd.getTime()) {
      classes[`${prefix}-end`] = true;
    }
  }

  #getWeekStart(date: Date): Date {
    const diff = (date.getDay() - this._firstDayOfWeek + 7) % 7;

    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff);
  }

  /** First day of the Nth week row currently displayed in the grid. */
  #rowWeekStart(row: number): Date {
    const firstOfMonth = new Date(this.year, this.month, 1);
    const diffToFirstDayOfWeek = (firstOfMonth.getDay() - this._firstDayOfWeek + 7) % 7;

    return new Date(this.year, this.month, 1 - diffToFirstDayOfWeek + row * 7);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'u-week-calendar': WeekCalendar;
  }
}
