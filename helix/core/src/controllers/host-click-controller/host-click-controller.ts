import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * Passes a click on the host itself to the control inside that answers clicks.
 *
 * **A click dispatched on the host reaches nothing that toggles.** A switch,
 * a checkbox or a radio renders its control in its shadow root, and only a
 * click that lands there moves it. `element.click()`, a test's or an
 * automation's, is dispatched on the host, and so is the click a `<label for>`
 * on the page sends the element it names: `helix-switch` left `checked` false
 * under `click()` while a pointer press on it turned it on. A native checkbox
 * toggles on both, and code written against one expects it.
 *
 * **One click reaches the page for each press, as from a native control.**
 * The control's click used to be sent composed, so it crossed the shadow root
 * and reached the host after the host's own: a listener on the host heard two
 * clicks for one `click()` or one press on a `<label for>`, where one on a
 * native checkbox hears one. So there are two paths, and each leaves exactly
 * one click outside the shadow root:
 *
 * - **The host's `click()`** calls {@link click}, which clicks the control
 *   instead. That click is the only one: it reaches the host retargeted, as a
 *   click inside a native control does, after the control has moved, so a
 *   listener reads the new state and `preventDefault()` puts the old one back.
 * - **A click that starts at the host** some other way, from a `<label for>`,
 *   a press on the host's own box, or `dispatchEvent`, is the click the page
 *   hears. The control is sent a copy that is not composed, so it moves the
 *   control and stops at the shadow root. The copy goes in the capture phase,
 *   so the host's own listeners already read the new state, as a native
 *   checkbox's do. A press inside the shadow root has already landed on its
 *   control and is left alone.
 */
export class HostClickController implements ReactiveController {
  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly target: () => HTMLElement | null | undefined,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('click', this.forward, { capture: true })
  }

  hostDisconnected(): void {
    this.host.removeEventListener('click', this.forward, { capture: true })
  }

  /**
   * Clicks the control, for the host's own `click()`. Answers `false` when
   * there is no control yet, before the first render, so the host can fall
   * back to its own click.
   */
  click(): boolean {
    const control = this.target()
    if (!control) {
      return false
    }
    control.click()
    return true
  }

  private readonly forward = (event: MouseEvent): void => {
    if (event.composedPath()[0] !== this.host || event.defaultPrevented) {
      return
    }
    const control = this.target()
    /* A disabled control takes no click, as `click()` on one sends none. */
    if (!control || control.matches(':disabled')) {
      return
    }
    control.dispatchEvent(
      new MouseEvent('click', {
        altKey: event.altKey,
        bubbles: true,
        button: event.button,
        buttons: event.buttons,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        composed: false,
        ctrlKey: event.ctrlKey,
        detail: event.detail,
        metaKey: event.metaKey,
        screenX: event.screenX,
        screenY: event.screenY,
        shiftKey: event.shiftKey,
      }),
    )
  }
}
