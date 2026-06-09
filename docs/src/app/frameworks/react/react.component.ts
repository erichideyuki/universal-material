import { Component } from '@angular/core';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';

import installHtml from './examples/install.html';
import importHtml from './examples/import.html';
import controlledHtml from './examples/controlled.html';
import uncontrolledHtml from './examples/uncontrolled.html';
import reactHookFormHtml from './examples/react-hook-form.html';
import bespokeEventsHtml from './examples/bespoke-events.html';
import ssrHtml from './examples/ssr.html';

@Component({
  selector: 'docs-react',
  templateUrl: './react.component.html',
  styleUrl: './react.component.scss',
  standalone: true,
  imports: [ExampleComponent, TitleComponent]
})
export class ReactComponent {
  installHtml = installHtml;
  importHtml = importHtml;
  controlledHtml = controlledHtml;
  uncontrolledHtml = uncontrolledHtml;
  reactHookFormHtml = reactHookFormHtml;
  bespokeEventsHtml = bespokeEventsHtml;
  ssrHtml = ssrHtml;
}
