import { consume } from '@lit/context';

import { LitElement, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';

import { MixinBase, MixinReturn } from './mixin.js';
import { compactContext } from './compact-context.js';

export interface CompactInterface {
  /**
   * Renders the component in a denser layout intended for desktop apps.
   * When omitted, falls back to the value provided by the surrounding
   * `compactContext` (e.g. `provideCompact(document.body)`), or `false`.
   */
  compact: boolean | undefined;
  readonly isCompact: boolean;
}

/**
 * Mixes desktop "compact" density support into a `LitElement`. The element
 * gains a `compact` boolean property/attribute, consumes `compactContext`
 * for the inherited default, and reflects the resolved state to a
 * `data-compact` attribute so styles can key off `:host([data-compact])`.
 *
 * A separate reflected attribute (`data-compact`) is used on purpose: the
 * public `compact` attribute is left as an input-only observed attribute so
 * that "unset" (fall back to context) stays distinguishable from an explicit
 * `false` — writing the resolved value back to `compact` would clobber that.
 */
export const mixinCompact = <T extends MixinBase<LitElement>>(
  base: T,
): MixinReturn<T, CompactInterface> => {
  abstract class CompactElement extends base implements CompactInterface {
    @property({ type: Boolean }) compact: boolean | undefined = undefined;

    @consume({ context: compactContext, subscribe: true })
    @state()
    protected _compactContext: boolean | undefined;

    get isCompact(): boolean {
      return this.compact ?? this._compactContext ?? false;
    }

    protected override updated(changed: PropertyValues): void {
      super.updated(changed);
      this.toggleAttribute('data-compact', this.isCompact);
    }
  }

  return CompactElement;
};
