import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * Into fullscreen and back, and honest about where the element is.
 *
 * The state follows `fullscreenchange` rather than the request, so a refused
 * request leaves a button that correctly reports "not fullscreen".
 */
export class FullscreenController implements ReactiveController {
  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly report: (full: boolean) => void,
  ) {
    host.addController(this)
  }

  /**
   * Into fullscreen and back, and quiet about being refused.
   *
   * `requestFullscreen` rejects rather than returning false, and the two
   * refusals a consumer will actually meet are a Permissions Policy that does
   * not grant `fullscreen` to the frame the player is in, and a call without
   * user activation. Both are `TypeError: Permissions check failed`, which is
   * the same message for two different causes.
   *
   * Caught rather than `void`ed, or a refusal becomes an unhandled rejection
   * naming neither the element nor the reason.
   */
  async toggle(): Promise<void> {
    try {
      if (document.fullscreenElement === this.host) {
        await document.exitFullscreen()
        return
      }
      await this.host.requestFullscreen()
    } catch (error) {
      /* Reported rather than swallowed, and reported once. A player embedded in
         a frame without the permission is the common case, and the fix is on
         the frame rather than here, so the message has to say which. */
      console.warn(
        `<${this.host.localName}> could not enter fullscreen. If it is inside an iframe, that frame needs allow="fullscreen".`,
        error,
      )
    }
  }

  hostConnected(): void {
    document.addEventListener('fullscreenchange', this.handleChange)
  }

  hostDisconnected(): void {
    document.removeEventListener('fullscreenchange', this.handleChange)
  }

  private readonly handleChange = (): void => {
    this.report(document.fullscreenElement === this.host)
  }
}
