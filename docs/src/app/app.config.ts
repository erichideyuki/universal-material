import { provideHighlightOptions } from 'ngx-highlightjs';
import { provideMarkdown } from 'ngx-markdown';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

// config.navigationDrawer.useSwiperJs = true;

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    provideHighlightOptions({
      coreLibraryLoader: () => import('highlight.js/lib/core'),
      lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'), // Optional, add line numbers if needed
      languages: {
        // `plaintext` is ngx-highlightjs's fallback for a code block with no
        // registered language (e.g. a fenced markdown block without a hint).
        // Without it, such blocks throw "Could not find the language 'plaintext'".
        plaintext: () => import('highlight.js/lib/languages/plaintext'),
        shell: () => import('highlight.js/lib/languages/shell'),
        javascript: () => import('highlight.js/lib/languages/javascript'),
        typescript: () => import('highlight.js/lib/languages/typescript'),
        css: () => import('highlight.js/lib/languages/css'),
        xml: () => import('highlight.js/lib/languages/xml'), // also serves language="html" via its alias
      },
    }),
    provideMarkdown(),
  ],
};
