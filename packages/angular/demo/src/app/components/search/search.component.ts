import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { SearchExampleComponent } from './search-example/search-example.component';

// @ts-ignore
import htmlCode from './search-example/search-example.component.html';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, SearchExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SearchComponent {
  htmlCode = htmlCode;
}
