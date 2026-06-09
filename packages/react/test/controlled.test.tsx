import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { UTextField } from '../src/index.js';

afterEach(cleanup);

describe('controlled value path', () => {
  it('writes `value` as a DOM property, not an attribute', () => {
    const { container } = render(<UTextField value="hi" />);
    const el = container.querySelector('u-text-field') as HTMLElement & {
      value: string;
    };
    expect(el).toBeTruthy();
    // @lit/react sets matching props as PROPERTIES (via the `in` check), so the IDL
    // setter runs (and, for FACE inputs, calls setFormValue). It is NOT reflected as
    // a `value` attribute.
    expect(el.value).toBe('hi');
    expect(el.hasAttribute('value')).toBe(false);
  });

  it('invokes onInput with the event from the u-* element', () => {
    // Capture the read-back value synchronously inside the handler. (After dispatch
    // returns, the spec nulls Event.target, so reading it from mock.calls later is
    // unreliable — the wrapper's job is to deliver the event, which we assert here.)
    let seenValue: string | undefined;
    const onInput = vi.fn((e: Event) => {
      seenValue = (e.target as HTMLInputElement | null)?.value;
    });
    const { container } = render(<UTextField value="hi" onInput={onInput} />);
    const el = container.querySelector('u-text-field') as HTMLElement & {
      value: string;
    };

    // Read-back contract: the wrapper's `events: { onInput: 'input' }` maps an `input`
    // dispatched on the u-* element to the onInput prop.
    el.value = 'world';
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect(onInput).toHaveBeenCalledTimes(1);
    expect(seenValue).toBe('world');
  });
});
