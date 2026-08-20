import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What a controller needs of an item to move to it and choose it. */
export interface NavigableItem {
  /**
   * Whether the press came from inside this item, for `origin: 'focus'`.
   *
   * Every item that uses this is an element, so this is `Node.contains` and
   * nothing has to implement it. It is declared because the controller depends
   * on it, and a structural interface that leaves out what it calls is a
   * `NavigableItem` a component can satisfy and still break.
   */
  contains(node: Node | null): boolean
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
   * Where a move starts from.
   *
   * `selection` is the radio-group reading and the default: the set has one
   * answer, focus is always on it, and the two never diverge.
   *
   * `focus` is for a set where they can. Tabs is the case: in `manual` mode a
   * reader arrows without choosing, so after one press focus is no longer on
   * the selection, and starting from the selection walks from the same place
   * every time. It is also the only reading that can tell a press on a tab from
   * a press somewhere else in the component, which matters wherever the host
   * holds more than the set (a tab panel is a tab stop of its own).
   */
  origin?: 'focus' | 'selection'
  /**
   * Whether arriving also chooses.
   *
   * A function rather than a flag: Tabs takes it from `manual`, which a
   * consumer can change at any time, and a value read once in the constructor
   * would be the value the element happened to have when it upgraded.
   */
  selects?: () => boolean
  /**
   * Keys this component binds to something else, which this must not take.
   *
   * **A claim, not a preference.** "Both axes, always" is argued below and the
   * argument holds: a reader who guesses the wrong axis and gets nothing is a
   * reader who concludes the set does not answer the keyboard. So this is not a
   * way to support fewer keys. It is a way to say that a key already means
   * something here, and a component that names one owes that key a binding of
   * its own.
   *
   * `Menu` is the case it was written for. Its rows can open a submenu, and the
   * platform's own bindings for that are the horizontal pair: right goes in,
   * left comes back. Those keys are not unhandled in a menu, they are spoken
   * for, and without this the controller would take them first and a submenu
   * could not be opened from the keyboard at all.
   */
  reserved?: () => string[]
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
 *
 * **`Tabs` is the third, and it is what `origin` and `selects` are for.** It had
 * diverged, which is the case the paragraph above was worried about: it started
 * from focus rather than from the selection, and it moved without choosing when
 * `manual` was set. Both are real and neither is a tabs-only idea, so they are
 * options here rather than a reason to keep a fourth copy. What it does *not*
 * keep is its own key set: it bound the horizontal pair only, and both axes is
 * the house position, argued two paragraphs up. A reader on a tab who presses
 * Down now moves along the row instead of getting nothing.
 */
export class KeyboardNavigationController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly items: () => NavigableItem[]

  private readonly origin: 'focus' | 'selection'

  private readonly selects: () => boolean

  private readonly reserved: () => string[]

  private readonly wrap: boolean

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    {
      items,
      origin = 'selection',
      reserved = () => [],
      selects = () => true,
      wrap = true,
    }: KeyboardNavigationOptions,
  ) {
    this.host = host
    this.items = items
    this.origin = origin
    this.reserved = reserved
    this.selects = selects
    this.wrap = wrap
    host.addController(this)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key) || this.reserved().includes(event.key)) {
      return
    }
    const items = this.items().filter((item) => !item.disabled)
    if (items.length === 0) {
      return
    }

    /* `-1` means two different things and only one of them is a starting point.
     *
       Starting from the selection, `-1` is "nothing is chosen", and the
       arithmetic below relies on it: a forward step lands on the first item and
       a backward step on the last, both of which are where a reader entering an
       unanswered set expects to arrive.

       Starting from focus, `-1` is "the press did not come from the set", and
       there is nothing to move. The listener is on the host, not on the items,
       and a host can hold more than the set: a tab panel is `tabindex="0"`, so
       an arrow pressed while reading a panel used to move the tabs out from
       under the reader. */
    const current =
      this.origin === 'focus'
        ? items.findIndex((item) => item.contains(event.target as Node))
        : items.findIndex((item) => item.selected)
    if (this.origin === 'focus' && current === -1) {
      return
    }
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
    if (this.selects()) {
      target?.select()
    }
  }

  hostConnected(): void {
    this.host.addEventListener('keydown', this.handleKeydown)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('keydown', this.handleKeydown)
  }
}
