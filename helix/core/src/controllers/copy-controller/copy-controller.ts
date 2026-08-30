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
 * Writes to the clipboard, by whichever of the two routes this context allows.
 *
 * The async API first, because it is the one with a future and the only one that
 * reports failure. It is gated in more places than it looks: an insecure origin,
 * a document that is not focused, and a Permissions Policy that defaults to
 * `self`, which a sandboxed iframe without `allow-same-origin` is not.
 *
 * `execCommand` second, deprecated and still the more widely permitted of the
 * two: it is synchronous and rides the user gesture that called it rather than
 * asking for a permission, so it works in a sandboxed frame where the modern one
 * is refused. A textarea rather than the selection, because the text being
 * copied is not on the page: it is a value.
 *
 * `fixed` and `opacity: 0` rather than off-screen, because scrolling to a
 * focused element is what a negative offset causes, and a copy that jumps the
 * page is worse than one that does not happen.
 */
const write = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* Fall through. There is nothing to report yet. */
  }

  const carrier = document.createElement('textarea')
  carrier.value = text
  carrier.setAttribute('readonly', '')
  carrier.setAttribute('aria-hidden', 'true')
  carrier.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.append(carrier)
  /* Focused as well as selected. `select()` focuses in a browser and does not
     everywhere, and `execCommand('copy')` copies the *document's* selection, so
     an unfocused textarea copies whatever was selected on the page instead. */
  carrier.focus()
  carrier.select()
  let wrote = false
  try {
    wrote = document.execCommand('copy')
  } catch {
    wrote = false
  }
  carrier.remove()
  return wrote
}

/**
 * Puts text on the clipboard and holds a confirmation for a moment.
 *
 * A controller rather than a component, because copying is a behavior and not a
 * shape. Color's chip is a swatch that copies, and a copy button is a button
 * that copies, and those two have nothing in common to look at: what they share
 * is the write, the confirmation that follows it, the timer that ends it and the
 * event that announces it. Written twice, the second one would get the failure
 * case wrong.
 *
 * **There are two routes and both are tried**, because the modern one is gated
 * in more places than it looks and a control that does nothing is
 * indistinguishable from a broken one. See `write` above.
 *
 * **Where neither route is allowed, the failure is silence.** The confirmation
 * does not appear, which is the honest report: a message about a clipboard is
 * worse than a chip that did not flash, and there is nothing a reader could do
 * about a permission policy anyway.
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
    if (!(await write(text))) {
      return
    }
    /* **The host may have gone while the clipboard was being written.** Writing
       is asynchronous, `hostDisconnected` runs the moment the element leaves,
       and it clears a timer that does not exist yet, so without this the
       confirmation starts a fresh timer on a detached host and calls
       `requestUpdate` on it a second later. Checked here rather than in
       `reset`, because the thing to skip is the whole confirmation and not only
       its clock. */
    if (this.host instanceof HTMLElement && !this.host.isConnected) {
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
