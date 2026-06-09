import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { RadioExampleComponent } from './radio-example/radio-example.component';

// @ts-ignore
import htmlCode from './radio-example/radio-example.component.html';

@Component({
  selector: 'app-radio',
  templateUrl: './radio.component.html',
  styleUrls: ['./radio.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, RadioExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class RadioComponent {
  htmlCode = htmlCode;
}
