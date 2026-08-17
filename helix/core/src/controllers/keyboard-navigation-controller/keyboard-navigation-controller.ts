import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What a controller needs of an item to move to it and choose it. */
export interface NavigableItem {
  /** Whether the item can be reached at all. Skipped when it cannot. */
  disabled: boolean
  /** Moves focus to the item. */
  focusItem(): void
  /** Chooses the item, which for a radio group is the same act as arriving. */
  select(): void
  /** Whether the item is the current one, which is where movement starts. */
  selected: boolean
}

/** How the controller is told what it is moving through. */
export interface KeyboardNavigationOptions {
  /** The items, in the order a reader moves through them. */
  items: () => NavigableItem[]
  /**
   * Whether the ends join up. Radio groups wrap; a list of commands does not.
   */
  wrap?: boolean
}

/** Every key that moves within a set, which is the whole of what this handles. */
const KEYS = new Set(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home'])

/**
 * Moves through a set of items with the arrow keys, and chooses as it goes.
 *
 * **Moving and choosing are one act here, not two.** That is the radio group
 * pattern and it is the difference from a listbox: moving focus without
 * choosing leaves a keyboard reader sitting on an item they have not selected,
 * with nothing on screen saying which of the two is true. A pointer user
 * chooses by arriving, so a keyboard user does too.
 *
 * **Both axes, always.** A vertical set still answers left and right, and a
 * horizontal one still answers up and down. Binding only the axis the items
 * happen to be laid out on means a reader who guesses wrong gets nothing, and
 * `orientation` is presentation: the same set of choices reads the same way
 * whichever direction it runs.
 *
 * Disabled items are skipped rather than stopped at, so a set with a gap in it
 * still moves in one press.
 *
 * Written because `Radio.Group` and `Toggle.Group` had this twice, identically,
 * down to the order of the branches. The second copy is what makes it a
 * controller: one is a component's own business, two is a pattern, and the two
 * had not diverged only because nothing had touched them yet.
 */
export class KeyboardNavigationController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly items: () => NavigableItem[]

  private readonly wrap: boolean

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    { items, wrap = true }: KeyboardNavigationOptions,
  ) {
    this.host = host
    this.items = items
    this.wrap = wrap
    host.addController(this)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key)) {
      return
    }
    const items = this.items().filter((item) => !item.disabled)
    if (items.length === 0) {
      return
    }

    /* `-1` when nothing is chosen, which the arithmetic below relies on: a
       forward step from it lands on the first item and a backward step on the
       last, both of which are where a reader entering an unanswered set expects
       to arrive. */
    const current = items.findIndex((item) => item.selected)
    const last = items.length - 1

    let next = current
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = this.wrap ? (current + 1) % items.length : Math.min(current + 1, last)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      /* From nothing, backwards is the last, which the arithmetic did not give.
       *
       * `(-1 - 1 + length) % length` is `length - 2`: the *second* to last. So a
       * reader arrowing backwards into an unanswered group landed one short of
       * the end, and the comment above says plainly that it lands on the end.
       * The wrapping form is right for every real index and wrong for the one
       * that is not an index. */
      next =
        current < 0 ? last : this.wrap ? (current - 1 + items.length) % items.length : current - 1
    } else if (event.key === 'Home') {
      next = 0
    } else {
      next = last
    }

    event.preventDefault()
    const target = items[next]
    target?.focusItem()
    target?.select()
  }

  hostConnected(): void {
    this.host.addEventListener('keydown', this.handleKeydown)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('keydown', this.handleKeydown)
  }
}
