import { AfterContentInit, Directive, ElementRef, EventEmitter, HostListener, Output, contentChild, input, inject } from '@angular/core';

import { DropdownToggleDirective } from './dropdown-toggle.directive';
import { DropdownMenuDirective } from './dropdown-menu.directive';

@Directive({
  selector: '[uDropdown]',
  standalone: false,
})
export class DropdownDirective implements AfterContentInit {
  private readonly _elementRef = inject(ElementRef);


  private _justToggle = false;

  readonly autoClose = input<boolean | 'outside'>(true);

  readonly _dropdownToggle = contentChild(DropdownToggleDirective);
  readonly _dropdownMenu = contentChild.required(DropdownMenuDirective);

  @HostListener('window:click') _windowClick() {
    if (this._justToggle) {
      this._justToggle = false;
      return;
    }

    const _dropdownMenu = this._dropdownMenu();
    const autoClose = this.autoClose();
    if ((autoClose === 'outside' || autoClose) && _dropdownMenu.show) {
      _dropdownMenu.show = false;
    }
  }

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {

  }

  private _autoClose() {
    const _dropdownMenu = this._dropdownMenu();
    if (this.autoClose() && _dropdownMenu.show) {
      _dropdownMenu.show = false;
    }
  }

  ngAfterContentInit() {

    this._dropdownToggle()?.click.subscribe(() => this.toggle());

    this._dropdownMenu().click.subscribe(() => {

      const _dropdownMenu = this._dropdownMenu();
      const autoClose = this.autoClose();
      if (autoClose && autoClose !== 'outside' && _dropdownMenu.show) {
        _dropdownMenu.show = false;
      }
    });
  }

  toggle(): void {
    this._justToggle = true;

    if (!this._dropdownMenu().show) {
      this.open();
      return;
    }

    this.close();
  }

  open(): void {
    const _dropdownMenu = this._dropdownMenu();
    const direction = _dropdownMenu.direction();
    if (direction && direction.indexOf('auto') === 0) {
      _dropdownMenu.setDirectionClass(`${this.openDropdownUpOrDown()}${direction.substring(4)}`);
    }

    _dropdownMenu.show = true;
  }

  close(): void {
    this._dropdownMenu().show = false;
  }

  openDropdownUpOrDown(): string {
    const menuElement = this._dropdownMenu()._elementRef.nativeElement;
    const dropdownElement = this._elementRef.nativeElement;
    const rect = dropdownElement.getBoundingClientRect() as DOMRect;
    const styles = getComputedStyle(menuElement);
    return window.innerHeight < rect.y + rect.height + parseInt(styles.height, 10) ? 'up' : 'down';
  }
}

