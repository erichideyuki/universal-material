import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { SliderExampleComponent } from './slider-example/slider-example.component';

// @ts-ignore
import htmlCode from './slider-example/slider-example.component.html';

@Component({
  selector: 'app-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss'],
  standalone: true,
  imports: [ExampleComponent, TitleComponent, SliderExampleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SliderComponent {
  htmlCode = htmlCode;
}
