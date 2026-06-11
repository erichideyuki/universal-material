import { expect, fixture, html } from '@open-wc/testing';

import '../button/button-set.js';
import '../button/button.js';
import '../button/icon-button.js';
import '../calendar/calendar.js';
import '../menu/menu-item.js';
import '../menu/menu.js';
import '../ripple/ripple.js';
import { Datepicker } from './datepicker.js';

const inputOf = (el: Datepicker) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input')!;

suite('u-datepicker', () => {
  teardown(() => {
    document.querySelectorAll('u-datepicker').forEach((el) => el.remove());
  });

  suite('registration', () => {
    test('is registered as u-datepicker', () => {
      expect(customElements.get('u-datepicker')).to.equal(Datepicker);
    });

    test('is form-associated', () => {
      expect((Datepicker as unknown as { formAssociated: boolean }).formAssociated).to.be.true;
    });
  });

  suite('default property values', () => {
    test('locale defaults to null', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      expect(el.locale).to.equal(null);
    });

    test('format defaults to "short"', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      expect(el.format).to.equal('short');
    });

    test('editable defaults to false', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      expect(el.editable).to.be.false;
    });

    test('readOnly defaults to false', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      expect(el.readOnly).to.be.false;
    });

    test('menuPositioning defaults to "relative"', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      expect(el.menuPositioning).to.equal('relative');
    });
  });

  suite('input type swap', () => {
    test('inner input uses type="text" when not editable', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      expect(inputOf(el).type).to.equal('text');
    });

    test('inner input uses type="date" when editable', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker editable></u-datepicker>`);
      expect(inputOf(el).type).to.equal('date');
    });
  });

  suite('readonly behavior', () => {
    test('inner input is read-only when not editable', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      expect(inputOf(el).readOnly).to.be.true;
    });

    test('inner input is editable when editable=true and readOnly=false', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker editable></u-datepicker>`);
      expect(inputOf(el).readOnly).to.be.false;
    });

    test('inner input is read-only when readOnly=true even with editable=true', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker editable readonly></u-datepicker>`);
      expect(inputOf(el).readOnly).to.be.true;
    });
  });

  suite('reflection', () => {
    test('editable reflects to the editable attribute', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      el.editable = true;
      await el.updateComplete;
      expect(el.hasAttribute('editable')).to.be.true;
    });

    test('readOnly reflects to the read-only attribute', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      el.readOnly = true;
      await el.updateComplete;
      expect(el.hasAttribute('readonly')).to.be.true;
    });

    test('menuPositioning reflects to menu-positioning attribute', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker menu-positioning="fixed"></u-datepicker>`);
      expect(el.menuPositioning).to.equal('fixed');
    });
  });

  suite('value display formatting', () => {
    test('renders the ISO value in the inner input when editable=true', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker editable .value=${'2025-03-15'}></u-datepicker>`);
      await el.updateComplete;
      expect(inputOf(el).value).to.equal('2025-03-15');
    });

    test('format="iso" keeps the value as-is in the non-editable display', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker format="iso" .value=${'2025-03-15'}></u-datepicker>`);
      await el.updateComplete;
      expect(inputOf(el).value).to.equal('2025-03-15');
    });
  });

  suite('value-type', () => {
    test('defaults to iso', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker .value=${'2025-03-15'}></u-datepicker>`);
      expect(el.valueType).to.equal('iso');
      expect(el.value).to.equal('2025-03-15');
    });

    test('returns a Date object when value-type="date"', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker value-type="date" .value=${'2025-03-15'}></u-datepicker>`);
      expect(el.value).to.be.instanceOf(Date);
      expect((el.value as Date).getTime()).to.equal(new Date(2025, 2, 15).getTime());
    });

    test('returns null when empty and value-type="date"', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker value-type="date"></u-datepicker>`);
      expect(el.value).to.equal(null);
    });

    test('accepts a Date object regardless of value-type', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      el.value = new Date(2025, 2, 15);
      expect(el.value).to.equal('2025-03-15');
    });

    test('still submits the ISO string with the form when value-type="date"', async () => {
      const formEl = await fixture<HTMLFormElement>(html`
        <form><u-datepicker value-type="date" name="dt" .value=${new Date(2025, 2, 15)}></u-datepicker></form>
      `);
      const data = new FormData(formEl);
      expect(data.get('dt')).to.equal('2025-03-15');
    });

    test('min/max validation keeps working with Date values', async () => {
      const el = await fixture<Datepicker>(html`
        <u-datepicker value-type="date" min="2025-03-10" .value=${new Date(2025, 2, 5)}></u-datepicker>
      `);
      await el.updateComplete;
      expect(el.checkValidity()).to.be.false;
      expect(el.validity.rangeUnderflow).to.be.true;
    });
  });

  suite('min/max constraint validation', () => {
    test('min and max default to null', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker></u-datepicker>`);
      expect(el.min).to.equal(null);
      expect(el.max).to.equal(null);
    });

    test('a value before min reports rangeUnderflow', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker min="2025-03-10" .value=${'2025-03-05'}></u-datepicker>`);
      await el.updateComplete;
      expect(el.checkValidity()).to.be.false;
      expect(el.validity.rangeUnderflow).to.be.true;
    });

    test('a value after max reports rangeOverflow', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker max="2025-03-20" .value=${'2025-03-25'}></u-datepicker>`);
      await el.updateComplete;
      expect(el.checkValidity()).to.be.false;
      expect(el.validity.rangeOverflow).to.be.true;
    });

    test('a value inside [min, max] is valid', async () => {
      const el = await fixture<Datepicker>(html`
        <u-datepicker min="2025-03-10" max="2025-03-20" .value=${'2025-03-15'}></u-datepicker>
      `);
      await el.updateComplete;
      expect(el.checkValidity()).to.be.true;
    });

    test('an empty value is valid when not required', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker min="2025-03-10" max="2025-03-20"></u-datepicker>`);
      await el.updateComplete;
      expect(el.checkValidity()).to.be.true;
    });

    test('forwards min/max to the native input when editable', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker editable min="2025-03-10" max="2025-03-20"></u-datepicker>`);
      expect(inputOf(el).min).to.equal('2025-03-10');
      expect(inputOf(el).max).to.equal('2025-03-20');
    });

    test('forwards min/max to the calendar popover', async () => {
      const el = await fixture<Datepicker>(html`<u-datepicker min="2025-03-10" max="2025-03-20"></u-datepicker>`);
      const calendar = el.shadowRoot!.querySelector('u-calendar')!;
      expect(calendar.min).to.equal('2025-03-10');
      expect(calendar.max).to.equal('2025-03-20');
    });
  });

  suite('form association', () => {
    test('submits the current value with the form', async () => {
      const formEl = await fixture<HTMLFormElement>(html`
        <form><u-datepicker editable name="dt" .value=${'2025-03-15'}></u-datepicker></form>
      `);
      const data = new FormData(formEl);
      expect(data.get('dt')).to.equal('2025-03-15');
    });
  });
});
