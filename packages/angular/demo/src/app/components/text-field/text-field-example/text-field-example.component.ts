import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UniversalMaterialModule } from '@universal-material/angular';

@Component({
  selector: 'app-text-field-example',
  templateUrl: './text-field-example.component.html',
  styleUrls: ['./text-field-example.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    UniversalMaterialModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TextFieldExampleComponent {
  protected name = '';
  protected email = '';
  protected bio = '';
}
