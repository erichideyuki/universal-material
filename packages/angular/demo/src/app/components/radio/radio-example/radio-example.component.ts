import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UniversalMaterialModule } from '@universal-material/angular';

@Component({
  selector: 'app-radio-example',
  templateUrl: './radio-example.component.html',
  styleUrls: ['./radio-example.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    UniversalMaterialModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RadioExampleComponent {
  choice: string = 'email';
}
