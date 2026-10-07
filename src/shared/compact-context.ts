import { Context, ContextProvider, createContext } from '@lit/context';

/**
 * Context carrying the desktop "compact" density flag. Density-aware
 * components (fields, list/menu items, chips, tabs, buttons, …) read it to
 * pick a denser layout when they don't have an explicit `compact` of their
 * own. Resolution order in consumers: own `compact` property → this context
 * → `false`.
 */
export const compactContext = createContext<boolean>('u-compact-context');

/**
 * Turns on the desktop "compact" density for every density-aware component
 * under `contextRoot` by registering a `compactContext` provider on it. Call
 * it once during app setup — the default root is `document.body`, so
 * `provideCompact()` makes the whole app compact:
 *
 * ```ts
 * import { provideCompact } from '@universal-material/web';
 * const density = provideCompact();          // whole document, compact = true
 * density.setValue(false);                    // flip back to comfortable later
 * ```
 *
 * Pass a narrower element to scope the density to a subtree, and/or `false`
 * to start comfortable. Individual components still override the inherited
 * value with their own `compact` attribute. Returns the provider so callers
 * can toggle the density later with `setValue`.
 */
export const provideCompact = (
  contextRoot: HTMLElement = document.body,
  compact = true,
): ContextProvider<Context<HTMLElement, boolean>> =>
  new ContextProvider(contextRoot, {
    context: compactContext,
    initialValue: compact,
  });
