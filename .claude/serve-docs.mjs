import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const ngBin = resolve(repoRoot, 'node_modules/@angular/cli/bin/ng.js');

const child = spawn(process.execPath, [ngBin, 'serve', '--port=4300'], {
  cwd: resolve(repoRoot, 'docs'),
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
