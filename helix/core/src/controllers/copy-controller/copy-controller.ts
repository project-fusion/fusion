import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { HelixCopyEvent } from '../../events/events.js'

/** What a copy needs to know, asked for rather than assumed. */
export interface CopyOptions {
  /**
   * How long the confirmation stands, in milliseconds.
   *
   * On a timer rather than on the pointer leaving, so it survives a hand that
   * has already moved on: the press and the reading of it are two moments, and
   * a mark that vanishes with the cursor is one a fast reader never sees.
   */
  after?: number
}

/**
 * Puts text on the clipboard and holds a confirmation for a moment.
 *
 * A controller rather than a component, because copying is a behaviour and not a
 * shape. Colour's chip is a swatch that copies, and a copy button is a button
 * that copies, and those two have nothing in common to look at: what they share
 * is the write, the confirmation that follows it, the timer that ends it and the
 * event that announces it. Written twice, the second one would get the failure
 * case wrong.
 *
 * **The failure case is silence.** `navigator.clipboard` is refused on an
 * insecure origin, refused without a user gesture in some browsers, and refused
 * outright by permission policy in an iframe, and each of those arrives as a
 * rejected promise. There is nothing to recover from and nothing worth saying: a
 * message about a clipboard is worse than a chip that did not flash. So the
 * confirmation simply does not appear, which is the honest report.
 *
 * **The event is announced after the write, not before it.** It is not
 * cancelable for the same reason: by the time anything could be said, the text
 * is already on the clipboard, and an event that cannot prevent what it
 * describes should not pretend otherwise.
 *
 * The timer is cleared when the host leaves the document, or a component removed
 * mid-confirmation asks a detached element to re-render.
 */
export class CopyController implements ReactiveController {
  /** Whether the last write succeeded and is still being confirmed. */
  copied = false

  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly host: ReactiveControllerHost & EventTarget,
    private readonly options: CopyOptions = {},
  ) {
    host.addController(this)
  }

  /**
   * Writes to the clipboard, and confirms it if the platform allowed it.
   *
   * Empty text is not copied. An empty clipboard is not a thing a reader ever
   * asks for, and confirming one is worse than doing nothing.
   */
  async copy(text: string): Promise<void> {
    if (text === '') {
      return
    }
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* Insecure origin, denied permission, or a policy in an iframe. Nothing to
         recover from and nothing to say. */
      return
    }
    this.copied = true
    this.host.requestUpdate()
    this.host.dispatchEvent(new HelixCopyEvent({ value: text }))
    this.reset()
    this.timer = setTimeout(() => {
      this.copied = false
      this.host.requestUpdate()
    }, this.options.after ?? 1200)
  }

  hostDisconnected(): void {
    this.reset()
    this.copied = false
  }

  private reset(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }
}
