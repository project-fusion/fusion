import { type DataOptionItem, ReorderController } from '@fusion.dev/helix-core'
import type { CSSResult, ReactiveController } from 'lit'
import type { HelixHeadlessOption } from '../../option/root/option-root.js'
import type { HelixHeadlessListbox } from '../root/listbox-root.js'

/**
 * The words a reader hears as an option moves, each read from an attribute of
 * the list, with the English it falls back to. `{name}` is the option's words,
 * and `{position}` and `{count}` say where it went.
 */
const WORDS = {
  canceledLabel: ['canceled-label', 'Canceled'],
  droppedLabel: ['dropped-label', 'Dropped'],
  movedLabel: ['moved-label', '{name} moved to position {position} of {count}'],
  pickedUpLabel: ['picked-up-label', 'Picked up {name}'],
} as const

/** The states an option takes in a move, which the styled tier draws. */
const MOVES = ['dragging', 'drop-after', 'drop-before'] as const

/** An option as the list draws it, with the custom states its element keeps. */
type Drawn = HelixHeadlessOption & { toggleState(name: string, on: boolean): void }

/** A record of `items` by its value, which is a string, as an option element's is. */
const keyOfItem = (item: DataOptionItem): string =>
  String(typeof item === 'object' ? item.value : item)

/**
 * Moves the options of a `reorderable` listbox, by pointer and by keyboard,
 * and says each move in the list's live region.
 *
 * **Its own entry**, `@fusion.dev/helix-headless/listbox/reorder`, so a list
 * that never moves options carries none of this. Importing the entry gives
 * every listbox one, and `reorderable` turns it on.
 *
 * - **Alt with Up or Down** moves the highlighted option a place at once, and
 *   Alt with Home or End to either end, as the APG's rearrangeable listbox
 *   does. The highlight stays on the option.
 * - **A pointer** drags a whole option, with no grip: a press that travels is
 *   a drag, and one that does not is still a press that chooses it. The list
 *   scrolls near an edge.
 * - **The page moves the options.** A drop sends `helix-before-reorder` and
 *   then `helix-reorder` with every value in the new order. An option in a
 *   group moves within its group, and a list of `items` moves its records.
 *
 * It marks the option being dragged with `:state(dragging)` and the one the
 * drop indicator is beside with `:state(drop-before)` or `:state(drop-after)`.
 * The styled tier's entry draws those through a sheet it hands in, which this
 * adopts into each option while the list reorders.
 */
export class ListboxReorderController implements ReactiveController {
  private readonly host: HelixHeadlessListbox

  /** The sheet each option adopts while the list reorders, from the styled tier. */
  sheet: CSSResult | undefined

  /** The options marked last, so a mark that moves is taken off where it was. */
  private marked = new Set<Drawn>()

  private readonly reorder: ReorderController

  constructor(host: HelixHeadlessListbox, sheet?: CSSResult) {
    this.host = host
    this.sheet = sheet
    host.addController(this)
    this.reorder = new ReorderController(host, {
      axis: 'block',
      box: (key) => this.optionFor(key)?.getBoundingClientRect(),
      current: () => {
        const active = this.drawn.find((option) => option.active)
        return active && !active.disabled ? active.value : undefined
      },
      enabled: () =>
        host.reorderable && host.filter === '' && host.layout !== 'grid' && !host.isDisabled,
      grip: (event) => {
        const option = this.optionOf(event)
        return option && !option.disabled ? { element: option, key: option.value } : undefined
      },
      holds: false,
      keys: (key) => this.keysAround(key),
      name: (key) => this.optionFor(key)?.text || key,
      scroller: () => host.renderRoot?.querySelector<HTMLElement>('[part="items"]') ?? null,
    })
  }

  /**
   * Marks where each option stands once the list has drawn: after the update,
   * because a list of `items` draws its options in its own last step, and
   * reuses each element for another record as it scrolls.
   */
  hostUpdated(): void {
    queueMicrotask(() => this.mark())
  }

  /** The options the list draws now: its elements, or the records it drew of `items`. */
  private get drawn(): Drawn[] {
    const host = this.host
    return (
      host.items
        ? [...(host.renderRoot?.querySelector('[data-rows]')?.children ?? [])]
        : host.options
    ) as Drawn[]
  }

  /** The option an event passed through. */
  private optionOf(event: Event): Drawn | undefined {
    const drawn = this.drawn
    return event.composedPath().find((node): node is Drawn => drawn.includes(node as Drawn))
  }

  /** The drawn option that stands for a value. */
  private optionFor(key: string): Drawn | undefined {
    return this.drawn.find((option) => option.value === key)
  }

  /**
   * The values an option moves among: every record of `items`, or the options
   * beside it, which in a list of groups are the options of its group.
   */
  private keysAround(key: string): string[] {
    const { items, options } = this.host
    if (items) {
      return items.map(keyOfItem)
    }
    const parent = options.find((option) => option.value === key)?.parentElement
    return options.filter((option) => option.parentElement === parent).map((one) => one.value)
  }

  /** Puts each option's state in a move on it, and the styled tier's sheet. */
  private mark(): void {
    const on = this.host.reorderable
    const drawn = this.drawn
    const marked = new Set<Drawn>()
    for (const option of drawn) {
      const move = on ? this.reorder.moveOf(option.value) : undefined
      if (move || this.marked.has(option)) {
        for (const state of MOVES) {
          option.toggleState(state, state === move)
        }
      }
      if (move) {
        marked.add(option)
      }
      this.adopt(option, on)
    }
    for (const option of this.marked) {
      if (!drawn.includes(option)) {
        for (const state of MOVES) {
          option.toggleState(state, false)
        }
      }
    }
    this.marked = marked
  }

  /** Gives an option the styled tier's sheet while the list reorders, and takes it back after. */
  private adopt(option: Drawn, on: boolean): void {
    const root = option.shadowRoot
    const sheet = this.sheet?.styleSheet
    if (!root || !sheet || root.adoptedStyleSheets.includes(sheet) === on) {
      return
    }
    root.adoptedStyleSheets = on
      ? [...root.adoptedStyleSheets, sheet]
      : root.adoptedStyleSheets.filter((one) => one !== sheet)
  }
}

/** The controller each list was given, so a class given one twice gives each list one. */
const given = new WeakMap<HelixHeadlessListbox, ListboxReorderController>()

/** Gives a list its controller, once, and the styled tier's sheet where it has none yet. */
const attach = (list: HelixHeadlessListbox, sheet: CSSResult | undefined): void => {
  const controller = given.get(list) ?? new ListboxReorderController(list)
  given.set(list, controller)
  controller.sheet ??= sheet
}

/**
 * The elements of a class already on the page, in the document and in every
 * open shadow root in it.
 */
const onPage = <T extends Element>(
  of: abstract new (...args: never[]) => T,
  root: ParentNode = document,
): T[] =>
  [...root.querySelectorAll('*')].flatMap((node) => [
    ...(node instanceof of ? [node] : []),
    ...(node.shadowRoot ? onPage(of, node.shadowRoot) : []),
  ])

/**
 * Gives every listbox of a class a `ListboxReorderController`, and the class
 * the words it says, as properties that read and write their attributes:
 * `movedLabel`, `canceledLabel`, `droppedLabel`, and `pickedUpLabel`.
 *
 * The entries call it for their own tier's class: the headless entry for
 * `HelixHeadlessListbox`, and the styled one for `HelixListbox`, with the
 * sheet that draws a move. A class that has registered keeps the list of what
 * it was given when it did, so each is given its own.
 *
 * **Lists already on the page are given one too.** A page that imports the
 * list and then this entry has its lists upgraded, and built, before this
 * runs, so the ones in the document and its open shadow roots are found and
 * given theirs, and every list built after gets one as it is built.
 */
export const reorderListbox = (element: typeof HelixHeadlessListbox, sheet?: CSSResult): void => {
  element.addInitializer((host) => attach(host as HelixHeadlessListbox, sheet))
  if (typeof document !== 'undefined') {
    for (const list of onPage(element)) {
      attach(list, sheet)
      list.requestUpdate()
    }
  }
  const proto = element.prototype
  for (const [name, [attribute, fallback]] of Object.entries(WORDS)) {
    if (name in proto) {
      continue
    }
    Object.defineProperty(proto, name, {
      configurable: true,
      get(this: HTMLElement): string {
        return this.getAttribute(attribute) ?? fallback
      },
      set(this: HTMLElement, next: string): void {
        this.setAttribute(attribute, next)
      },
    })
  }
}
