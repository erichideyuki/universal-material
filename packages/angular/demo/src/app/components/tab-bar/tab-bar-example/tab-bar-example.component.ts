import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { UniversalMaterialModule } from '@universal-material/angular';

@Component({
  selector: 'app-tab-bar-example',
  templateUrl: './tab-bar-example.component.html',
  styleUrls: ['./tab-bar-example.component.scss'],
  standalone: true,
  imports: [
    UniversalMaterialModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TabBarExampleComponent {
  activeTab = 0;
}
