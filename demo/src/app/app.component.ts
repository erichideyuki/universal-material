import { Component } from '@angular/core';

import { DocsShellComponent } from './docs/shell/shell.component';
import { ThemeService } from './docs/shared/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    DocsShellComponent,
  ],
})
export class AppComponent {
  constructor(theme: ThemeService) {
    theme.initialize();
  }
}
