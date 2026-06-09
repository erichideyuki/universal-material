import { Injectable, inject } from '@angular/core';
import { first } from 'rxjs/operators';

import { DialogComponent } from './dialog.component';
import { DOCUMENT } from '@angular/common';
import { Key } from '../util/key';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({providedIn: 'root'})
export class DialogStackService {
  private readonly _document = inject(DOCUMENT);

  private static _dialogStack: DialogComponent[] = [];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this._document.body.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.keyCode === Key.Escape) {
        this.closeTopMostDialog();
      }
    });
  }

  removeDialog(dialog: DialogComponent) {
    const index = DialogStackService._dialogStack.indexOf(dialog);

    if (index < 0) {
      return;
    }

    DialogStackService._dialogStack.splice(index, 1);
  }

  addDialog(dialog: DialogComponent) {
    const index = DialogStackService._dialogStack.indexOf(dialog);

    if (index < 0) {
      return;
    }

    DialogStackService._dialogStack.unshift(dialog);
  }

  add(dialog: DialogComponent) {

    if (dialog.show()) {
      this.addDialog(dialog);
    } else {
      dialog.show
        .subscribe(show => {
          if (show) {
            this.addDialog(dialog);
          }
        });
    }

    dialog.afterClose
      .subscribe(() => this.removeDialog(dialog));

    DialogStackService._dialogStack.unshift(dialog);
  }

  closeTopMostDialog() {
    for (const dialog of DialogStackService._dialogStack) {
      if (dialog._dialogConfig && dialog._dialogConfig.closeOnEsc) {
        dialog.close();
        break;
      }
    }
  }
}
