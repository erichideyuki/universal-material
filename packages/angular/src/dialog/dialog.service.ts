import { ApplicationRef, Injectable, InjectionToken, Injector, Type, createComponent, inject } from '@angular/core';

import { DialogInjector } from './dialog-injector';
import { DialogStackService } from './dialog-stack.service';
import { DialogComponent } from './dialog.component';

export const DIALOG_DATA = new InjectionToken<any>('DIALOG_DATA');

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private readonly _appRef = inject(ApplicationRef);
  private readonly _injector = inject(Injector);
  private readonly _dialogStackService = inject(DialogStackService);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);


  constructor() {

  }

  _internalOpen<T extends DialogComponent>(dialogType: Type<T>, customInjectionTokens: WeakMap<any, any>): T {
    const dialogComponentRef = createComponent(dialogType, {
      environmentInjector: this._appRef.injector,
      elementInjector: new DialogInjector(this._injector, customInjectionTokens)
    });

    dialogComponentRef.instance.afterClose.subscribe(() => {
      this._appRef.detachView(dialogComponentRef.hostView);
      dialogComponentRef.destroy();
    });

    this._appRef.attachView(dialogComponentRef.hostView);

    this._dialogStackService.add(dialogComponentRef.instance);

    document
      .querySelector('body')!
      .appendChild(dialogComponentRef.location.nativeElement);

    return dialogComponentRef.instance;
  }

  open<T extends DialogComponent>(dialogType: Type<T>, data?: any): T {
    return this._internalOpen(dialogType, new WeakMap(data && [[DIALOG_DATA, data]]));
  }
}
