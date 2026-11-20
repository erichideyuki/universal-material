import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import installHtml from './examples/install.html';
import usageHtml from './examples/usage.html';

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
export class DataGridComponent {
  readonly docsUrl = 'https://universal-material.github.io/data-grid/';
  readonly repoUrl = 'https://github.com/universal-material/data-grid';
  installHtml = installHtml;
  usageHtml = usageHtml;
}
