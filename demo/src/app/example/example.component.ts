import { Component, CUSTOM_ELEMENTS_SCHEMA, input, inject } from '@angular/core';


import { UniversalMaterialModule } from '@universal-material/angular';
import { StackBlitzService } from './stackblitz/stack-blitz.service';
import { HighlightJsDirective } from 'ngx-highlight-js';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss'],
  standalone: true,
  imports: [
    UniversalMaterialModule,
    HighlightJsDirective
],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ExampleComponent {
  private readonly _stackBlitzService = inject(StackBlitzService);


  readonly title = input.required<string>();

  readonly dashName = input.required<string>();
  readonly htmlCode = input.required<string>();
  readonly tsCode = input.required<string>();
  readonly cssCode = input.required<string>();

  tabIndex: number = 0;
  showCode = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {

  }

  createProject() {
    this._stackBlitzService.createProject({
      cssCode: this.cssCode(),
      htmlCode: this.htmlCode(),
      tsCode: this.tsCode(),
      name: this.dashName()
    });
  }
}
