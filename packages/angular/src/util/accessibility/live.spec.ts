import {TestBed, ComponentFixture, inject} from '@angular/core/testing';
import { Component, inject as inject_1 } from '@angular/core';
import {By} from '@angular/platform-browser';
import {Live, ARIA_LIVE_DELAY} from './live';



function getLiveElement(): Element | null {
  return document.body.querySelector('#u-live');
}



describe('LiveAnnouncer', () => {
  let live: Live;
  let fixture: ComponentFixture<TestComponent>;

  const say = () => { fixture.debugElement.query(By.css('button')).nativeElement.click(); };

  describe('live announcer', () => {
    beforeEach(() => TestBed.configureTestingModule({
      providers: [Live, {provide: ARIA_LIVE_DELAY, useValue: null}],
      declarations: [TestComponent],
    }));

    beforeEach(inject([Live], (_live: Live) => {
      live = _live;
      fixture = TestBed.createComponent(TestComponent);
    }));

    it('should correctly update the text message', () => {
      say();
      const liveElement = getLiveElement();
      expect(liveElement!.textContent).toBe('test');
      expect(liveElement!.id).toBe('u-live');
    });

    it('should remove the used element from the DOM on destroy', () => {
      say();
      live.ngOnDestroy();

      expect(getLiveElement()).toBeFalsy();
    });
  });
});



@Component({template: `<button (click)="say()">say</button>`, standalone: false})
class TestComponent {
  live = inject_1(Live);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}
  say() { this.live.say('test'); }
}
