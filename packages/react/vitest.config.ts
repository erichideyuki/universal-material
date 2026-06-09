import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // Polyfill attachInternals/ElementInternals (happy-dom lacks FACE) so the real
    // u-* components can be constructed. See test/setup.ts.
    setupFiles: ['./test/setup.ts'],
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    // Resolve package "exports" with the BROWSER condition. @lit/react ships a
    // "node" condition whose build sets NODE_MODE=true and SKIPS all client-side
    // property/event wiring (it is the SSR build). We are testing the client-side
    // wrapper behaviour in a DOM env, so force the browser/development build where
    // createComponent actually sets properties and attaches event listeners.
    conditions: ['browser', 'development', 'import', 'default'],
    alias: {
      // No node_modules symlink for the workspace-root web package; resolve it to
      // the built root dist (the same mapping tsconfig `paths` / tsup `alias` use).
      '@universal-material/web': new URL('../../dist/index.js', import.meta.url)
        .pathname,
    },
  },
});
