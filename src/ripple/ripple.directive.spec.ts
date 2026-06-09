import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RippleModule } from '../ripple/ripple.module';

@Component({
  template: `<div uRipple [rippleDisabled]="disabled"></div>`,
  standalone: false,
})
class HostComponent {
  disabled = false;
}

describe('RippleDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RippleModule],
      declarations: [HostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    el = (fixture.nativeElement as HTMLElement).querySelector('[uRipple]') as HTMLElement;
  });

  it('upgrades the host element and makes it a positioned container', () => {
    // ngAfterViewInit sets position: relative when the element is statically positioned.
    expect(el).toBeTruthy();
    expect(el.style.position).toBe('relative');
  });

  it('synchronously inserts a ripple wrapper on mousedown', () => {
    expect(el.querySelector('.u-ripple-wrapper')).toBeNull();

    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 5, clientY: 5 }));

    const wrapper = el.querySelector('.u-ripple-wrapper');
    expect(wrapper).not.toBeNull();
    // The wrapper holds the actual ripple element, inserted as the first child.
    expect(wrapper!.querySelector('.u-ripple')).not.toBeNull();
    expect(el.firstElementChild).toBe(wrapper);
  });

  it('does not create a ripple on mousedown when rippleDisabled is set', () => {
    host.disabled = true;
    fixture.detectChanges();

    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 5, clientY: 5 }));

    expect(el.querySelector('.u-ripple-wrapper')).toBeNull();
  });
});
