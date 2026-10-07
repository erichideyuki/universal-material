import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { ApisTableComponent } from '@docs/docs/apis-table/apis-table.component';
import { ExampleComponent } from '@docs/docs/example/example.component';
import { TitleComponent } from '@docs/docs/title/title.component';
import { ChipField } from '@universal-material/web';

import simpleHtml from './examples/simple.html';
import objectValuesHtml from './examples/object-values.html';
import htmlFormatterHtml from './examples/html-formatter.html';

@Component({
  selector: 'docs-chip-field',
  templateUrl: './chip-field.component.html',
  styleUrl: './chip-field.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    ApisTableComponent,
    ExampleComponent,
    TitleComponent
  ]
})
export class ChipFieldComponent {

  simpleHtml = simpleHtml;
  objectValuesHtml = objectValuesHtml;
  htmlFormatterHtml = htmlFormatterHtml;

  formatter = (state: {name: string}) => state.name;

  recipients = [
    {name: 'Ana', email: 'ana@example.com'},
    {name: 'Bruno', email: 'bruno@example.com'}
  ];

  htmlFormatter = (person: {name: string, email: string}) =>
    `<strong>${person.name}</strong> <span style="color: var(--u-color-on-surface-variant)">${person.email}</span>`;

  keyDown($event: KeyboardEvent) {
    if ($event.key !== 'Enter') {
      return;
    }

    const chipField = <ChipField>$event.target;
    chipField.add({name: chipField.input.value}, true);
    chipField.input.value = '';
  }
}
