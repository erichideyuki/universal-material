import { expect, fixture, html } from '@open-wc/testing';

import '../calendar/calendar.js';
import '../datepicker/datepicker.js';
import { Calendar } from '../calendar/calendar.js';
import { Datepicker } from '../datepicker/datepicker.js';
import { provideLocale } from './locale-context.js';

suite('locale context', () => {
  const appendTo = async <T extends HTMLElement>(root: HTMLElement, tagName: string): Promise<T> => {
    const el = document.createElement(tagName) as T;
    root.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    return el;
  };

  test('calendar falls back to navigator.language without a context', async () => {
    const calendar = await fixture<Calendar>(html`<u-calendar></u-calendar>`);

    expect(calendar._innerLocale).to.equal(navigator.language);
  });

  test('calendar uses the context locale when it has no explicit locale', async () => {
    const root = await fixture<HTMLDivElement>(html`<div></div>`);
    provideLocale(root, 'pt-BR');
    const calendar = await appendTo<Calendar>(root, 'u-calendar');

    expect(calendar._innerLocale).to.equal('pt-BR');
  });

  test('explicit calendar locale wins over the context locale', async () => {
    const root = await fixture<HTMLDivElement>(html`<div></div>`);
    provideLocale(root, 'pt-BR');
    const calendar = await appendTo<Calendar>(root, 'u-calendar');
    calendar.locale = 'en-US';
    await calendar.updateComplete;

    expect(calendar._innerLocale).to.equal('en-US');
  });

  test('calendar follows context locale updates', async () => {
    const root = await fixture<HTMLDivElement>(html`<div></div>`);
    const provider = provideLocale(root, 'pt-BR');
    const calendar = await appendTo<Calendar>(root, 'u-calendar');

    provider.setValue('es-ES');
    await calendar.updateComplete;

    expect(calendar._innerLocale).to.equal('es-ES');
  });

  test('datepicker formats the display value with the context locale', async () => {
    const root = await fixture<HTMLDivElement>(html`<div></div>`);
    provideLocale(root, 'pt-BR');
    const datepicker = await appendTo<Datepicker>(root, 'u-datepicker');
    datepicker.format = 'long';
    datepicker.value = '2026-06-15';
    await datepicker.updateComplete;

    const input = datepicker.shadowRoot!.querySelector<HTMLInputElement>('input')!;
    const expected = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(2026, 5, 15));

    expect(input.value).to.equal(expected);
  });
});
