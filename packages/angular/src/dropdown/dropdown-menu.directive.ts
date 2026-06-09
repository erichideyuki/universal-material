import { Directive, ElementRef, HostBinding, HostListener, OnChanges, SimpleChanges, input, inject } from '@angular/core';
import { Subject } from 'rxjs';

import { Direction } from '../util/direction';

const autoDirection = 'auto';

@Directive({
  selector: '[uDropdownMenu]',
  standalone: false,
})
export class DropdownMenuDirective implements OnChanges {
  readonly _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);


  click = new Subject<void>();

  private _innerDirection: Direction | null = null;

  @HostBinding('class.show') show = false;
  readonly direction = input<Direction | null>(null);

  @HostListener('click', ['$event']) _click = (e: Event) => {
    e.stopPropagation();
    this.click.next();
  }

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['direction']) {
      return;
    }

    const directionChange = changes['direction'];

    if (directionChange.currentValue && directionChange.currentValue.indexOf(autoDirection) !== 0) {
      this.setDirectionClass(directionChange.currentValue);
      return;
    }

    this.setDirectionClass('');
  }

  setDirectionClass(direction: string) {

    if (this._innerDirection && this._innerDirection.indexOf(autoDirection) !== 0) {
      this._elementRef.nativeElement.classList.remove(this._innerDirection);
    }

    this._innerDirection = direction as Direction;

    if (direction) {
      this._elementRef.nativeElement.classList.add(direction);
    }
  }
}
