import { Directive, ElementRef, inject, Input } from '@angular/core';
import { provideLocale } from '@universal-material/web';

/**
 * Provides the universal-material locale context to every locale-aware
 * component (calendars, datepickers) inside the host element. Components
 * with an explicit `locale` of their own still take precedence; without
 * a provider they fall back to `navigator.language`.
 *
 * ```html
 * <body [uLocale]="locale">
 *   <u-datepicker></u-datepicker>
 * </body>
 * ```
 */
@Directive({
  selector: '[uLocale]',
})
export class LocaleDirective {
  readonly #element = inject(ElementRef).nativeElement as HTMLElement;
  #provider: ReturnType<typeof provideLocale> | undefined;

  @Input({ required: true })
  set uLocale(locale: string) {
    if (this.#provider) {
      this.#provider.setValue(locale);
      return;
    }

    this.#provider = provideLocale(this.#element, locale);
  }
}
