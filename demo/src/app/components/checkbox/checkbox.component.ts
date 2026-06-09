import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { CheckboxExampleComponent } from './checkbox-example/checkbox-example.component';

// @ts-ignore
import htmlCode from './checkbox-example/checkbox-example.component.html';

@Component({
  selector: 'app-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, CheckboxExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CheckboxComponent {
  htmlCode = htmlCode;
}
