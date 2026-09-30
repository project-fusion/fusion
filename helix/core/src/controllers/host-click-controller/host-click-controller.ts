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
 * **Only a click that starts at the host**, whose path begins there. A press
 * inside the shadow root reaches the host too, retargeted, and has already
 * done its work where it landed; the click this sends to the control reaches
 * the host the same way, and goes no further.
 */
export class HostClickController implements ReactiveController {
  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly target: () => HTMLElement | null | undefined,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('click', this.forward)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('click', this.forward)
  }

  private readonly forward = (event: MouseEvent): void => {
    if (event.composedPath()[0] !== this.host) {
      return
    }
    this.target()?.click()
  }
}
