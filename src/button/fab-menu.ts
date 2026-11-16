import { consume, provide } from '@lit/context';

import { html, HTMLTemplateResult, LitElement, nothing, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { scrollContainerContext } from '../scaffold/scroll-container-context.js';
import { fabMenuColorContext } from './fab-menu-color-context.js';
import { FabMenuItem } from './fab-menu-item.js';
import { fabMenuOpenContext } from './fab-menu-open-context.js';
import { styles } from './fab-menu.styles.js';
import { Fab, FabColor, FabSize } from './fab.js';

import './fab.js';

/**
 * A FAB that opens a menu of related actions (speed dial).
 *
 * The toggle FAB is rendered inside the shadow root: name it with `aria-label` on the `u-fab-menu` (forwarded to the
 * toggle, which also gets `aria-expanded`). While closed, the items are `inert` (out of the tab order and of the
 * accessibility tree). The menu closes when an item is clicked, on Escape (focus returns to the toggle) and on a
 * click outside it.
 *
 * @fires open - Before the menu opens. Cancelable.
 * @fires close - Before the menu closes. Cancelable.
 * @fires opened - After the open animation ends.
 * @fires closed - After the close animation ends.
 *
 * @slot - The `u-fab-menu-item`s.
 * @slot icon - The toggle icon while closed (e.g. `add`).
 * @slot close-icon - The toggle icon while open. Defaults to an "×".
 */
@customElement('u-fab-menu')
export class FabMenu extends LitElement {

  static override styles = [styles];

  /**
   * The FAB color variant to render.
   */
  @provide({ context: fabMenuColorContext })
  @property()
  color: FabColor = 'primary';

  /**
   * The size of the FAB.
   */
  @property() size: FabSize = 'medium';

  /**
   * Lowers the FAB's elevation.
   */
  @property({ type: Boolean, reflect: true }) lowered = false;

  @provide({ context: fabMenuOpenContext })
  @state()
  private _menuOpen = false;

  /**
   * Whether the menu is open. Setting it dispatches the cancelable `open`/`close` events, like the `.show()`,
   * `.close()` and `.toggle()` methods.
   */
  @property({ type: Boolean, reflect: true })
  get open(): boolean {
    return this._menuOpen;
  }

  set open(open: boolean) {
    open = !!open;

    if (open === this._menuOpen) {
      return;
    }

    if (this.hasUpdated && !this.#dispatchBefore(open)) {
      return;
    }

    const oldValue = this._menuOpen;
    this._menuOpen = open;
    this.requestUpdate('open', oldValue);

    if (this.hasUpdated) {
      void this.#dispatchAfterAnimations(open);
    }
  }

  @query('u-fab.toggle') private readonly _toggle!: Fab | null;
  @query('u-fab.toggle-container') private readonly _toggleContainer!: Fab | null;

  #animationGeneration = 0;

  /**
   * The element the FAB menu will observe for scroll. Accepts an
   * `HTMLElement`, the id of an element, `'window'` to use the window
   * scroll, or `'none'` to disable. When unset, the FAB menu consumes the
   * scroll container provided by an ancestor `u-scaffold` via context,
   * falling back to `'window'`. Reserved for future scroll-driven behaviors.
   */
  @property({ attribute: 'scroll-container' })
  scrollContainer: 'none' | 'window' | string | HTMLElement | undefined = undefined;

  @consume({ context: scrollContainerContext, subscribe: true })
  @state()
  protected readonly _scrollContainerFromContext!: HTMLElement | undefined;

  /**
   * The resolved scroll target according to the precedence
   * explicit > context > window. Returns `null` when the explicit value
   * is `'none'`.
   */
  protected get _effectiveScrollContainer(): HTMLElement | Window | null {
    const explicit = this.scrollContainer;

    if (explicit === 'none') {
      return null;
    }

    if (explicit instanceof HTMLElement) {
      return explicit;
    }

    if (typeof explicit === 'string' && explicit.length > 0) {
      if (explicit === 'window') {
        return window;
      }

      return document.getElementById(explicit);
    }

    return this._scrollContainerFromContext ?? window;
  }

  /**
   * `aria-label` names the toggle FAB, rendered in the shadow root.
   */
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'aria-label'];
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'aria-label') {
      this.requestUpdate();
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('keydown', this.#handleKeyDown);

    if (this.open) {
      document.addEventListener('click', this.#handleDocumentClick);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.#handleKeyDown);
    document.removeEventListener('click', this.#handleDocumentClick);
  }

  protected override async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);

    // The outer u-fab only reserves the toggle's size: keep its own (nameless) button out of the tab order and of
    // the accessibility tree.
    await this._toggleContainer?.updateComplete;
    const placeholderButton = this._toggleContainer?.buttonElement;
    placeholderButton?.setAttribute('tabindex', '-1');
    placeholderButton?.setAttribute('aria-hidden', 'true');
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!changedProperties.has('open')) {
      return;
    }

    if (this.open) {
      document.addEventListener('click', this.#handleDocumentClick);
      return;
    }

    document.removeEventListener('click', this.#handleDocumentClick);
  }

  /**
   * Focuses the toggle FAB.
   */
  override focus(options?: FocusOptions): void {
    this._toggle?.buttonElement?.focus(options);
  }

  /**
   * Opens the menu.
   */
  show(): void {
    this.open = true;
  }

  /**
   * Closes the menu.
   */
  close(): void {
    this.open = false;
  }

  /**
   * Opens the menu when closed, and closes it when open.
   */
  toggle(): void {
    this.open = !this.open;
  }

  protected override render(): HTMLTemplateResult {
    const containerClasses = classMap({
      open: this.open,
      [this.color]: true,
    });

    return html`
      <div class="container ${containerClasses}">
        <div
          class="menu-items"
          ?inert=${!this.open}
          @click=${this.#handleItemClick}>
          <slot @slotchange=${this.#handleIconItemsSlotChange}></slot>
        </div>
        <u-fab class="toggle-container" .size=${this.size}>
          <u-fab 
            class="toggle"
            .color=${this.color}
            .lowered=${this.lowered}
            .size=${this.open ? 'medium' : this.size}
            type="button"
            aria-label=${this.getAttribute('aria-label') || nothing}
            aria-expanded=${this.open ? 'true' : 'false'}
            @click=${this.#handleToggleClick}>
            <span class="icon-container" aria-hidden="true">
              <span class="icon icon-default">
                <slot name="icon"></slot>
              </span>
              <span class="icon icon-close">
                <slot name="close-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 -960 960 960" width="1em" fill="currentColor">
                    <path
                      d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                  </svg>
                </slot>
              </span>
            </span>
          </u-fab>
        </u-fab>
      </div>
    `;
  }

  #handleToggleClick(): void {
    this.toggle();
  }

  #handleItemClick(event: Event): void {
    const item = event.composedPath().find(target => target instanceof FabMenuItem);

    if (!item || item.disabled || event.defaultPrevented) {
      return;
    }

    const itemHadFocus = item.matches(':focus-within');
    this.close();

    // The item turns inert: send keyboard focus back to the toggle instead of losing it to the body.
    if (!this.open && itemHadFocus) {
      this.focus();
    }
  }

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.open) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.close();

    if (!this.open) {
      this.focus();
    }
  };

  readonly #handleDocumentClick = (event: Event): void => {
    if (event.composedPath().includes(this)) {
      return;
    }

    this.close();
  };

  /**
   * Dispatches `opened`/`closed` once the toggle morph and the items' transitions (all in shadow roots) finish.
   * A newer open/close in the meantime cancels the pending event.
   */
  async #dispatchAfterAnimations(open: boolean): Promise<void> {
    const generation = ++this.#animationGeneration;
    const items = this.#items();

    await this.updateComplete;
    await Promise.all(items.map(item => item.updateComplete));

    if (this._toggle) {
      await this._toggle.updateComplete;
    }

    const roots = [this.shadowRoot, this._toggle?.shadowRoot, ...items.map(item => item.shadowRoot)];
    const animations = roots.flatMap(root => root?.getAnimations() ?? []);

    await Promise.all(animations.map(animation => animation.finished.catch(() => undefined)));

    if (generation !== this.#animationGeneration) {
      return;
    }

    if (open) {
      this.dispatchEvent(new Event('opened'));
      return;
    }

    this.dispatchEvent(new Event('closed'));
  }

  /**
   * Dispatches the cancelable `open`/`close` event. Returns `false` when it was canceled.
   */
  #dispatchBefore(open: boolean): boolean {
    if (open) {
      return this.dispatchEvent(new Event('open', { cancelable: true }));
    }

    return this.dispatchEvent(new Event('close', { cancelable: true }));
  }

  #items(): FabMenuItem[] {
    return [...this.children].filter(element => element instanceof FabMenuItem);
  }

  #handleIconItemsSlotChange(event: Event) {
    const elements = (event.target as HTMLSlotElement).assignedElements({ flatten: true });

    let index = 0;

    for (const element of elements.filter(e => e instanceof FabMenuItem).reverse()) {
      element._index = index;
      index++;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'u-fab-menu': FabMenu;
  }
}
