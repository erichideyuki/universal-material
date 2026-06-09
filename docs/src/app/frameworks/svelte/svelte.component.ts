import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import registerHtml from './examples/register.html';
import bindingHtml from './examples/binding.html';
import bindValueHtml from './examples/bind-value.html';
import objectsHtml from './examples/objects.html';
import typescriptHtml from './examples/typescript.html';

@Component({
  selector: 'docs-svelte',
  templateUrl: './svelte.component.html',
  styleUrl: './svelte.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class SvelteComponent {
  registerHtml = registerHtml;
  bindingHtml = bindingHtml;
  bindValueHtml = bindValueHtml;
  objectsHtml = objectsHtml;
  typescriptHtml = typescriptHtml;
}
