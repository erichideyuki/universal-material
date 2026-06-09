import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { SelectExampleComponent } from './select-example/select-example.component';

// @ts-ignore
import htmlCode from './select-example/select-example.component.html';

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, SelectExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SelectComponent {
  htmlCode = htmlCode;
}
