import { Injectable } from '@angular/core';

import sdk from '@stackblitz/sdk';
import type { Project, ProjectFiles, ProjectDependencies } from '@stackblitz/sdk';

import { version as webVersion } from '../../../../../package.json';

/**
 * Frameworks for which we can generate a runnable StackBlitz starter.
 *
 * `@universal-material/web` is published on npm (see `WEB_VERSION`), so every
 * one of these boots live: vanilla / Vue / Svelte / Solid consume the published
 * elements directly, while React and Angular do the same but additionally carry
 * a note that their dedicated typed wrapper (`@universal-material/react` /
 * `@universal-material/angular`) is not on npm yet — they degrade to the raw
 * `<u-*>` elements rather than failing `npm install` on an unpublished package.
 */
export type Framework = 'vanilla' | 'angular' | 'react' | 'vue' | 'svelte' | 'solid';

export interface ExampleSource {
  /** Slug used for the project name / opened file. */
  name?: string;
  /** Human title shown in the StackBlitz editor tab. */
  title?: string;
  /**
   * The framework-specific entry source to drop into the project (a Vue SFC,
   * a Svelte component, React/Solid TSX, an Angular template, or plain HTML).
   * When omitted, the framework's built-in starter snippet is used so the
   * project still boots with a couple of representative `<u-*>` elements.
   */
  source?: string;
}

// `@universal-material/web` IS published — read the version from the root
// package.json so generated projects auto-track whatever ships (no stale pin).
const WEB_VERSION = `^${webVersion}`;

// The element library's required runtime peers, mirrored from docs/src/index.html.
const POLYFILL_VERSION = '^1.3.9'; // element-internals-polyfill
const VITE_VERSION = '^5.0.0';

// The three Google Fonts the docs site itself links (Roboto, Roboto Mono,
// Material Symbols Outlined) — every generated index.html injects these so the
// rendered M3 components have their type + icons.
const FONT_LINKS = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0">`;

interface BuiltProject {
  project: Project;
  openFile: string;
}

@Injectable({ providedIn: 'root' })
export class StackBlitzService {
  /**
   * Build the project for `framework`/`ex` and open it in a new StackBlitz tab.
   *
   * MUST be called synchronously inside the click handler — `sdk.openProject`
   * opens a new window, and popup blockers intercept it if anything is awaited
   * first.
   */
  open(framework: Framework, ex: ExampleSource = {}): void {
    const { project, openFile } = this.buildProject(framework, ex);
    sdk.openProject(project, { openFile, view: 'editor', newWindow: true });
  }

  private buildProject(framework: Framework, ex: ExampleSource): BuiltProject {
    switch (framework) {
      case 'angular':
        return this.angular(ex);
      case 'react':
        return this.react(ex);
      case 'vue':
        return this.vue(ex);
      case 'svelte':
        return this.svelte(ex);
      case 'solid':
        return this.solid(ex);
      case 'vanilla':
      default:
        return this.vanilla(ex);
    }
  }

  private title(ex: ExampleSource, fallback: string): string {
    return ex.title ?? fallback;
  }

  private indexHtml(bodyMount: string): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Universal Material example</title>
${FONT_LINKS}
  </head>
  <body>
${bodyMount}
  </body>
</html>
`;
  }

  // --- Vanilla (node + Vite) ------------------------------------------------

  private vanilla(ex: ExampleSource): BuiltProject {
    const markup =
      ex.source ??
      `<u-text-field label="Name"></u-text-field>
<u-button>Click me</u-button>`;

    const files: ProjectFiles = {
      'index.html': this.indexHtml(`    <div id="app"></div>
    <script type="module" src="/main.js"></script>`),
      'main.js': `// Side-effect import registers every <u-*> custom element.
import '@universal-material/web';
import 'element-internals-polyfill';

document.getElementById('app').innerHTML = \`
${this.escapeTemplate(markup)}
\`;
`,
      'package.json': this.nodePackageJson('universal-material-vanilla', {}, {
        vite: VITE_VERSION,
        'element-internals-polyfill': POLYFILL_VERSION,
      }),
    };

    return {
      project: {
        title: this.title(ex, 'Universal Material — Vanilla'),
        description: 'Universal Material web components with Vite (vanilla JS).',
        template: 'node',
        files,
      },
      openFile: 'main.js',
    };
  }

  // --- Vue (node + Vite) ----------------------------------------------------

  private vue(ex: ExampleSource): BuiltProject {
    const app =
      ex.source ??
      `<script setup lang="ts">
import { ref } from 'vue'
const name = ref('Ada')
</script>

<template>
  <u-text-field :value="name" @input="name = ($event.target as any).value" label="Name" />
  <u-button>Click me</u-button>
</template>
`;

    const files: ProjectFiles = {
      'index.html': this.indexHtml(`    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>`),
      'src/main.ts': `// Side-effect import registers every <u-*> custom element.
import '@universal-material/web'
import 'element-internals-polyfill'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
`,
      'src/App.vue': app,
      // Vue must be told <u-*> are custom elements, or it warns/throws on them.
      'vite.config.ts': `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('u-'),
        },
      },
    }),
  ],
})
`,
      'package.json': this.nodePackageJson('universal-material-vue', { vue: '^3.5.0' }, {
        '@vitejs/plugin-vue': '^5.0.0',
        vite: VITE_VERSION,
        'element-internals-polyfill': POLYFILL_VERSION,
      }),
    };

    return {
      project: {
        title: this.title(ex, 'Universal Material — Vue'),
        description: 'Universal Material web components with Vue 3 + Vite.',
        template: 'node',
        files,
      },
      openFile: 'src/App.vue',
    };
  }

  // --- Svelte (node + Vite) -------------------------------------------------

  private svelte(ex: ExampleSource): BuiltProject {
    const app =
      ex.source ??
      `<script lang="ts">
  let name = 'Ada'
</script>

<u-text-field value={name} on:input={(e) => (name = (e.target as HTMLInputElement).value)} label="Name" />
<u-button>Click me</u-button>
`;

    const files: ProjectFiles = {
      'index.html': this.indexHtml(`    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>`),
      'src/main.ts': `// Side-effect import registers every <u-*> custom element.
import '@universal-material/web'
import 'element-internals-polyfill'
import App from './App.svelte'

new App({ target: document.getElementById('app')! })
`,
      'src/App.svelte': app,
      'vite.config.ts': `import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
})
`,
      'svelte.config.js': `import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  // <u-*> are custom elements, not Svelte components.
  compilerOptions: {},
}
`,
      'package.json': this.nodePackageJson('universal-material-svelte', {}, {
        svelte: '^4.2.0',
        '@sveltejs/vite-plugin-svelte': '^3.0.0',
        vite: VITE_VERSION,
        'element-internals-polyfill': POLYFILL_VERSION,
      }),
    };

    return {
      project: {
        title: this.title(ex, 'Universal Material — Svelte'),
        description: 'Universal Material web components with Svelte + Vite.',
        template: 'node',
        files,
      },
      openFile: 'src/App.svelte',
    };
  }

  // --- Solid (node + Vite) --------------------------------------------------

  private solid(ex: ExampleSource): BuiltProject {
    const app =
      ex.source ??
      `import { createSignal } from 'solid-js'

export default function App() {
  const [name, setName] = createSignal('Ada')

  return (
    <>
      <u-text-field
        prop:value={name()}
        on:input={(e) => setName((e.currentTarget as HTMLInputElement).value)}
      />
      <u-button>Click me</u-button>
    </>
  )
}
`;

    const files: ProjectFiles = {
      'index.html': this.indexHtml(`    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>`),
      'src/main.tsx': `// Side-effect import registers every <u-*> custom element.
import '@universal-material/web'
import 'element-internals-polyfill'
import { render } from 'solid-js/web'
import App from './App'

render(() => <App />, document.getElementById('root')!)
`,
      'src/App.tsx': app,
      'vite.config.ts': `import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
})
`,
      'package.json': this.nodePackageJson('universal-material-solid', { 'solid-js': '^1.8.0' }, {
        'vite-plugin-solid': '^2.10.0',
        vite: VITE_VERSION,
        'element-internals-polyfill': POLYFILL_VERSION,
      }),
    };

    return {
      project: {
        title: this.title(ex, 'Universal Material — Solid'),
        description: 'Universal Material web components with Solid + Vite.',
        template: 'node',
        files,
      },
      openFile: 'src/App.tsx',
    };
  }

  // --- React (node + Vite) --------------------------------------------------
  //
  // @universal-material/react (the typed wrapper) is NOT on npm yet, so this
  // starter degrades gracefully: it boots live against the PUBLISHED
  // @universal-material/web elements (React 19 passes props to custom elements
  // natively), and a README note flags that the typed wrappers are coming.

  private react(ex: ExampleSource): BuiltProject {
    const app =
      ex.source ??
      `import { useState } from 'react'

// NOTE: @universal-material/react (typed wrappers) is not published yet.
// React 19 sets props on custom elements natively, so the raw <u-*> elements
// work today. Swap to <UTextField> / <UButton> once the wrapper ships.
export default function App() {
  const [name, setName] = useState('Ada')

  return (
    <>
      <u-text-field
        value={name}
        onInput={(e: any) => setName(e.target.value)}
      />
      <u-button>Click me</u-button>
    </>
  )
}
`;

    const files: ProjectFiles = {
      'index.html': this.indexHtml(`    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>`),
      'src/main.tsx': `// Side-effect import registers every <u-*> custom element.
import '@universal-material/web'
import 'element-internals-polyfill'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
      'src/App.tsx': app,
      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,
      'README.md': `# Universal Material — React

This starter runs against the **published** \`@universal-material/web\` elements.

> The dedicated typed React wrapper, \`@universal-material/react\`, is **not on
> npm yet**. Once it is published you can import \`UTextField\`, \`UButton\`, … from
> it for fully typed props and events. Until then, use the raw \`<u-*>\` elements
> as shown — React 19 passes props to custom elements natively, so they work.
`,
      'package.json': this.nodePackageJson(
        'universal-material-react',
        { react: '^19.0.0', 'react-dom': '^19.0.0' },
        {
          '@vitejs/plugin-react': '^4.3.0',
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
          vite: VITE_VERSION,
          'element-internals-polyfill': POLYFILL_VERSION,
        },
      ),
    };

    return {
      project: {
        title: this.title(ex, 'Universal Material — React'),
        description:
          'Universal Material web components with React + Vite. (@universal-material/react wrapper pending publish.)',
        template: 'node',
        files,
      },
      openFile: 'src/App.tsx',
    };
  }

  // --- Angular (angular-cli / EngineBlock) ----------------------------------
  //
  // @universal-material/angular (the CVA rewrite) is NOT on npm yet, so this
  // starter boots against the PUBLISHED @universal-material/web elements using
  // CUSTOM_ELEMENTS_SCHEMA. Dependencies for the angular-cli template go in
  // project.dependencies (NOT package.json).

  private angular(ex: ExampleSource): BuiltProject {
    const template =
      ex.source ??
      `<u-text-field label="Name"></u-text-field>
<u-button>Click me</u-button>`;

    const files: ProjectFiles = {
      'src/index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Universal Material example</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
${FONT_LINKS}
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`,
      'src/main.ts': `import { bootstrapApplication } from '@angular/platform-browser';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Side-effect import registers every <u-*> custom element.
import '@universal-material/web';

// NOTE: @universal-material/angular (the ControlValueAccessor wrapper) is not
// published yet. The raw <u-*> elements work today with CUSTOM_ELEMENTS_SCHEMA.
// Swap to UniversalMaterialModule once the wrapper ships.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
${this.escapeTemplate(template)}
\`,
})
export class AppComponent {}

bootstrapApplication(AppComponent);
`,
    };

    const dependencies: ProjectDependencies = {
      '@universal-material/web': WEB_VERSION,
    };

    return {
      project: {
        title: this.title(ex, 'Universal Material — Angular'),
        description:
          'Universal Material web components with Angular. (@universal-material/angular wrapper pending publish.)',
        template: 'angular-cli',
        files,
        dependencies,
      },
      openFile: 'src/main.ts',
    };
  }

  // --- helpers --------------------------------------------------------------

  /** Build the package.json string for a `node` (Vite) template. */
  private nodePackageJson(
    name: string,
    deps: Record<string, string>,
    devDeps: Record<string, string>,
  ): string {
    const pkg = {
      name,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        '@universal-material/web': WEB_VERSION,
        ...deps,
      },
      devDependencies: devDeps,
    };

    return JSON.stringify(pkg, null, 2) + '\n';
  }

  /** Escape backticks / `${` so a snippet can live inside a template literal. */
  private escapeTemplate(source: string): string {
    return source.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  }
}
