import { expect, fixture, html, oneEvent } from '@open-wc/testing';

import { FabMenuItem } from './fab-menu-item.js';
import { FabMenu } from './fab-menu.js';
import { Fab } from './fab.js';

const toggleOf = (el: FabMenu) => el.shadowRoot!.querySelector<Fab>('u-fab.toggle')!;
const toggleButtonOf = (el: FabMenu) => toggleOf(el).shadowRoot!.querySelector<HTMLButtonElement>('button')!;

const menuWithItems = () =>
  fixture<FabMenu>(html`
    <u-fab-menu aria-label="Add">
      <span slot="icon">+</span>
      <u-fab-menu-item label="Enroll student"></u-fab-menu-item>
      <u-fab-menu-item label="Disabled" disabled></u-fab-menu-item>
    </u-fab-menu>
  `);

const settle = async (el: FabMenu) => {
  await el.updateComplete;
  await toggleOf(el).updateComplete;
};

const escapeKey = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true });

suite('u-fab-menu', () => {
  teardown(() => {
    document.querySelectorAll('u-fab-menu').forEach((el) => el.remove());
  });

  suite('toggle accessibility', () => {
    test('forwards the host aria-label to the toggle button', async () => {
      const el = await menuWithItems();
      await settle(el);
      expect(toggleButtonOf(el).getAttribute('aria-label')).to.equal('Add');
    });

    test('updates the toggle name when aria-label changes', async () => {
      const el = await menuWithItems();
      el.setAttribute('aria-label', 'Add record');
      await settle(el);
      expect(toggleButtonOf(el).getAttribute('aria-label')).to.equal('Add record');
    });

    test('exposes aria-expanded on the toggle button', async () => {
      const el = await menuWithItems();
      await settle(el);
      expect(toggleButtonOf(el).getAttribute('aria-expanded')).to.equal('false');

      el.open = true;
      await settle(el);
      expect(toggleButtonOf(el).getAttribute('aria-expanded')).to.equal('true');
    });

    test('keeps the size placeholder button out of the tab order and accessibility tree', async () => {
      const el = await menuWithItems();
      await settle(el);
      const placeholder = el.shadowRoot!.querySelector<Fab>('u-fab.toggle-container')!;
      await placeholder.updateComplete;
      const button = placeholder.shadowRoot!.querySelector('button')!;
      expect(button.getAttribute('tabindex')).to.equal('-1');
      expect(button.getAttribute('aria-hidden')).to.equal('true');
    });

    test('the toggle is not a submit button', async () => {
      const el = await menuWithItems();
      expect(toggleOf(el).type).to.equal('button');
    });

    test('focus() focuses the toggle button', async () => {
      const el = await menuWithItems();
      await settle(el);
      el.focus();
      expect(toggleOf(el).shadowRoot!.activeElement).to.equal(toggleButtonOf(el));
    });
  });

  suite('items while closed', () => {
    test('the items area is inert while closed', async () => {
      const el = await menuWithItems();
      const items = el.shadowRoot!.querySelector<HTMLElement>('.menu-items')!;
      expect(items.inert).to.be.true;

      el.open = true;
      await el.updateComplete;
      expect(items.inert).to.be.false;
    });
  });

  suite('open property and events', () => {
    test('reflects to the open attribute', async () => {
      const el = await menuWithItems();
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.true;

      el.open = false;
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.false;
    });

    test('starts open with the open attribute', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu open></u-fab-menu>`);
      expect(el.open).to.be.true;
      expect(el.shadowRoot!.querySelector('.container')!.classList.contains('open')).to.be.true;
    });

    test('dispatches open, then opened', async () => {
      const el = await menuWithItems();
      const events: string[] = [];
      el.addEventListener('open', () => events.push('open'));
      const opened = oneEvent(el, 'opened');
      el.show();
      expect(events).to.deep.equal(['open']);
      await opened;
      expect(el.open).to.be.true;
    });

    test('dispatches close, then closed', async () => {
      const el = await menuWithItems();
      el.open = true;
      await el.updateComplete;
      const events: string[] = [];
      el.addEventListener('close', () => events.push('close'));
      const closed = oneEvent(el, 'closed');
      el.close();
      expect(events).to.deep.equal(['close']);
      await closed;
      expect(el.open).to.be.false;
    });

    test('canceling open keeps the menu closed', async () => {
      const el = await menuWithItems();
      el.addEventListener('open', e => e.preventDefault());
      el.show();
      expect(el.open).to.be.false;
    });

    test('canceling close keeps the menu open', async () => {
      const el = await menuWithItems();
      el.open = true;
      el.addEventListener('close', e => e.preventDefault());
      el.close();
      expect(el.open).to.be.true;
    });

    test('toggle() flips open', async () => {
      const el = await menuWithItems();
      el.toggle();
      expect(el.open).to.be.true;
      el.toggle();
      expect(el.open).to.be.false;
    });
  });

  suite('closing', () => {
    test('clicking an item closes the menu', async () => {
      const el = await menuWithItems();
      el.open = true;
      await el.updateComplete;
      el.querySelector<FabMenuItem>('u-fab-menu-item')!.click();
      expect(el.open).to.be.false;
    });

    test('an item click handler that prevents default keeps the menu open', async () => {
      const el = await menuWithItems();
      el.open = true;
      await el.updateComplete;
      const item = el.querySelector<FabMenuItem>('u-fab-menu-item')!;
      item.addEventListener('click', e => e.preventDefault());
      item.click();
      expect(el.open).to.be.true;
    });

    test('clicking a disabled item does not close the menu', async () => {
      const el = await menuWithItems();
      el.open = true;
      await el.updateComplete;
      el.querySelector<FabMenuItem>('u-fab-menu-item[disabled]')!.click();
      expect(el.open).to.be.true;
    });

    test('closing from a focused item sends focus to the toggle', async () => {
      const el = await menuWithItems();
      el.open = true;
      await settle(el);
      const item = el.querySelector<FabMenuItem>('u-fab-menu-item')!;
      await item.updateComplete;
      item.focus();
      item.buttonElement.click();
      expect(el.open).to.be.false;
      expect(toggleOf(el).shadowRoot!.activeElement).to.equal(toggleButtonOf(el));
    });

    test('Escape closes the menu and focuses the toggle', async () => {
      const el = await menuWithItems();
      el.open = true;
      await settle(el);
      const item = el.querySelector<FabMenuItem>('u-fab-menu-item')!;
      await item.updateComplete;
      item.focus();
      const escape = escapeKey();
      item.buttonElement.dispatchEvent(escape);
      expect(el.open).to.be.false;
      expect(escape.defaultPrevented).to.be.true;
      expect(toggleOf(el).shadowRoot!.activeElement).to.equal(toggleButtonOf(el));
    });

    test('Escape while closed is left alone', async () => {
      const el = await menuWithItems();
      const escape = escapeKey();
      el.dispatchEvent(escape);
      expect(escape.defaultPrevented).to.be.false;
    });

    test('clicking outside closes the menu', async () => {
      const el = await menuWithItems();
      el.open = true;
      await el.updateComplete;
      document.body.click();
      expect(el.open).to.be.false;
    });

    test('clicking the toggle opens and closes the menu', async () => {
      const el = await menuWithItems();
      await settle(el);
      toggleButtonOf(el).click();
      expect(el.open).to.be.true;
      await el.updateComplete;
      toggleButtonOf(el).click();
      expect(el.open).to.be.false;
    });

    test('stops listening to outside clicks once disconnected', async () => {
      const el = await menuWithItems();
      el.open = true;
      await el.updateComplete;
      el.remove();
      document.body.click();
      expect(el.open).to.be.true;
    });
  });

  suite('registration', () => {
    test('is registered as u-fab-menu', () => {
      expect(customElements.get('u-fab-menu')).to.equal(FabMenu);
    });
  });

  suite('default property values', () => {
    test('color defaults to primary', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      expect(el.color).to.equal('primary');
    });

    test('size defaults to medium', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      expect(el.size).to.equal('medium');
    });

    test('lowered defaults to false', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      expect(el.lowered).to.be.false;
    });

    test('open defaults to false', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      expect(el.open).to.be.false;
    });
  });

  suite('rendering', () => {
    test('renders a container with a slot for menu items', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      const container = el.shadowRoot!.querySelector('.container');
      expect(container).to.exist;
      const slot = el.shadowRoot!.querySelector('.menu-items slot:not([name])');
      expect(slot).to.exist;
    });

    test('renders the toggle FAB', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      const toggle = el.shadowRoot!.querySelector('u-fab.toggle');
      expect(toggle).to.exist;
    });

    test('applies "open" class to the container when open is true', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      el.open = true;
      await el.updateComplete;
      const container = el.shadowRoot!.querySelector('.container')!;
      expect(container.classList.contains('open')).to.be.true;
    });

    test('applies the color class to the container', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu .color=${'tertiary'}></u-fab-menu>`);
      const container = el.shadowRoot!.querySelector('.container')!;
      expect(container.classList.contains('tertiary')).to.be.true;
    });
  });

  suite('toggle interaction', () => {
    test('clicking the inner toggle FAB flips open', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      const toggle = el.shadowRoot!.querySelector<HTMLElement>('u-fab.toggle')!;
      expect(el.open).to.be.false;
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      expect(el.open).to.be.true;
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      expect(el.open).to.be.false;
    });
  });

  suite('lowered property', () => {
    test('reflects to the lowered attribute', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      el.lowered = true;
      await el.updateComplete;
      expect(el.hasAttribute('lowered')).to.be.true;
    });
  });

  suite('scrollContainer resolution', () => {
    type FabMenuInternals = { _effectiveScrollContainer: HTMLElement | Window | null };
    const internals = (el: FabMenu) => el as unknown as FabMenuInternals;

    test('returns window when unset', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu></u-fab-menu>`);
      expect(internals(el)._effectiveScrollContainer).to.equal(window);
    });

    test('returns null when explicitly set to "none"', async () => {
      const el = await fixture<FabMenu>(html`<u-fab-menu scroll-container="none"></u-fab-menu>`);
      expect(internals(el)._effectiveScrollContainer).to.equal(null);
    });

    test('returns the element with matching id when set to an id string', async () => {
      const wrap = await fixture<HTMLElement>(html`
        <div>
          <div id="scroll-target"></div>
          <u-fab-menu scroll-container="scroll-target"></u-fab-menu>
        </div>
      `);
      const fm = wrap.querySelector('u-fab-menu') as FabMenu;
      const target = wrap.querySelector('#scroll-target');
      expect(internals(fm)._effectiveScrollContainer).to.equal(target);
    });
  });
});
