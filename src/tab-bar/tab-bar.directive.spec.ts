import '@universal-material/web';

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TabBarDirective } from './tab-bar.directive';

@Component({
  template: `
    <u-tab-bar [(activeTabIndex)]="activeTabIndex">
      <u-tab>One</u-tab>
      <u-tab>Two</u-tab>
      <u-tab>Three</u-tab>
    </u-tab-bar>
  `,
  standalone: false,
})
class HostComponent {
  activeTabIndex = 0;
}

async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  host: HostComponent;
  el: any;
  directive: TabBarDirective;
}> {
  TestBed.configureTestingModule({
    declarations: [HostComponent],
    imports: [TabBarDirective],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();

  const el = (fixture.nativeElement as HTMLElement).querySelector('u-tab-bar') as any;

  // The tab-bar registers its slotted <u-tab>s asynchronously (after the
  // element's first `updateComplete`). Wait for that so `activeTabIndex` is
  // backed by real tabs rather than the empty initial state.
  if (el && typeof el.updateComplete?.then === 'function') {
    await el.updateComplete;
  }
  fixture.detectChanges();
  await fixture.whenStable();

  const directive = fixture.debugElement
    .query(By.directive(TabBarDirective))
    .injector.get(TabBarDirective);

  return { fixture, host: fixture.componentInstance, el, directive };
}

describe('TabBarDirective', () => {
  it('instantiates and upgrades the custom element', async () => {
    const { el, directive } = await setup();

    expect(directive).toBeTruthy();
    expect(el).toBeTruthy();
    // The element upgraded to the web component (has the custom `activeTabIndex` accessor).
    expect(typeof el.activeTabIndex).toBe('number');
  });

  it('syncs the initial bound activeTabIndex to the element', async () => {
    const { el, host } = await setup();

    expect(host.activeTabIndex).toBe(0);
    expect(el.activeTabIndex).toBe(0);
  });

  it('propagates the host activeTabIndex to the element', async () => {
    const { fixture, host, el } = await setup();

    host.activeTabIndex = 2;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.activeTabIndex).toBe(2);
  });

  it('updates the bound activeTabIndex when the element emits change', async () => {
    const { fixture, host, el } = await setup();

    el.activeTabIndex = 1;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.activeTabIndex).toBe(1);
  });
});
