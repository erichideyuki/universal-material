import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import installHtml from './examples/install.html';
import moduleHtml from './examples/module.html';
import ngModelHtml from './examples/ngmodel.html';
import reactiveHtml from './examples/reactive.html';
import reactiveTemplateHtml from './examples/reactive-template.html';

@Component({
  selector: 'docs-angular',
  templateUrl: './angular.component.html',
  styleUrl: './angular.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class AngularComponent {
  installHtml = installHtml;
  moduleHtml = moduleHtml;
  ngModelHtml = ngModelHtml;
  reactiveHtml = reactiveHtml;
  reactiveTemplateHtml = reactiveTemplateHtml;
}
