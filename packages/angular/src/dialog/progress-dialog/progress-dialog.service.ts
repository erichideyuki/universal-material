import { Injectable, inject } from '@angular/core';

import { ProgressDialogComponent } from './progress-dialog.component';
import { DialogService } from '../dialog.service';

@Injectable({providedIn: 'root'})
export class ProgressDialogService {
  private readonly _dialogService = inject(DialogService);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {

  }

  open(message: string | null = null): ProgressDialogComponent {
    const progressDialog = this._dialogService.open(ProgressDialogComponent);
    progressDialog.message.set(message);
    progressDialog.show.set(true);

    return progressDialog;
  }
}
