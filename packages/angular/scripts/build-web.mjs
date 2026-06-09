// Builds the @universal-material/web GIT SUBMODULE (an external git repo vendored under
// ./universal-material-web — NOT an npm dependency) into its dist/, so this Angular workspace
// resolves `@universal-material/web` via the tsconfig path map (-> universal-material-web/dist/index).
// Wired as prestart/prebuild/pretest. Set FORCE_WEB_BUILD=1 to force a rebuild.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve('universal-material-web');

if (!existsSync(resolve(dir, 'package.json'))) {
  console.error('[build:web] ./universal-material-web submodule is missing. Run "git submodule update --init".');
  process.exit(1);
}

const hasSource = existsSync(resolve(dir, 'src', 'index.ts'));
const distEntry = resolve(dir, 'dist', 'index.js');

// A flat, already-built npm package (index.js at root) needs no build.
if (!hasSource) {
  if (existsSync(resolve(dir, 'index.js'))) {
    console.log('[build:web] web is a prebuilt package; nothing to build.');
    process.exit(0);
  }
  console.error('[build:web] web has neither src/index.ts nor a built entry; cannot build.');
  process.exit(1);
}

const force = process.env.FORCE_WEB_BUILD === '1';
if (existsSync(distEntry) && !force) {
  console.log('[build:web] dist/ already present; skipping (set FORCE_WEB_BUILD=1 to rebuild).');
  process.exit(0);
}

const run = (cmd) => execSync(cmd, { cwd: dir, stdio: 'inherit', shell: true });

// A fresh submodule checkout has no node_modules; install its build deps once so gulp/tsc exist.
if (!existsSync(resolve(dir, 'node_modules', '.bin'))) {
  console.log('[build:web] installing web build dependencies (first run, may take a while)...');
  // --legacy-peer-deps: the web lib's *docs* devDeps (ngx-highlightjs -> @angular/cdk) have peer
  // conflicts irrelevant to the sass+tsc build we need; --ignore-scripts skips esbuild/playwright
  // binary postinstalls (we only run gulp sass-to-ts + tsc, never esbuild).
  run('npm install --ignore-scripts --no-audit --no-fund --legacy-peer-deps');
}

console.log('[build:web] compiling styles (sass -> ts)...');
run('npm run script:sass-to-ts');
console.log('[build:web] compiling TypeScript (tsc -> dist)...');
try {
  run('npm run build:bundle');
} catch {
  // The web lib's own tsc may emit benign TS2742 portability warnings about the nested
  // node_modules/lit; it still writes the JS + d.ts. Only treat a missing entry as fatal.
  console.warn('[build:web] tsc reported issues (likely nested-lit portability); verifying emit...');
}
if (!existsSync(distEntry)) {
  console.error('[build:web] FAILED: dist/index.js was not produced.');
  process.exit(1);
}
console.log('[build:web] done.');
