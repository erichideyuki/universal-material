import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';
import { UTextField } from '../src/index.js';

afterEach(cleanup);

function ControlledForm({ onChange }: { onChange: (v: unknown) => void }) {
  const { control } = useForm<FieldValues>({ defaultValues: { email: '' } });
  return (
    <form>
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <UTextField
            value={field.value as string}
            onChange={(e) => {
              const v = (e.target as HTMLInputElement).value;
              field.onChange(v); // RHF controlled binding
              onChange(v);
            }}
          />
        )}
      />
    </form>
  );
}

describe('react-hook-form Controller (controlled) binding', () => {
  it('forwards e.target.value to field.onChange on `change`', () => {
    const spy = vi.fn();
    const { container } = render(<ControlledForm onChange={spy} />);
    const el = container.querySelector('u-text-field') as HTMLElement & {
      value: string;
    };
    expect(el).toBeTruthy();

    el.value = 'a@b.com';
    // `change` bubbles (native parity); @lit/react listens on the host element.
    // Wrap in act() so the resulting RHF state update is flushed.
    act(() => {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('a@b.com');
  });
});
