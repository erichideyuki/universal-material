import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { TabBarExampleComponent } from './tab-bar-example/tab-bar-example.component';

// @ts-ignore
import htmlCode from './tab-bar-example/tab-bar-example.component.html';

@Component({
  selector: 'app-tab-bar',
  templateUrl: './tab-bar.component.html',
  styleUrls: ['./tab-bar.component.scss'],
  standalone: true,
  imports: [
    ExampleComponent,
    TitleComponent,
    TabBarExampleComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TabBarComponent {
  htmlCode = htmlCode;
}
