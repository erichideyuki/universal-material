import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DialogBodyDirective } from './dialog-body.directive';

describe('DialogBodyDirective', () => {
  it('should create an instance', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: new ElementRef(document.createElement('div')) },
      ],
    });

    const directive = TestBed.runInInjectionContext(() => new DialogBodyDirective());
    expect(directive).toBeTruthy();
  });
});
