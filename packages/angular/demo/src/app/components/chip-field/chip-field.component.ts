import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { ChipFieldExampleComponent } from './chip-field-example/chip-field-example.component';

// @ts-ignore
import htmlCode from './chip-field-example/chip-field-example.component.html';

@Component({
  selector: 'app-chip-field',
  templateUrl: './chip-field.component.html',
  styleUrls: ['./chip-field.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, ChipFieldExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChipFieldComponent {
  htmlCode = htmlCode;
}
