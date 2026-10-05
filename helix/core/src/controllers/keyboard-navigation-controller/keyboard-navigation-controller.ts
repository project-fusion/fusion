import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { inlineStep } from '../../utils/inline-step/inline-step.js'
import { keyClaimed } from '../../utils/key-claimed/key-claimed.js'

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
  /** Moves focus to the item, which each family does its own way. */
  focusItem(): void
  /** Chooses the item, which for a radio group is the same act as arriving. */
  select(): void
  /** Whether the item is the current one, which is where movement starts. */
  selected: boolean
}

/** Where a move starts from: the item that has focus, or the chosen item. */
export type KeyboardOrigin = 'focus' | 'selection'

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
   *
   * A function where the answer changes with the element's state, read on every
   * press. A read-only radio group is the case: while it is read-only the arrows
   * move focus between radios without choosing, so the move has to start where
   * focus is, and once it is editable again the selection is the start.
   */
  origin?: KeyboardOrigin | (() => KeyboardOrigin)
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
   * The words of an item, which turns on typeahead: a printable key moves to
   * the next item whose words start with what was typed.
   *
   * Off unless given. A set whose items have no words a reader would type, or
   * that holds a text field of its own, leaves it out. See `Typeahead` for how
   * the letters are matched.
   */
  typeahead?: (item: NavigableItem) => string
  /**
   * Whether the ends join up, which they do unless a set says otherwise.
   *
   * **A ring wraps and a scale does not**, and every set here is a ring but
   * one. A radio group, a tab strip, a toggle group and a menu are all sets of
   * peers with no first and no last worth stopping at, so arriving past the end
   * is arriving at the beginning, which is what a native radio group does and
   * what the practice for a menu says. `Rating` is the exception and the only
   * `wrap: false` in the library: its marks are a quantity, so a press past
   * five stars would land on one, and a reader holding the key would rate the
   * thing worst at the moment they meant best.
   *
   * **`false` clamps both ends rather than one.** Backward from the first is
   * `items[-1]`, which is nothing focused and nothing chosen on a press
   * `preventDefault` has already swallowed, so the reader holding Left on the
   * first star gets silence where holding Right on the last one holds its
   * ground.
   */
  wrap?: boolean
}

/** Every key that moves within a set, which is the whole of what this handles. */
const KEYS = new Set(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home'])

/**
 * Whether a press types a character, which is what typeahead reads.
 *
 * One character with no Control, Command or Alt held, so a shortcut such as
 * Control+A is never taken for the letter A. Shift is allowed, because a
 * capital is still a letter.
 */
export const typesCharacter = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

/**
 * Finds an item by the letters a reader types at a set, the way a native
 * `<select>` does.
 *
 * Letters typed within `timeout` milliseconds of each other build one search,
 * so typing "ca" moves to "Canada" past "Cambodia". The same letter typed again
 * moves to the next item that starts with it, so pressing "c" three times visits
 * the first three. A pause starts a new search.
 *
 * Matching ignores case and leading spaces, and searches from the reader's
 * position, wrapping at the end. A search that matches nothing moves nothing.
 *
 * Holds only the letters, so one instance serves any set: the caller passes the
 * words of the items and where the reader is on every key.
 */
export class Typeahead {
  private letters = ''

  private last = 0

  private readonly timeout: number

  constructor({ timeout = 500 }: { timeout?: number } = {}) {
    this.timeout = timeout
  }

  /**
   * Whether a search is under way.
   *
   * A set that chooses on Space asks this first, because a Space typed in the
   * middle of a search is part of the words, as in "New York".
   */
  typing(now = Date.now()): boolean {
    return this.letters !== '' && now - this.last <= this.timeout
  }

  /**
   * Adds a character to the search, and returns the index of the item it
   * matches, or `-1` where none does.
   *
   * `texts` are the words of the items a reader can reach, in order, and
   * `from` is the index of the item the reader is on, or `-1`.
   */
  match(key: string, texts: readonly string[], from: number, now = Date.now()): number {
    if (!this.typing(now)) {
      this.letters = ''
    }
    this.last = now
    this.letters += key.toLowerCase()
    const words = texts.map((text) => text.trim().toLowerCase())
    /* One letter, or the same letter repeated, cycles through the items that
       start with it. Anything longer is a word, and the item the reader is on
       may already be the answer, so the search includes it. */
    const repeated = [...this.letters].every((letter) => letter === this.letters[0])
    const needle = repeated ? (this.letters[0] ?? '') : this.letters
    const start = repeated ? from + 1 : Math.max(from, 0)
    for (let step = 0; step < words.length; step += 1) {
      const at = (start + step) % words.length
      if (words[at]?.startsWith(needle)) {
        return at
      }
    }
    return -1
  }

  /** Ends the search, so the next letter starts a new one. */
  reset(): void {
    this.letters = ''
  }
}

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
 * **The horizontal pair turns with the line.** On a right-to-left page the
 * first item is on the right, so left is forward there, which is what a native
 * radio group does, measured in Chromium on 15 Sep 2026. Vertical sets
 * included: the key a reader guesses on a column is the one that goes forward
 * along a row of the same items, and the two answering differently would make
 * `orientation` more than presentation after all.
 *
 * Disabled items are skipped rather than stopped at, so a set with a gap in it
 * still moves in one press.
 *
 * **Typeahead is opt-in.** Pass `typeahead` with a function that returns an
 * item's words, and a printable key moves to the next item whose words start
 * with the letters typed, choosing it where arriving chooses. A key that a text
 * field inside the set is typing into is left to the field.
 *
 * A set that starts from focus rather than from the selection, or that moves
 * without choosing, says so through `origin` and `selects`. Neither is a reason
 * to keep a hand-written copy, and neither exempts a set from both axes.
 */
export class KeyboardNavigationController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly items: () => NavigableItem[]

  private readonly originOf: () => KeyboardOrigin

  private readonly selects: () => boolean

  private readonly reserved: () => string[]

  private readonly wrap: boolean

  private readonly words: ((item: NavigableItem) => string) | undefined

  private readonly typeahead = new Typeahead()

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    {
      items,
      origin = 'selection',
      reserved = () => [],
      selects = () => true,
      typeahead,
      wrap = true,
    }: KeyboardNavigationOptions,
  ) {
    this.host = host
    this.items = items
    this.originOf = typeof origin === 'function' ? origin : () => origin
    this.reserved = reserved
    this.selects = selects
    this.words = typeahead
    this.wrap = wrap
    host.addController(this)
  }

  /** Where this press starts from, read again on every press. */
  private get origin(): KeyboardOrigin {
    return this.originOf()
  }

  /** Moves to an item, and chooses it where arriving is choosing. */
  private arrive(target: NavigableItem | undefined): void {
    target?.focusItem()
    if (this.selects()) {
      target?.select()
    }
  }

  /**
   * Where the reader is: the item the press came from, or the selection.
   *
   * **Focus first, where nothing is chosen.** A reader who tabs into an
   * unanswered set lands on its first item, and the selection then says `-1`.
   * Starting from `-1`, a forward step lands on that same first item, so the
   * first press appeared to do nothing and the second one moved. A native radio
   * group moves to the second radio on that press, and so does this.
   */
  private current(items: NavigableItem[], event: KeyboardEvent): number {
    /* The composed path rather than the target, which is retargeted at every
       shadow boundary: an item drawn in the host's own shadow root, as
       `Rating`'s marks are, is never the target of a press on the host. */
    const path = event.composedPath().filter((node): node is Node => node instanceof Node)
    const focused = items.findIndex((item) => path.some((node) => item.contains(node)))
    if (this.origin === 'focus') {
      return focused
    }
    const selected = items.findIndex((item) => item.selected)
    return selected < 0 ? focused : selected
  }

  /** Moves to the item whose words start with what was typed, if any. */
  private handleTypeahead(event: KeyboardEvent): void {
    const words = this.words
    if (!words || !typesCharacter(event) || keyClaimed(event)) {
      return
    }
    /* A Space with no search under way is a press, which a set may bind to
       choosing. Inside a search it is part of the words. */
    if (event.key === ' ' && !this.typeahead.typing()) {
      return
    }
    const items = this.items().filter((item) => !item.disabled)
    /* Nothing to move to, so the letter is not this set's to take. A closed
       menu passes no items, and its trigger would otherwise swallow it. */
    if (items.length === 0) {
      return
    }
    const from = this.current(items, event)
    if (this.origin === 'focus' && from === -1) {
      return
    }
    const at = this.typeahead.match(event.key, items.map(words), from)
    event.preventDefault()
    if (at >= 0 && at !== from) {
      this.arrive(items[at])
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key)) {
      this.handleTypeahead(event)
      return
    }
    if (this.reserved().includes(event.key)) {
      return
    }
    /* Not a press the host's content answers. A set holds more than its items
       often enough, a radio group's "Other" with a field beside it, and an
       arrow moving the caret there moved the answer as well. */
    if (keyClaimed(event)) {
      return
    }
    const items = this.items().filter((item) => !item.disabled)
    if (items.length === 0) {
      return
    }

    /* `-1` means two different things and only one of them is a starting point.
     *
       Starting from the selection, `-1` is "nothing is chosen and no item has
       focus", and the arithmetic below relies on it: a forward step lands on
       the first item and a backward step on the last, both of which are where a
       reader entering an unanswered set expects to arrive.

       Starting from focus, `-1` is "the press did not come from the set", and
       there is nothing to move. The listener is on the host, not on the items,
       and a host can hold more than the set: a tab panel is `tabindex="0"`, so
       an arrow pressed while reading a panel used to move the tabs out from
       under the reader. */
    const current = this.current(items, event)
    if (this.origin === 'focus' && current === -1) {
      return
    }
    const last = items.length - 1

    const along = inlineStep(this.host, event.key)
    let next = current
    if (along === 1 || event.key === 'ArrowDown') {
      next = this.wrap ? (current + 1) % items.length : Math.min(current + 1, last)
    } else if (along === -1 || event.key === 'ArrowUp') {
      /* From nothing, backwards is the last, which the arithmetic did not give.
       *
       * `(-1 - 1 + length) % length` is `length - 2`: the *second* to last, so
       * a reader arrowing backwards into an unanswered group lands one short of
       * the end. The wrapping form is right for every real index and wrong for
       * the one that is not an index.
       *
       * And the clamp is `Math.max` against the forward branch's `Math.min`.
       * Unclamped this is `-1` on the first item, and `items[-1]` is undefined,
       * so nothing is focused and nothing chosen on a press that
       * `preventDefault` has already swallowed. */
      next =
        current < 0
          ? last
          : this.wrap
            ? (current - 1 + items.length) % items.length
            : Math.max(current - 1, 0)
    } else if (event.key === 'Home') {
      next = 0
    } else {
      next = last
    }

    event.preventDefault()
    this.typeahead.reset()
    this.arrive(items[next])
  }

  hostConnected(): void {
    this.host.addEventListener('keydown', this.handleKeydown)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('keydown', this.handleKeydown)
  }
}
