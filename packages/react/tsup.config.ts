import { defineConfig } from 'tsup';
import path from 'node:path';

// Absolute path to the built web library entry (the workspace-ROOT package).
// npm does NOT symlink @universal-material/web into node_modules, so the bare
// specifier is aliased to ../../dist/index for esbuild's resolution. It stays
// EXTERNAL in the emitted bundle (a runtime peer the consumer provides).
const WEB_ENTRY = path.resolve(__dirname, '../../dist/index.js');

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  // @universal-material/web stays EXTERNAL at runtime (it is a peer — never bundled).
  // Its IDENTIFIER must still resolve at build/dts time. There is no
  // node_modules/@universal-material/web symlink (it is the workspace-ROOT package,
  // which npm does not symlink), so point the bare specifier at the built root dist —
  // the same ../../dist mapping the tsconfig `paths` uses. tsup's dts pass reads
  // tsconfig `paths`, so the tsconfig entry covers types; this alias covers esbuild's
  // own resolution.
  esbuildOptions(options) {
    options.alias = {
      ...(options.alias ?? {}),
      '@universal-material/web': WEB_ENTRY,
    };
  },
  external: [
    'react',
    'react-dom',
    '@universal-material/web',
    'lit',
    /^lit\//,
    '@lit/react',
  ],
});
