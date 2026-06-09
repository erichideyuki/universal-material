/**
 * happy-dom does not implement Form-Associated Custom Elements: there is no
 * ElementInternals and no HTMLElement.prototype.attachInternals, so every u-* input
 * (which calls attachInternals() in its constructor) throws on construction.
 *
 * This setup installs a minimal but faithful ElementInternals stub so the REAL web
 * components can be constructed and exercised in the test env. The stub:
 *  - accepts setFormValue (happy-dom collects no FormData from it — see below),
 *  - exposes a working `form` accessor (nearest ancestor <form>),
 *  - no-ops setValidity / state, which the components call but the tests don't assert.
 *
 * This is a test-env shim ONLY. In real browsers (and the docs site) the native
 * ElementInternals is used — see README "Next.js / SSR" for the client-only caveat.
 * Note: happy-dom's FormData does not read setFormValue, so the FACE FormData
 * round-trip is asserted only in real browsers; the specs assert the FACE contract
 * (formAssociated + name + value) instead.
 */

class ElementInternalsStub {
  constructor(private readonly host: HTMLElement) {}

  setFormValue(): void {
    /* no-op: happy-dom FormData does not read ElementInternals values */
  }

  setValidity(): void {
    /* no-op: validity is not asserted in these specs */
  }

  checkValidity(): boolean {
    return true;
  }

  reportValidity(): boolean {
    return true;
  }

  get form(): HTMLFormElement | null {
    return this.host.closest('form');
  }

  get validity() {
    return { valid: true } as ValidityState;
  }

  get willValidate() {
    return true;
  }

  get labels() {
    return [] as unknown as NodeListOf<HTMLLabelElement>;
  }

  get shadowRoot() {
    return (this.host as HTMLElement & { shadowRoot: ShadowRoot | null })
      .shadowRoot;
  }
}

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals(
    this: HTMLElement,
  ) {
    return new ElementInternalsStub(this) as unknown as ElementInternals;
  };
}
