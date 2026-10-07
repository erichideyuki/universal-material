import { consume } from '@lit/context';
import { CSSResultGroup } from '@lit/reactive-element/css-tag';

import { property, state } from 'lit/decorators.js';

import { compactContext } from '../shared/compact-context.js';
import { ButtonBase } from './button-base.js';
import { styles } from './toggle-button.styles.js';

export type ButtonShape = 'round' | 'square';
export type ButtonSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';

export abstract class ToggleButton extends ButtonBase {

  static override styles: CSSResultGroup = [ButtonBase.styles, styles];

  /**
   * When true, the button will toggle between selected and unselected
   * states
   */
  @property({ type: Boolean, reflect: true }) toggle = false;

  /**
   * When true, the button will toggle between round and square shapes
   */
  @property({ attribute: 'toggle-shape', type: Boolean, reflect: true }) toggleShape = false;

  /**
   * Sets the selected state
   */
  @property({ type: Boolean, reflect: true }) selected = false;

  /**
   * Sets the shape of the button
   */
  @property({ reflect: true }) shape: ButtonShape = 'round';

  /**
   * Sets the size of the button. When omitted, defaults to `small`, or
   * `extra-small` when the button sits inside a compact context (e.g.
   * `provideCompact(document.body)`).
   */
  @property({ reflect: true }) size: ButtonSize | undefined = 'small';

  /**
   * The `aria-label` of the button when the button is toggleable and selected.
   */
  @property({ attribute: 'aria-label-selected' }) ariaLabelSelected = '';

  @consume({ context: compactContext, subscribe: true })
  @state()
  private readonly _compactContext: boolean | undefined;

  @state() _hasSelectionIcon = false;

  constructor() {
    super();
    // Reset to `undefined` so an explicitly set `size` can be told apart from
    // the default, letting the compact context pick `extra-small` (see gotcha
    // #1 in CLAUDE.md — a reflected default can't be detected via attributes).
    this.size = undefined;
  }

  protected get _resolvedSize(): ButtonSize {
    return this.size ?? (this._compactContext ? 'extra-small' : 'small');
  }

  protected override _getContainerClasses(): Record<string, boolean> {
    return {
      ...super._getContainerClasses(),
      [this.shape]: true,
      [this._resolvedSize]: true,
      selected: this.selected,
      toggle: this.toggle,
      'toggle-shape': this.toggleShape,
      'selection-icon': this._hasSelectionIcon,
    };
  }

  protected override _handleClick(event: UIEvent): void {
    super._handleClick(event);

    if (!this.toggle) {
      return;
    }

    this.selected = !this.selected;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  override getAriaLabel(): string | null {
    return this.selected
      ? this.ariaLabelSelected || super.getAriaLabel()
      : super.getAriaLabel();
  }

  protected _handleSelectedIconSlotChange(e: Event): void {
    this._hasSelectionIcon = (e.target as HTMLSlotElement).assignedElements({ flatten: true }).length > 0;
  }
}
