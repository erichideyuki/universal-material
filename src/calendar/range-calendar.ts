import { CSSResultGroup } from '@lit/reactive-element/css-tag';

import { DirectiveResult } from 'lit-html/directive.js';
import { ClassMapDirective } from 'lit-html/directives/class-map.js';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { CalendarBase } from './calendar-base.js';
import { styles } from './range-calendar.styles.js';

export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

@customElement('u-range-calendar')
export class RangeCalendar extends CalendarBase {
  static override styles: CSSResultGroup = [styles, CalendarBase.styles];

  @state() startDateValue: Date | null = null;
  @state() endDateValue: Date | null = null;

  /**
   * The selected range. Read as a `YYYY-MM-DD - YYYY-MM-DD` string (empty
   * when no range is selected), or as a `{ start, end }` object of `Date`s
   * (`null` when empty) when `value-type` is `'date'`. Accepts either form
   * when set.
   */
  @property()
  get value(): string | DateRangeValue | null {
    if (this.valueType === 'date') {
      if (!this.startDateValue && !this.endDateValue) {
        return null;
      }

      return {
        start: this.startDateValue ? new Date(this.startDateValue) : null,
        end: this.endDateValue ? new Date(this.endDateValue) : null,
      };
    }

    if (!this.startDateValue && !this.endDateValue) {
      return '';
    }

    return `${this._getDateString(this.startDateValue)} - ${this._getDateString(this.endDateValue)}`;
  }

  set value(value: string | DateRangeValue | null) {
    if (!value) {
      this.startDateValue = null;
      this.endDateValue = null;
      return;
    }

    if (typeof value === 'object') {
      this.startDateValue = this._getDateFromValue(value.start);
      this.endDateValue = this._getDateFromValue(value.end);
      return;
    }

    const values = value.split(' - ');

    if (values.length !== 2) {
      this.startDateValue = null;
      this.endDateValue = null;
      return;
    }

    const startDateString = values[0];
    const endDateString = values[1];

    this.startDateValue = this._getDateFromString(startDateString);
    this.endDateValue = this._getDateFromString(endDateString);
  }

  #setStartEndDates(startDate: Date | null, endDate: Date | null): void {
    this.startDateValue = startDate;
    this.endDateValue = endDate;

    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  protected override _selectDate(date: Date): void {
    if (!this.startDateValue || !!this.endDateValue) {
      this.#setStartEndDates(date, null);
      return;
    }

    if (date > this.startDateValue) {
      this.#setStartEndDates(this.startDateValue, date);
      return;
    }

    this.#setStartEndDates(date, this.startDateValue);
  }

  protected override _getCalendarClassMap(): DirectiveResult<typeof ClassMapDirective> | null {

    const map: Record<string, boolean> = {};

    if (!this.startDateValue) {
      return null;
    }

    if (this.startDateValue) {
      const className = this.endDateValue
        ? 'selected'
        : 'selecting';

      map[className] = true;
    }

    map[this.#getStartDateClass()] = true;

    if (this.endDateValue) {
      map[this.#getEndDateClass()] = true;
    }

    return classMap(map);
  }

  #getStartDateClass(): string {
    return this.#getDateClass('start', this.startDateValue!);
  }

  #getEndDateClass(): string {
    return this.#getDateClass('end', this.endDateValue!);
  }

  #getDateClass(name: string, date: Date): string {
    const month = date.getMonth();
    const year = date.getFullYear();

    if (this.month === month && this.year === year) {
      return `on-${name}-date-month`;
    }

    if (this.year > year || this.year === year && this.month > month) {
      return `after-${name}-date-month`;
    }

    return `before-${name}-date-month`;
  }

  protected override _getSelectedDateClasses(date: Date): Record<string, boolean> {

    const classes: Record<string, boolean> = {};

    if (this.startDateValue?.getTime() === date.getTime()) {
      classes['selected-date'] = true;
      classes['start-date'] = true;
    }

    if (this.endDateValue?.getTime() === date.getTime()) {
      classes['selected-date'] = true;
      classes['end-date'] = true;
    }

    return classes;
  }
}
