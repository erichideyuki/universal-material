import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingActionBehaviorDirective } from './floating-action-behavior.directive';

@Component({
  template: `<div uFloatingActionBehavior></div>`,
  standalone: false,
})
class HostComponent {}

describe('FloatingActionBehaviorDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FloatingActionBehaviorDirective],
      declarations: [HostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    el = (fixture.nativeElement as HTMLElement).querySelector(
      '[uFloatingActionBehavior]',
    ) as HTMLElement;
  });

  it('instantiates and upgrades the host element without error', () => {
    expect(el).toBeTruthy();
  });

  it('applies the transform transition to the host in the constructor', () => {
    // The directive sets `transform 150ms linear` synchronously on construction.
    expect(el.style.transition).toBe('transform 150ms linear');
  });

  it('does not translate the host on its initial scroll-state read', () => {
    // ngAfterContentInit wires the scroll wrapper, which emits the current
    // scrollTop immediately. The first emission only records the baseline and
    // returns, so no transform is applied to the host yet.
    expect(el.style.transform).toBe('');
  });
});
