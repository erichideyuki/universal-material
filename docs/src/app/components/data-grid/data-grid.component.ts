import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, signal } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import { COUNTRIES } from './data';
import filteringHtml from './examples/filtering.html';
import groupingHtml from './examples/grouping.html';
import installHtml from './examples/install.html';
import usageHtml from './examples/usage.html';

/**
 * The grid is a separate package (@universal-material/data-grid), not a
 * dependency of these docs: the live examples load its self-contained bundle
 * (Lit included) from jsDelivr, once, when the page opens.
 */
const GRID_BUNDLE = 'https://cdn.jsdelivr.net/npm/@universal-material/data-grid@0.1/dist/grid.min.js';

let gridLoad: Promise<unknown> | null = null;

const loadGrid = (): Promise<unknown> => {
  if (customElements.get('u-grid')) {
    return Promise.resolve();
  }

  gridLoad ??= import(/* @vite-ignore */ GRID_BUNDLE).catch((error: unknown) => {
    gridLoad = null;
    throw error;
  });

  return gridLoad;
};

@Component({
  selector: 'docs-data-grid',
  templateUrl: './data-grid.component.html',
  styleUrl: './data-grid.component.scss',
  standalone: true,
  imports: [
    ExampleComponent,
    TitleComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DataGridComponent implements OnInit {
  readonly docsUrl = 'https://universal-material.github.io/data-grid/';
  readonly repoUrl = 'https://github.com/universal-material/data-grid';
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly selectedKeys = signal<readonly string[]>([]);

  installHtml = installHtml;
  usageHtml = usageHtml;
  groupingHtml = groupingHtml;
  filteringHtml = filteringHtml;

  readonly countries = COUNTRIES;

  readonly usageColumns = [
    { path: 'country', label: 'Country' },
    { path: 'capital', label: 'Capital' },
    { path: 'population', label: 'Population', dataType: 'number', format: { useGrouping: true } },
    { path: 'area', label: 'Area (km²)', dataType: 'number', format: { useGrouping: true } },
  ];

  readonly groupingColumns = [
    { path: 'continent', label: 'Continent', groupIndex: 0 },
    { path: 'country', label: 'Country' },
    { path: 'population', label: 'Population', dataType: 'number', format: { useGrouping: true } },
  ];

  readonly groupingSummary = {
    group: [{ column: 'population', type: 'sum', display: 'column' }],
    total: [
      { column: 'country', type: 'count' },
      { column: 'population', type: 'sum' },
    ],
  };

  readonly filteringColumns = [
    { path: 'country', label: 'Country' },
    { path: 'continent', label: 'Continent' },
    { path: 'population', label: 'Population', dataType: 'number', format: { useGrouping: true } },
  ];

  ngOnInit(): void {
    loadGrid().then(
      () => this.status.set('ready'),
      () => this.status.set('error'));
  }

  onSelectionChange(event: Event): void {
    this.selectedKeys.set((event.target as HTMLElement & { selectedKeys: readonly string[] }).selectedKeys);
  }
}
