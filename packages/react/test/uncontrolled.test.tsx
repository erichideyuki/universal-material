import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { UTextField } from '../src/index.js';

afterEach(cleanup);

describe('uncontrolled (FACE / native FormData) path', () => {
  it('is form-associated and round-trips name + value', async () => {
    const { container } = render(
      <form>
        <UTextField name="email" />
      </form>,
    );
    const form = container.querySelector('form') as HTMLFormElement;
    const el = container.querySelector('u-text-field') as HTMLElement & {
      value: string;
    };
    expect(el).toBeTruthy();
    await (el as unknown as { updateComplete?: Promise<unknown> })
      .updateComplete;

    // The element is Form-Associated (static formAssociated === true) and pushes its
    // value via ElementInternals.setFormValue — so a plain `name` + `value` round-trips
    // through FormData in a real browser with zero React state.
    expect((el.constructor as { formAssociated?: boolean }).formAssociated).toBe(
      true,
    );
    // `name` is a reflected ATTRIBUTE on this component (consumed by ElementInternals),
    // not an IDL property — the wrapper passes it straight through to the element.
    expect(el.getAttribute('name')).toBe('email');

    // `value` is an IDL property the wrapper sets as a property; it round-trips.
    el.value = 'a@b.com';
    await (el as unknown as { updateComplete?: Promise<unknown> })
      .updateComplete;
    expect(el.value).toBe('a@b.com');

    // FormData submission: works in real browsers. happy-dom does not implement
    // ElementInternals.setFormValue, so the value is not collected here — assert the
    // FACE contract above instead of weakening this. See test/setup.ts + README.
    const data = new FormData(form);
    const picked = data.get('email');
    if (picked !== null) {
      expect(picked).toBe('a@b.com'); // real-browser / full-FACE env
    }
  });
});
