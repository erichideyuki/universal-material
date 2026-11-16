import { CSSResultGroup } from '@lit/reactive-element/css-tag';

import { html, HTMLTemplateResult, LitElement, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import { Ripple } from '../ripple/ripple.js';
import { styles as baseStyles } from './base.styles.js';
import { styles } from './button-wrapper.styles.js';
import { redispatchEvent } from './events/redispatch-event.js';

import '../elevation/elevation.js';
import '../ripple/ripple.js';

export abstract class ButtonWrapper extends LitElement {
  static override styles: CSSResultGroup = [baseStyles, styles];

  /**
   * Whether the button is disabled or not.
   */
  @property({ type: Boolean, reflect: true }) disabled = false;

  @state() renderRipple = true;

  /**
   * The URL that the link button points to.
   */
  @property() href: string | undefined;

  /**
   * Where to display the linked `href` URL for a link button. Common options
   * include `_blank` to open in a new tab.
   */
  @property() target: string | undefined;

  /**
   * The form field name associated with the button when submitting a form
   */
  @property() name: string | undefined;

  @query('.button') readonly buttonElement!: HTMLElement;
  @query('u-ripple') private readonly _ripple!: Ripple;

  protected innerRole: string | null = null;

  get pathname(): string {
    return (this.buttonElement as HTMLAnchorElement)?.pathname;
  }

  protected override render(): HTMLTemplateResult {

    const contents = typeof this.href === 'string'
      ? this.#renderLink()
      : this.#renderButton();

    const containerClasses = classMap(this._getContainerClasses());

    return html`<div class="container ${containerClasses}" part="container"> ${contents}</div>`;
  }

  protected _getContainerClasses(): Record<string, boolean> {
    return { disabled: this.disabled };
  }

  #renderButton() {
    return html`
      <div class="content">${this._renderContent()}</div>
      <button
        id="button"
        class="button focus-ring"
        ?disabled=${this.disabled}
        aria-label=${this.getAriaLabel() || nothing}
        aria-labelledby="${this.getAriaLabel() ? nothing : 'text'}"
        aria-selected=${ifDefined(this.#ariaSelectedAttribute())}
        aria-expanded=${ifDefined(this.#ariaExpandedAttribute())}
        .role=${this.innerRole}
        type="button"
        @click=${this.#innerClickHandler}>
        <u-ripple ?disabled=${this.disabled || !this.renderRipple}></u-ripple>
        <u-elevation></u-elevation>
      </button>
    `;
  }

  #renderLink() {
    return html`
      <div class="content">${this._renderContent()}</div>
      <a
        id="link"
        class="button"
        href=${this.disabled ? nothing : ifDefined(this.href)}
        aria-disabled=${this.disabled || nothing}
        aria-label=${this.getAriaLabel() || nothing}
        aria-labelledby="${this.getAriaLabel() ? nothing : 'text'}"
        aria-selected=${ifDefined(this.#ariaSelectedAttribute())}
        aria-expanded=${ifDefined(this.#ariaExpandedAttribute())}
        .role=${this.innerRole}
        target=${this.target || nothing}
        @click=${this.#innerClickHandler}>
        <u-elevation></u-elevation>
        <u-ripple ?disabled=${this.disabled || !this.renderRipple}></u-ripple>
      </a>
    `;
  }

  protected abstract _renderContent(): HTMLTemplateResult;

  /**
   * `aria-label` and `aria-expanded` on the host are forwarded to the inner button/link at render time, so changing
   * them after the first render must request an update.
   */
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'aria-label', 'aria-expanded'];
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'aria-label' || name === 'aria-expanded') {
      this.requestUpdate();
    }
  }

  override connectedCallback() {
    super.connectedCallback();

    this.addEventListener('focus', this.#innerFocusHandler);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener('focus', this.#innerFocusHandler);
  }

  override focus() {
    this.buttonElement?.focus();
  }

  override blur() {
    this.buttonElement?.blur();
  }

  protected getAriaLabel(): string | null {
    return this.ariaLabel;
  }

  /**
   * `aria-selected` of the inner button/link. `null` (the default) leaves the attribute out; subclasses whose
   * `innerRole` supports selection (e.g. `tab`) return their selected state.
   */
  protected getAriaSelected(): boolean | null {
    return null;
  }

  /**
   * `aria-expanded` of the inner button/link: the host's `aria-expanded` attribute (e.g. a FAB or icon button that
   * opens a menu). `null` (the default, without the attribute) leaves it out.
   */
  protected getAriaExpanded(): boolean | null {
    const value = this.getAttribute('aria-expanded');

    if (value === null || value === 'undefined') {
      return null;
    }

    return value === 'true';
  }

  #ariaExpandedAttribute(): 'true' | 'false' | undefined {
    const expanded = this.getAriaExpanded();

    if (expanded === null) {
      return undefined;
    }

    return expanded ? 'true' : 'false';
  }

  #ariaSelectedAttribute(): 'true' | 'false' | undefined {
    const selected = this.getAriaSelected();

    if (selected === null) {
      return undefined;
    }

    return selected ? 'true' : 'false';
  }

  #innerFocusHandler(): void {
    const tabIndexAttributeValue = this.getAttribute('tabindex');

    if (tabIndexAttributeValue !== '0') {
      return;
    }

    this.removeAttribute('tabindex');
    setTimeout(() => this.buttonElement?.focus());
  }

  #innerClickHandler(event: MouseEvent): void {
    if (this.disabled) {
      return;
    }

    const preventDefault = !redispatchEvent(this, event);

    if (preventDefault) {
      return;
    }

    if (!(event as PointerEvent).pointerType) {
      this._ripple.createRipple();
    }

    this._handleClick(event);
  }

  protected _handleClick(_: UIEvent): void {
  }
}
