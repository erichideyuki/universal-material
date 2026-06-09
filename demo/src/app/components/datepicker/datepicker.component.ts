import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { DatepickerExampleComponent } from './datepicker-example/datepicker-example.component';

// @ts-ignore
import htmlCode from './datepicker-example/datepicker-example.component.html';

@Component({
  selector: 'app-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, DatepickerExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DatepickerComponent {
  htmlCode = htmlCode;
}
