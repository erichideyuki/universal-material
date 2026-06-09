import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DropdownModule } from './dropdown.module';
import { DropdownDirective } from './dropdown.directive';
import { DropdownToggleDirective } from './dropdown-toggle.directive';
import { DropdownMenuDirective } from './dropdown-menu.directive';

@Component({
  template: `
    <div uDropdown [autoClose]="autoClose" [class.host]="true">
      <button type="button" uDropdownToggle>Toggle</button>
      <div uDropdownMenu [direction]="direction">
        <button type="button" class="item">Item</button>
      </div>
    </div>
  `,
  standalone: false,
})
class HostComponent {
  autoClose: boolean | 'outside' = true;
  direction: any = null;
}

describe('Dropdown directives', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DropdownModule],
      declarations: [HostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function dropdown(): DropdownDirective {
    return fixture.debugElement
      .query(By.directive(DropdownDirective))
      .injector.get(DropdownDirective);
  }

  function toggle(): DropdownToggleDirective {
    return fixture.debugElement
      .query(By.directive(DropdownToggleDirective))
      .injector.get(DropdownToggleDirective);
  }

  function menu(): DropdownMenuDirective {
    return fixture.debugElement
      .query(By.directive(DropdownMenuDirective))
      .injector.get(DropdownMenuDirective);
  }

  function menuEl(): HTMLElement {
    return fixture.debugElement.query(By.directive(DropdownMenuDirective))
      .nativeElement as HTMLElement;
  }

  it('instantiates the directive family and renders the host', () => {
    expect(dropdown()).toBeInstanceOf(DropdownDirective);
    expect(toggle()).toBeInstanceOf(DropdownToggleDirective);
    expect(menu()).toBeInstanceOf(DropdownMenuDirective);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[uDropdownToggle]')).toBeTruthy();
    expect(root.querySelector('[uDropdownMenu]')).toBeTruthy();
  });

  it('starts closed: menu has no "show" class', () => {
    expect(menu().show).toBeFalse();
    expect(menuEl().classList.contains('show')).toBeFalse();
  });

  it('open()/toggle()/close() drive the menu show state and class', () => {
    const dd = dropdown();

    dd.open();
    fixture.detectChanges();
    expect(menu().show).toBeTrue();
    expect(menuEl().classList.contains('show')).toBeTrue();

    dd.toggle();
    fixture.detectChanges();
    expect(menu().show).toBeFalse();
    expect(menuEl().classList.contains('show')).toBeFalse();

    dd.toggle();
    fixture.detectChanges();
    expect(menu().show).toBeTrue();

    dd.close();
    fixture.detectChanges();
    expect(menu().show).toBeFalse();
  });

  it('clicking the toggle opens the menu', () => {
    const toggleEl = fixture.debugElement.query(
      By.directive(DropdownToggleDirective),
    ).nativeElement as HTMLElement;

    toggleEl.click();
    fixture.detectChanges();

    expect(menu().show).toBeTrue();
    expect(menuEl().classList.contains('show')).toBeTrue();
  });

  it('applies a non-auto direction as a CSS class on the menu', () => {
    fixture.componentInstance.direction = 'down-left';
    fixture.detectChanges();

    expect(menuEl().classList.contains('down-left')).toBeTrue();
  });
});
