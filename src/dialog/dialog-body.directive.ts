import { Directive, ElementRef, inject } from '@angular/core';

import { ScrollBehavior } from '../util/scroll-behavior';

@Directive({
  selector: '[uDialogBody]',
  standalone: false,
})
export class DialogBodyDirective extends ScrollBehavior {
  dialog: any;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    const _elementRef = inject(ElementRef);

    super();
    this.defaultTarget = _elementRef.nativeElement
  }

  _processBehavior = () => {

    if (!this.dialog || !this._scrollableWrapper) {
      return;
    }

    const scrollTop = this._scrollableWrapper.scrollTop;
    this.dialog.scrollTopDivider.set(!!scrollTop);

    if (scrollTop === null) {
      this.dialog.scrollBottomDivider.set(false);
      return;
    }

    const scrollBottom = scrollTop + this._scrollableWrapper.container.offsetHeight;
    this.dialog.scrollBottomDivider.set(scrollBottom !== this._scrollableWrapper.container.scrollHeight);
  }
}
