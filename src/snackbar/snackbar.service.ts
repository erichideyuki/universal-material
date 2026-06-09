import { Injectable, inject } from '@angular/core';
import { SNACKBAR_DEFAULT_OPTIONS, SnackbarConfig } from './snackbar-config.model';
import { SnackbarDuration } from './snackbar-duration';
import { SnackbarRef } from './snackbar-ref.model';
import { Snackbar } from '@universal-material/web';
import { fromEvent } from 'rxjs';

const _defaultConfig: SnackbarConfig = {
  duration: SnackbarDuration.long
};

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {

  private readonly _defaultConfig: SnackbarConfig;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    const userOptions = inject<SnackbarConfig>(SNACKBAR_DEFAULT_OPTIONS, { optional: true })!;



    this._defaultConfig = { ..._defaultConfig, ... userOptions };

  }

  open(message: string, config?: SnackbarConfig): SnackbarRef {

    const snackbar = Snackbar.show({
      message: message,
      action: config?.actionLabel!,
      duration: config?.duration || this._defaultConfig.duration,
    });

    return {
      get message(): string {
        return snackbar.message
      },
      set message(value: string) {
        snackbar.message = value;
      },
      get action(): string {
        return snackbar.action
      },
      set action(value: string) {
        snackbar.action = value;
      },
      dismiss: () => snackbar.dismiss(),
      onAction: fromEvent(snackbar, 'actionClick')
    }
  }
}
