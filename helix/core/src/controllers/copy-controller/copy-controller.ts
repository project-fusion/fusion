import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { clipboard } from '../../capabilities/clipboard/index.js'
import { installWebClipboard } from '../../capabilities/clipboard/web.js'
import { timers } from '../../capabilities/timers/index.js'
import { installWebTimers } from '../../capabilities/timers/web.js'
import type { Stop } from '../../capabilities/types.generated.js'
import { HelixCopyEvent } from '../../events/events.js'

/** What a copy needs to know, asked for rather than assumed. */
export interface CopyOptions {
  /**
   * How long the confirmation stands, in milliseconds.
   *
   * On a timer rather than on the pointer leaving, so it survives a hand that
   * has already moved on: the press and the reading of it are two moments, and
   * a mark that vanishes with the cursor is one a fast reader never sees.
   *
   * A function is read at each copy, for a host whose duration is a property
   * a page can change, as other controllers' options are.
   */
  after?: number | (() => number)
}

/** An option given as a value or as a function read when it is needed. */
const read = (option: number | (() => number) | undefined): number | undefined =>
  typeof option === 'function' ? option() : option

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
 * indistinguishable from a broken one. The clipboard capability's web
 * implementation, `webClipboard`, holds both, and it is set as the capability
 * as the first copy starts where nothing has set another, so a fake clipboard
 * takes a page's copies, as a conformance scenario's does. On a phone, the
 * native runtime's clipboard writes through expo-clipboard. **The
 * confirmation ends on the timers capability**, so a fake clock ends it on
 * both platforms alike.
 *
 * **Where neither route is allowed, the copy has failed**, and `failed` holds
 * for the moment a confirmation would. A component decides whether to say so:
 * `CopyButton` names itself with its `error-label`, where Color's chip does
 * not flash at all.
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

  /** Whether the last copy put nothing on the clipboard, and is still being said. */
  failed = false

  private timer: Stop | undefined

  constructor(
    private readonly host: ReactiveControllerHost & EventTarget,
    private readonly options: CopyOptions = {},
  ) {
    host.addController(this)
  }

  /**
   * Writes to the clipboard, and confirms it if the platform allowed it.
   * Resolves to whether the text is on the clipboard.
   *
   * Empty text is not copied. An empty clipboard is not a thing a reader ever
   * asks for, and confirming one is worse than doing nothing. Empty text and a
   * refused write each hold `failed` for the same moment a copy holds
   * `copied`, for a component that says so.
   */
  async copy(text: string): Promise<boolean> {
    installWebClipboard()
    installWebTimers()
    const wrote = text !== '' && (await clipboard().write(text))
    /* **The host may have gone while the clipboard was being written.** Writing
       is asynchronous, `hostDisconnected` runs the moment the element leaves,
       and it clears a timer that does not exist yet, so without this the
       confirmation starts a fresh timer on a detached host and calls
       `requestUpdate` on it a second later. Checked here rather than in
       `reset`, because the thing to skip is the whole confirmation and not only
       its clock. */
    if (this.host instanceof HTMLElement && !this.host.isConnected) {
      return wrote
    }
    this.copied = wrote
    this.failed = !wrote
    this.host.requestUpdate()
    if (wrote) {
      this.host.dispatchEvent(new HelixCopyEvent({ value: text }))
    }
    this.reset()
    this.timer = timers().timeout(read(this.options.after) ?? 1200, () => {
      this.timer = undefined
      this.copied = false
      this.failed = false
      this.host.requestUpdate()
    })
    return wrote
  }

  hostDisconnected(): void {
    this.reset()
    this.copied = false
    this.failed = false
  }

  private reset(): void {
    this.timer?.()
    this.timer = undefined
  }
}
