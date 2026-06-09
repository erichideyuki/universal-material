import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Highlight } from 'ngx-highlightjs';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { titleToHash } from '@docs/docs/shared/title-to-hash';
import { AnchorScrollDirective } from '@docs/docs/shared/anchor-scroll.directive';
import { Framework, StackBlitzService } from '@docs/docs/stackblitz/stackblitz.service';

/**
 * Passed to `docs-example` via `[stackblitz]` to enable the
 * "Open in StackBlitz" affordance for a framework-specific example.
 *
 * - `framework` picks which runnable starter the service generates.
 * - `source` (optional) overrides the entry source dropped into the project;
 *   when omitted, `docs-example` falls back to the example's `html` string.
 */
export interface StackBlitzExample {
  framework: Framework;
  source?: string;
}

@Component({
  selector: 'docs-example',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Highlight,
    AnchorScrollDirective,
  ],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ExampleComponent implements OnChanges {
  htmlSafe: SafeHtml | null = null;
  _html?: string;

  @Input() renderExample = true;
  @Input() sectionTitle!: string;
  /**
   * highlight.js language for the shown code (default `html`). Set it per
   * example on the framework usage pages (`typescript`, `shell`, …) so non-HTML
   * snippets are highlighted correctly instead of being forced through the HTML
   * grammar.
   */
  @Input() language = 'html';
  /**
   * When set, renders a "View as screen" link next to the section title that
   * navigates to a standalone Angular route (no docs shell). Use this for
   * examples where the component needs the full viewport to be evaluated
   * fairly — `u-scaffold`, app-bar interactions, FAB anchoring, etc.
   */
  @Input() screenRoute?: string;
  /**
   * Makes the preview area edge-to-edge (no horizontal padding) and stretches
   * the demo to fill its width. Useful for components that span the full
   * surface — top-app-bar, dividers, snackbars, lists inside cards, etc.
   */
  @Input({ transform: (v: boolean | string) => v === '' || v === true || v === 'true' }) fluid = false;
  /**
   * Horizontal alignment of the demo within the preview area.
   * - `start` (default): items aligned to the left
   * - `center`: items centered
   * - `end`: items aligned to the right — great for FABs
   * - `stretch`: each item takes the full available width — great for form fields
   * - `between`: distribute items with space between
   *
   * Note: named `alignment` (not `align`) to avoid the legacy HTML `align`
   * attribute, which browsers map to `text-align`.
   */
  @Input() alignment: 'start' | 'center' | 'end' | 'stretch' | 'between' = 'start';
  /**
   * When set, renders an "Open in StackBlitz" button that opens a runnable
   * starter for `framework`, using `source` (or the example's `html`) as the
   * entry. Use this on the framework usage pages so readers can run a snippet.
   */
  @Input() stackblitz?: StackBlitzExample;
  anchorHash: string | null = null;

  @Input()
  set html(html: string) {
    this.htmlSafe = this.sanitizer.bypassSecurityTrustHtml(html);
    this._html = html;
  };

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly stackblitzService: StackBlitzService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.anchorHash = titleToHash(this.sectionTitle);
  }

  /**
   * Open the example in a new StackBlitz tab. Called synchronously from the
   * click handler so the popup is not blocked.
   */
  openInStackBlitz(): void {
    if (!this.stackblitz) {
      return;
    }

    const slug = (this.sectionTitle ?? 'example')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    this.stackblitzService.open(this.stackblitz.framework, {
      name: slug || 'example',
      title: this.sectionTitle ?? 'Universal Material example',
      source: this.stackblitz.source ?? this._html,
    });
  }
}