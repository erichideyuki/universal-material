import { expect, fixture, html, oneEvent } from '@open-wc/testing';

import '../chip/chip.js';
import { ChipField } from './chip-field.js';

const inputOf = (el: ChipField) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input')!;

suite('u-chip-field', () => {
  teardown(() => {
    document.querySelectorAll('u-chip-field').forEach((el) => el.remove());
  });

  suite('registration', () => {
    test('is registered as u-chip-field', () => {
      expect(customElements.get('u-chip-field')).to.equal(ChipField);
    });

    test('is form-associated (via TextFieldBase)', () => {
      expect((ChipField as unknown as { formAssociated: boolean }).formAssociated).to.be.true;
    });
  });

  suite('default property values', () => {
    test('value defaults to undefined (empty getter)', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="tags"></u-chip-field>`);
      // the internal #value is empty array via mutation; the getter returns the array
      expect(el.value).to.deep.equal([]);
    });

    test('manual defaults to false', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      expect(el.manual).to.be.false;
    });
  });

  suite('add() / removeAt()', () => {
    test('add() pushes a value', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      el.add('a');
      el.add('b');
      expect(el.value).to.deep.equal(['a', 'b']);
    });

    test('removeAt() splices the value at the given index', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      el.add('a');
      el.add('b');
      el.add('c');
      el.removeAt(1);
      expect(el.value).to.deep.equal(['a', 'c']);
    });

    test('add(value, true) fires a change event', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      setTimeout(() => el.add('a', true));
      const event = await oneEvent(el, 'change');
      expect(event).to.exist;
    });

    test('removeAt(index, true) fires a change event', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      el.add('a');
      setTimeout(() => el.removeAt(0, true));
      const event = await oneEvent(el, 'change');
      expect(event).to.exist;
    });
  });

  suite('Enter key adds a value', () => {
    test('typing then Enter adds the input value to the list', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      await el.updateComplete;
      const input = inputOf(el);
      input.value = 'tag1';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.value).to.deep.equal(['tag1']);
    });

    test('manual=true makes Enter a no-op', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t" .manual=${true}></u-chip-field>`);
      await el.updateComplete;
      const input = inputOf(el);
      input.value = 'tag1';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.value).to.deep.equal([]);
    });
  });

  suite('form association', () => {
    test('submits a FormData entry per value, using the name attribute', async () => {
      const formEl = await fixture<HTMLFormElement>(html`
        <form><u-chip-field name="tags"></u-chip-field></form>
      `);
      const cf = formEl.querySelector('u-chip-field') as ChipField;
      cf.add('a');
      cf.add('b');
      cf.add('c');
      await cf.updateComplete;
      const data = new FormData(formEl);
      expect(data.getAll('tags')).to.deep.equal(['a', 'b', 'c']);
    });

    test('the formatter does not affect the submitted value', async () => {
      const formEl = await fixture<HTMLFormElement>(html`
        <form><u-chip-field name="tags"></u-chip-field></form>
      `);
      const cf = formEl.querySelector('u-chip-field') as ChipField;
      cf.formatter = (v: string) => `<b>${v.toUpperCase()}</b>`;
      cf.add('a');
      cf.add('b');
      await cf.updateComplete;
      const data = new FormData(formEl);
      expect(data.getAll('tags')).to.deep.equal(['a', 'b']);
    });
  });

  suite('formatter', () => {
    const chipOf = (el: ChipField) => el.shadowRoot!.querySelector('u-chip')!;

    test('renders the formatter output as HTML', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      el.formatter = (p: { name: string }) => `<b class="name">${p.name}</b>`;
      el.value = [{ name: 'Ana' }];
      await el.updateComplete;
      const bold = chipOf(el).querySelector('b.name');
      expect(bold).to.exist;
      expect(bold!.textContent).to.equal('Ana');
    });

    test('sanitizes the formatter output', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      el.formatter = (v: string) => `<img src="x" onerror="window.__chipXss = true"><script>window.__chipXss = true</script>${v}`;
      el.value = ['a'];
      await el.updateComplete;
      const chip = chipOf(el);
      expect(chip.querySelector('script')).to.be.null;
      expect(chip.querySelector('img')!.hasAttribute('onerror')).to.be.false;
    });

    test('renders an HTMLElement returned by the formatter', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      el.formatter = (v: string) => {
        const badge = document.createElement('u-test-badge');
        badge.textContent = v;
        return badge;
      };
      el.value = ['Ana'];
      await el.updateComplete;
      expect(chipOf(el).querySelector('u-test-badge')!.textContent).to.equal('Ana');
    });

    test('renders a TemplateResult returned by the formatter, custom elements included', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      el.formatter = (p: { name: string }) => html`<u-test-badge .person=${p}>${p.name}</u-test-badge>`;
      const person = { name: 'Ana' };
      el.value = [person];
      await el.updateComplete;
      const badge = chipOf(el).querySelector('u-test-badge') as HTMLElement & { person: unknown };
      expect(badge.textContent).to.equal('Ana');
      expect(badge.person).to.equal(person);
    });

    test('renders raw values as plain text when no formatter is set', async () => {
      const el = await fixture<ChipField>(html`<u-chip-field name="t"></u-chip-field>`);
      el.value = ['<b>tag</b>'];
      await el.updateComplete;
      const chip = chipOf(el);
      expect(chip.querySelector('b')).to.be.null;
      expect(chip.textContent).to.contain('<b>tag</b>');
    });
  });
});
