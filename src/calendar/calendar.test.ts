import { expect, fixture, html, oneEvent } from '@open-wc/testing';

import '../button/button-set.js';
import '../button/button.js';
import '../button/icon-button.js';
import '../ripple/ripple.js';
import { Calendar } from './calendar.js';
import { RangeCalendar } from './range-calendar.js';
import { WeekCalendar } from './week-calendar.js';

suite('u-calendar', () => {
  teardown(() => {
    document.querySelectorAll('u-calendar').forEach((el) => el.remove());
  });

  suite('registration', () => {
    test('is registered as u-calendar', () => {
      expect(customElements.get('u-calendar')).to.equal(Calendar);
    });
  });

  suite('value property', () => {
    test('starts empty when no value is set', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      expect(el.value).to.equal('');
    });

    test('round-trips an ISO date', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      el.value = '2025-03-15';
      await el.updateComplete;
      expect(el.value).to.equal('2025-03-15');
    });

    test('clears when set to an empty string', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      el.value = '2025-03-15';
      el.value = '';
      expect(el.value).to.equal('');
    });
  });

  suite('month/year navigation', () => {
    test('initial month/year reflect the current date', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      const now = new Date();
      expect(el.month).to.equal(now.getMonth());
      expect(el.year).to.equal(now.getFullYear());
    });

    test('month setter updates the displayed month', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      el.month = 0; // January
      expect(el.month).to.equal(0);
    });

    test('year setter updates the displayed year', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      el.year = 2020;
      expect(el.year).to.equal(2020);
    });
  });

  suite('value-type', () => {
    test('defaults to iso', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      el.value = '2025-03-15';
      expect(el.valueType).to.equal('iso');
      expect(el.value).to.equal('2025-03-15');
    });

    test('returns a Date object when value-type="date"', async () => {
      const el = await fixture<Calendar>(html`<u-calendar value-type="date"></u-calendar>`);
      el.value = '2025-03-15';
      expect(el.value).to.be.instanceOf(Date);
      expect((el.value as Date).getTime()).to.equal(new Date(2025, 2, 15).getTime());
    });

    test('returns null when empty and value-type="date"', async () => {
      const el = await fixture<Calendar>(html`<u-calendar value-type="date"></u-calendar>`);
      expect(el.value).to.equal(null);
    });

    test('accepts a Date object regardless of value-type', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      el.value = new Date(2025, 2, 15, 13, 45);
      expect(el.value).to.equal('2025-03-15');
    });

    test('normalizes the time part of an assigned Date', async () => {
      const el = await fixture<Calendar>(html`<u-calendar value-type="date"></u-calendar>`);
      el.value = new Date(2025, 2, 15, 23, 59);
      expect((el.value as Date).getTime()).to.equal(new Date(2025, 2, 15).getTime());
    });
  });

  suite('min/max', () => {
    const navButtonOf = (el: Calendar, selector: string) =>
      el.shadowRoot!.querySelector<HTMLElement & { disabled: boolean }>(selector)!;

    const juneFixture = async (min: string | null, max: string | null) => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      el.min = min;
      el.max = max;
      el.month = 5;
      el.year = 2025;
      await el.updateComplete;
      return el;
    };

    test('marks dates outside [min, max] as disabled', async () => {
      const el = await juneFixture('2025-06-10', '2025-06-20');
      const disabled = el.shadowRoot!.querySelectorAll('.calendar-item.disabled');
      expect(disabled.length).to.be.greaterThan(0);
    });

    test('clicking a disabled date does not select it', async () => {
      const el = await juneFixture('2025-06-10', '2025-06-20');
      const disabledItem = el.shadowRoot!.querySelector<HTMLElement>('.calendar-item.disabled')!;
      disabledItem.click();
      expect(el.value).to.equal('');
    });

    test('clicking an in-range date selects it', async () => {
      const el = await juneFixture('2025-06-10', '2025-06-20');
      const items = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.calendar-item:not(.disabled)')];
      const inRange = items.find((item) => item.querySelector('.date')?.textContent?.trim() === '15')!;
      inRange.click();
      expect(el.value).to.equal('2025-06-15');
    });

    test('disables the previous-month nav button on the min month', async () => {
      const el = await juneFixture('2025-06-01', null);
      expect(navButtonOf(el, '.previous-month-button').disabled).to.be.true;
    });

    test('disables the next-month nav button on the max month', async () => {
      const el = await juneFixture(null, '2025-06-30');
      expect(navButtonOf(el, '.previous-month-button ~ u-icon-button').disabled).to.be.true;
    });

    test('keeps nav buttons enabled away from the bounds', async () => {
      const el = await juneFixture('2025-01-01', '2025-12-31');
      expect(navButtonOf(el, '.previous-month-button').disabled).to.be.false;
      expect(navButtonOf(el, '.previous-month-button ~ u-icon-button').disabled).to.be.false;
    });
  });

  suite('input/change events', () => {
    test('selecting a date fires input then change', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      let inputFired = false;
      let changeFired = false;
      el.addEventListener('input', () => (inputFired = true));
      el.addEventListener('change', () => (changeFired = true));

      // Use the protected method indirectly: clicking a day cell.
      // Simulating with the abstract _selectDate via type cast.
      (el as unknown as { _selectDate: (d: Date) => void })._selectDate(new Date(2025, 5, 10));

      expect(inputFired).to.be.true;
      expect(changeFired).to.be.true;
    });
  });

  suite('selection band stacking', () => {
    // Regression: the selection band (range/week) is a `z-index: -1` ::before.
    // Without an isolated stacking context on the cell it escapes behind the
    // host surface and the selection becomes invisible.
    test('calendar-item isolates its stacking context', async () => {
      const el = await fixture<Calendar>(html`<u-calendar></u-calendar>`);
      const item = el.shadowRoot!.querySelector<HTMLElement>('.calendar-item')!;
      expect(getComputedStyle(item).isolation).to.equal('isolate');
    });
  });
});

suite('u-range-calendar', () => {
  teardown(() => {
    document.querySelectorAll('u-range-calendar').forEach((el) => el.remove());
  });

  suite('registration', () => {
    test('is registered as u-range-calendar', () => {
      expect(customElements.get('u-range-calendar')).to.equal(RangeCalendar);
    });
  });

  suite('value getter/setter', () => {
    test('defaults to empty string', async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar></u-range-calendar>`);
      expect(el.value).to.equal('');
    });

    test('parses "YYYY-MM-DD - YYYY-MM-DD"', async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar></u-range-calendar>`);
      el.value = '2025-01-10 - 2025-02-20';
      await el.updateComplete;
      expect(el.startDateValue).to.not.be.null;
      expect(el.endDateValue).to.not.be.null;
      expect(el.value).to.equal('2025-01-10 - 2025-02-20');
    });

    test('clears both dates when set to an empty string', async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar></u-range-calendar>`);
      el.value = '2025-01-10 - 2025-02-20';
      el.value = '';
      expect(el.startDateValue).to.equal(null);
      expect(el.endDateValue).to.equal(null);
    });

    test('rejects malformed value (clears both dates)', async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar></u-range-calendar>`);
      el.value = '2025-01-10';
      expect(el.startDateValue).to.equal(null);
      expect(el.endDateValue).to.equal(null);
    });
  });

  suite('value-type', () => {
    test('returns a { start, end } object of Dates when value-type="date"', async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar value-type="date"></u-range-calendar>`);
      el.value = '2025-01-10 - 2025-02-20';

      const value = el.value as { start: Date; end: Date };
      expect(value.start.getTime()).to.equal(new Date(2025, 0, 10).getTime());
      expect(value.end.getTime()).to.equal(new Date(2025, 1, 20).getTime());
    });

    test('returns null when empty and value-type="date"', async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar value-type="date"></u-range-calendar>`);
      expect(el.value).to.equal(null);
    });

    test('accepts a { start, end } object of Dates regardless of value-type', async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar></u-range-calendar>`);
      el.value = { start: new Date(2025, 0, 10), end: new Date(2025, 1, 20) };
      expect(el.value).to.equal('2025-01-10 - 2025-02-20');
    });
  });

  suite('event sequence on first/second selection', () => {
    test('first selection sets only start; second selection sets end and dispatches events', async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar></u-range-calendar>`);

      const select = (d: Date) =>
        (el as unknown as { _selectDate: (d: Date) => void })._selectDate(d);

      // First click — start only
      const startDate = new Date(2025, 5, 10);
      setTimeout(() => select(startDate));
      const firstEvent = await oneEvent(el, 'change');
      expect(firstEvent).to.exist;
      expect(el.startDateValue?.getTime()).to.equal(startDate.getTime());
      expect(el.endDateValue).to.equal(null);

      // Second click — end is set
      const endDate = new Date(2025, 5, 20);
      setTimeout(() => select(endDate));
      const secondEvent = await oneEvent(el, 'change');
      expect(secondEvent).to.exist;
      expect(el.endDateValue?.getTime()).to.equal(endDate.getTime());
    });
  });

  suite('selection band', () => {
    const selectedJune = async () => {
      const el = await fixture<RangeCalendar>(html`<u-range-calendar></u-range-calendar>`);
      el.value = '2026-06-09 - 2026-06-18';
      el.month = 5;
      el.year = 2026;
      await el.updateComplete;
      return el;
    };

    const cell = (el: RangeCalendar, day: string) =>
      [...el.shadowRoot!.querySelectorAll<HTMLElement>('.calendar-item')]
        .find((item) => item.querySelector('.date')?.textContent?.trim() === day)!;

    test('paints the highlight band on a day between the range ends', async () => {
      const el = await selectedJune();
      // The band is a ::before pseudo-element; without the rule its content is `none`.
      expect(getComputedStyle(cell(el, '12'), '::before').content).to.not.equal('none');
    });

    test('does not paint the band outside the range', async () => {
      const el = await selectedJune();
      expect(getComputedStyle(cell(el, '25'), '::before').content).to.equal('none');
    });

    test('the in-range cell isolates so the band is not hidden behind the host', async () => {
      const el = await selectedJune();
      expect(getComputedStyle(cell(el, '12')).isolation).to.equal('isolate');
    });
  });
});

suite('u-week-calendar', () => {
  teardown(() => {
    document.querySelectorAll('u-week-calendar').forEach((el) => el.remove());
  });

  // en-US starts the week on Sunday; 2025-06-10 is a Tuesday, so its week
  // starts on Sunday 2025-06-08.
  const make = () => fixture<WeekCalendar>(html`<u-week-calendar locale="en-US"></u-week-calendar>`);

  suite('registration', () => {
    test('is registered as u-week-calendar', () => {
      expect(customElements.get('u-week-calendar')).to.equal(WeekCalendar);
    });
  });

  suite('value', () => {
    test('starts empty', async () => {
      const el = await make();
      expect(el.value).to.equal('');
    });

    test('normalizes any in-week date to the week start', async () => {
      const el = await make();
      el.value = '2025-06-10';
      await el.updateComplete;
      expect(el.value).to.equal('2025-06-08');
    });

    test('a date already on the week start stays put', async () => {
      const el = await make();
      el.value = '2025-06-08';
      expect(el.value).to.equal('2025-06-08');
    });

    test('clears when set to an empty string', async () => {
      const el = await make();
      el.value = '2025-06-10';
      el.value = '';
      expect(el.value).to.equal('');
    });

    test('returns the week start as a Date when value-type="date"', async () => {
      const el = await fixture<WeekCalendar>(
        html`<u-week-calendar locale="en-US" value-type="date"></u-week-calendar>`,
      );
      el.value = '2025-06-10';
      expect((el.value as Date).getTime()).to.equal(new Date(2025, 5, 8).getTime());
    });
  });

  suite('selection', () => {
    test('selecting any day selects its whole week and fires input then change', async () => {
      const el = await make();
      let inputFired = false;
      let changeFired = false;
      el.addEventListener('input', () => (inputFired = true));
      el.addEventListener('change', () => (changeFired = true));

      (el as unknown as { _selectDate: (d: Date) => void })._selectDate(new Date(2025, 5, 11));

      expect(el.value).to.equal('2025-06-08');
      expect(inputFired).to.be.true;
      expect(changeFired).to.be.true;
    });

    test('marks the seven days of the selected week with start/end caps', async () => {
      const el = await make();
      el.value = '2025-06-10';
      el.month = 5;
      el.year = 2025;
      await el.updateComplete;

      expect(el.shadowRoot!.querySelectorAll('.calendar-item.week').length).to.equal(7);
      expect(el.shadowRoot!.querySelectorAll('.calendar-item.week-start').length).to.equal(1);
      expect(el.shadowRoot!.querySelectorAll('.calendar-item.week-end').length).to.equal(1);
    });
  });

  suite('week interaction rows', () => {
    // The week — not the day — is the interactive unit: one overlay row per week,
    // each owning the hover/click and a week-wide ripple.
    test('renders one interaction row per displayed week, each with a ripple', async () => {
      const el = await make();
      const rows = el.shadowRoot!.querySelectorAll('.week-row');
      expect(rows.length).to.equal(6);
      expect([...rows].every((row) => row.querySelector('u-ripple'))).to.be.true;
    });

    test('clicking a week row selects that week', async () => {
      const el = await make();
      el.month = 5;
      el.year = 2025;
      await el.updateComplete;
      // June 2025 grid (en-US, Sunday start) begins Sun 2025-06-01; row 2 = 15–21.
      (el.shadowRoot!.querySelectorAll<HTMLElement>('.week-row')[2]).click();
      expect(el.value).to.equal('2025-06-15');
    });

    test('the per-day ripple is suppressed', async () => {
      const el = await make();
      const dayRipple = el.shadowRoot!.querySelector('.calendar-item u-ripple')!;
      expect(getComputedStyle(dayRipple).display).to.equal('none');
    });
  });
});
