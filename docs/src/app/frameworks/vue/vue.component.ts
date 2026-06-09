import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import viteConfigHtml from './examples/vite-config.html';
import mainImportHtml from './examples/main-import.html';
import bindingHtml from './examples/binding.html';
import vModelHtml from './examples/v-model.html';
import typescriptHtml from './examples/typescript.html';

@Component({
  selector: 'docs-vue',
  templateUrl: './vue.component.html',
  styleUrl: './vue.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class VueComponent {
  viteConfigHtml = viteConfigHtml;
  mainImportHtml = mainImportHtml;
  bindingHtml = bindingHtml;
  vModelHtml = vModelHtml;
  typescriptHtml = typescriptHtml;
}
