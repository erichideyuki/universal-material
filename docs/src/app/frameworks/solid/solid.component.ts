import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import mainImportHtml from './examples/main-import.html';
import propsVsAttrsHtml from './examples/props-vs-attrs.html';
import eventsHtml from './examples/events.html';
import twoWayHtml from './examples/two-way.html';
import typescriptHtml from './examples/typescript.html';

@Component({
  selector: 'docs-solid',
  templateUrl: './solid.component.html',
  styleUrl: './solid.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class SolidComponent {
  mainImportHtml = mainImportHtml;
  propsVsAttrsHtml = propsVsAttrsHtml;
  eventsHtml = eventsHtml;
  twoWayHtml = twoWayHtml;
  typescriptHtml = typescriptHtml;
}
