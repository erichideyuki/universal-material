import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';

import { LinkActiveDirective } from '@docs/docs/link-active.directive';
import { TocComponent } from '@docs/docs/toc/toc.component';
import { ThemeMode, ThemeService } from '@docs/docs/shared/theme.service';

@Component({
  selector: 'docs-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LinkActiveDirective,
    RouterOutlet,
    TocComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DocsShellComponent {
  readonly ThemeMode = ThemeMode;
  readonly version = '3.6.2';

  constructor(readonly theme: ThemeService) {
  }
}
