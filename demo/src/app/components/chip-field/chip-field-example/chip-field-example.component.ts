import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';

import { UniversalMaterialModule } from '@universal-material/angular';

@Component({
  selector: 'app-chip-field-example',
  templateUrl: './chip-field-example.component.html',
  styleUrls: ['./chip-field-example.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    JsonPipe,
    UniversalMaterialModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChipFieldExampleComponent {
  tags: string[] = ['angular', 'material'];
}
