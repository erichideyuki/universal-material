import { Context, ContextProvider, createContext } from '@lit/context';

/**
 * Context carrying the BCP 47 locale tag that locale-aware components
 * (calendars, datepickers) use when they don't have an explicit `locale`
 * of their own. Resolution order in consumers: own `locale` property →
 * this context → `navigator.language`.
 */
export const localeContext = createContext<string>('u-locale-context');

/**
 * Provides `localeContext` to every locale-aware component inside
 * `contextRoot`. Returns the provider so callers can update the locale
 * later with `setValue`.
 */
export const provideLocale = (
  contextRoot: HTMLElement,
  locale: string,
): ContextProvider<Context<HTMLElement, string>> =>
  new ContextProvider(contextRoot, {
    context: localeContext,
    initialValue: locale,
  });
