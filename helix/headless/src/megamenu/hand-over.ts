/** Which way a panel moved when another took its place along the bar. */
export type Motion = 'from-end' | 'from-start' | 'to-end' | 'to-start'

/** What a hand-over asks of a megamenu. */
export interface Handed extends Node {
  /** Asks the panel to open or close, and returns whether it did. */
  requestOpen(open: boolean): boolean
}

/**
 * The bar's one open panel, handed from one megamenu to the next.
 *
 * A page has one panel open at a time: a nav bar whose Products panel is still
 * down while Solutions opens is a nav bar with two panels over the page. Module
 * scope rather than a coordinating parent, because there is nothing to
 * coordinate through: megamenus sit in whatever container the consumer used,
 * which is usually `Navigation` and is not required to be. `Video` holds the
 * media session the same way and for the same reason.
 *
 * When one panel opens in place of another, each is told which way the reader
 * moved, as Radix's `data-motion` does: toward the end of the bar where the
 * one opening comes after the one closing in the document. The one opening
 * enters from the side the reader moved toward, and the one closing leaves
 * toward the side they came from. Only the latest move is ever described.
 */
export class HandOver<T extends Handed> {
  /**
   * Every megamenu on the page, so a press on another one's trigger counts as
   * moving along the bar. Closing on that press would close this panel before
   * the other opens, and the hand-over would have no direction.
   */
  readonly connected = new Set<T>()

  /** The panel showing now, so opening one closes the last. */
  showing: T | undefined

  /**
   * The megamenu a pointer is pressing, from the press until the click that
   * ends it. A press moves focus before the click opens anything, and the open
   * panel must not close on that focus move, or the hand-over has no direction.
   */
  pressed: T | undefined

  /** The panels closing because another opened in their place. */
  private readonly handed = new Set<T>()

  /** @param motion Writes a megamenu's direction, and clears it for `undefined`. */
  constructor(private readonly motion: (megamenu: T, to: Motion | undefined) => void) {}

  /** Counts a megamenu as part of the bar. */
  add(megamenu: T): void {
    this.connected.add(megamenu)
  }

  /** Stops counting a megamenu that left the page. */
  remove(megamenu: T): void {
    this.connected.delete(megamenu)
    this.handed.delete(megamenu)
    if (this.showing === megamenu) {
      this.showing = undefined
    }
    if (this.pressed === megamenu) {
      this.pressed = undefined
    }
  }

  /**
   * Forgets the press a task after it ends, so the click it makes still finds
   * it. One function for every press, so a listener added again is the same
   * listener and never a second one.
   */
  private readonly release = (): void => {
    setTimeout(() => {
      this.pressed = undefined
    })
  }

  /**
   * The megamenus that share this one's parent, in document order: the bar it
   * is one trigger of.
   */
  alongside(megamenu: T): T[] {
    return [...this.connected]
      .filter((other) => other.parentNode === megamenu.parentNode)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
  }

  /** Notes a press on a megamenu, until the press ends. */
  press(megamenu: T): void {
    this.pressed = megamenu
    window.addEventListener('pointerup', this.release, { capture: true, once: true })
    window.addEventListener('pointercancel', this.release, { capture: true, once: true })
  }

  /**
   * Opens one panel in place of the one showing, and returns that one, if
   * there was one. The other closes through `requestOpen`, so a consumer
   * holding it open is asked rather than overruled, and a refusal clears its
   * direction again.
   */
  open(opening: T): T | undefined {
    const previous = this.showing !== opening ? this.showing : undefined
    const forward =
      previous !== undefined &&
      (previous.compareDocumentPosition(opening) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    this.motion(opening, previous ? (forward ? 'from-end' : 'from-start') : undefined)
    this.settle(opening, previous)
    if (previous) {
      this.motion(previous, forward ? 'to-start' : 'to-end')
      this.handed.add(previous)
      if (!previous.requestOpen(false)) {
        this.handed.delete(previous)
        this.motion(previous, undefined)
      }
    }
    this.showing = opening
    return previous
  }

  /**
   * Notes a panel closing. One that closed on its own moved nowhere, and
   * neither did any other, so every direction clears.
   */
  close(closing: T): void {
    if (this.showing === closing) {
      this.showing = undefined
    }
    if (!this.handed.delete(closing)) {
      this.settle()
    }
  }

  /** Clears the direction of every megamenu but the ones moving. */
  private settle(...moving: (T | undefined)[]): void {
    for (const megamenu of this.connected) {
      if (!moving.includes(megamenu)) {
        this.motion(megamenu, undefined)
      }
    }
  }
}
