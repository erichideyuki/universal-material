import {
  Component,
  ContentChild,
  ElementRef,
  HostBinding,
  inject,
  model,
  signal,
  ViewChild,
  output
} from '@angular/core';

import { DialogBodyDirective } from "./dialog-body.directive";
import { AnimationEvents } from '../util/animations/animation-events';
import { DIALOG_DEFAULT_OPTIONS, DialogConfig } from './dialog-config.model';

export const DefaultDialogConfig: DialogConfig = {
  closeOnBackdropClick: true,
  closeOnEsc: true
};

@Component({
  selector: 'u-dialog-base',
  template: '',
  host: {
    '[class.hide]': '_hiding()',
    '[class.show]': 'show()',
    '[class.u-dialog-scroll-top-divider]': 'scrollTopDivider()',
    '[class.u-dialog-scroll-bottom-divider]': 'scrollBottomDivider()',
    '[attr.tabindex]': '-1',
  }
})
export class DialogBaseComponent {

  protected readonly _elementRef = inject(ElementRef);
  readonly #defaultOptions = inject(DIALOG_DEFAULT_OPTIONS, {optional: true});

  _dialogConfig = {...DefaultDialogConfig, ...this.#defaultOptions};

  protected readonly _hiding = signal(false);
  readonly show = model(false);
  readonly afterClose = output();
  readonly closedFromBackdrop = output();

  @ContentChild(DialogBodyDirective)
  set _contentChildBody(dialogBody: DialogBodyDirective) {
    this.#setDialogBody(dialogBody);
  }

  @ViewChild(DialogBodyDirective)
  set _viewChildBody(dialogBody: DialogBodyDirective) {
    this.#setDialogBody(dialogBody);
  }

  dialogBody: DialogBodyDirective | null = null;

  readonly scrollTopDivider = signal(false);
  readonly scrollBottomDivider = signal(false);

  constructor() {
    this._elementRef.nativeElement.classList.add('u-dialog');
  }

  #addAnimationEndEvents() {
    AnimationEvents.attachAnimationEndEvents(this._elementRef.nativeElement, this.#onAnimationEnd.bind(this));
  }

  #onAnimationEnd = (event: Event) => {
    this._elementRef.nativeElement.removeEventListener(event.type, this.#onAnimationEnd);
    this._hiding.set(false);
    this.afterClose.emit();
  }

  #setDialogBody(dialogBody: DialogBodyDirective): void {
    this.dialogBody = dialogBody;

    if (!this.dialogBody) {
      return;
    }

    this.dialogBody.dialog = this;
    this.dialogBody._processBehavior();
  }

  protected backdropClick() {
    if (this._dialogConfig.closeOnBackdropClick) {
      this.close();
      this.closedFromBackdrop.emit();
    }
  }

  close() {

    if (!this.show()) {
      return;
    }

    this.show.set(false);
    this._hiding.set(true);
    this.#addAnimationEndEvents();
  }
}
