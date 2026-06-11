import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { Calendar } from '@universal-material/web';
import '@universal-material/web';

import { LocaleDirective } from './locale.directive';

@Component({
  template: `<div [uLocale]="locale"><u-calendar></u-calendar></div>`,
  standalone: false,
})
class HostComponent {
  locale = 'pt-BR';
}

describe('LocaleDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let calendar: Calendar;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LocaleDirective],
      declarations: [HostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    calendar = (fixture.nativeElement as HTMLElement).querySelector('u-calendar') as Calendar;
    await calendar.updateComplete;
  });

  it('provides the locale context to descendant calendars', () => {
    expect(calendar._innerLocale).toBe('pt-BR');
  });

  it('propagates locale changes to consumers', async () => {
    fixture.componentInstance.locale = 'es-ES';
    fixture.detectChanges();
    await calendar.updateComplete;

    expect(calendar._innerLocale).toBe('es-ES');
  });

  it('does not override an explicit locale on the component', async () => {
    calendar.locale = 'en-US';
    await calendar.updateComplete;

    expect(calendar._innerLocale).toBe('en-US');
  });
});
