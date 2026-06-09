import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { TextFieldExampleComponent } from './text-field-example/text-field-example.component';

// @ts-ignore
import htmlCode from './text-field-example/text-field-example.component.html';

@Component({
  selector: 'app-text-field',
  templateUrl: './text-field.component.html',
  styleUrls: ['./text-field.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, TextFieldExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TextFieldComponent {
  htmlCode = htmlCode;
}
