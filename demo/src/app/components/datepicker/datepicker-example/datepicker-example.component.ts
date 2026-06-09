import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UniversalMaterialModule } from '@universal-material/angular';

@Component({
  selector: 'app-datepicker-example',
  templateUrl: './datepicker-example.component.html',
  styleUrls: ['./datepicker-example.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    UniversalMaterialModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DatepickerExampleComponent {
  date: string | null = null;
  rangeDate: string | null = null;
}
