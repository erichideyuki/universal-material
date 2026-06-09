import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { TypeaheadExampleComponent } from './typeahead-example/typeahead-example.component';

// @ts-ignore
import htmlCode from './typeahead-example/typeahead-example.component.html';

@Component({
  selector: 'app-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, TypeaheadExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TypeaheadComponent {
  htmlCode = htmlCode;
}
