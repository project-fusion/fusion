import {
  html,
  type ReactiveController,
  type ReactiveControllerHost,
  type TemplateResult,
} from 'lit'
import {
  type DataOption,
  type DataOptionItem,
  dataOptions,
  drawOptions,
  windowOf,
} from '../../utils/data-options/data-options.js'
import { VirtualizeController } from '../virtualize-controller/virtualize-controller.js'

/** What the controller needs of a list whose options can come as data. */
export interface OptionWindowOptions {
  /** The value of the option the keyboard is on, which is kept drawn. */
  current: () => string
  /** The options as data, or nothing for a list of child elements. */
  items: () => readonly DataOptionItem[] | undefined
}

/**
 * Draws the options of a list handed over as data, a window of them at a
 * time, for a list too long to draw whole.
 *
 * **The list keeps its logic and this keeps the drawing.** `records` are the
 * options as the list reads them, built once per `items` array: the keyboard,
 * the typeahead, the filter and the value work over all of them, and the list
 * writes `hidden`, `selected` and `active` onto them as it would onto its
 * option elements. This draws the ones in the window as option elements of
 * the host's tier, between two spacers that hold the room of the rest, through
 * `VirtualizeController`.
 *
 * **The option the keyboard is on is always drawn**, wherever the window is,
 * because `aria-activedescendant` points at an element. `follow` brings it into
 * view when it moves, in two steps where it is far: the arithmetic scrolls the
 * window to it, and the host scrolls the drawn element into view on the next
 * update, as it does for a list of children.
 *
 * **The scrolling box is the element `render` was drawn into**, so the host
 * says nothing about it: it puts the template inside its box. A host's
 * `isDisabled`, or else its `disabled`, holds every drawn option down.
 *
 * Listbox uses it, and so every list that holds a Listbox can.
 */
export class OptionWindowController implements ReactiveController {
  private readonly host: ReactiveControllerHost &
    HTMLElement & { disabled?: boolean; isDisabled?: boolean }
  private readonly options: OptionWindowOptions

  /** The option elements drawn on the last update, in order. */
  drawn: HTMLElement[] = []

  /** The `items` array the records were built from. */
  private source: readonly DataOptionItem[] | undefined

  private built: DataOption[] | undefined

  /** Which slice is drawn, made the first time there are records. */
  private virtualize: VirtualizeController | undefined

  /** Where in the shown records the highlight is: `-1` for nowhere. */
  private kept = -1

  /** Whether the highlight is still being brought into view. */
  private following = false

  /**
   * The window as it was last drawn, which `follow` reads: the controller's
   * own may have moved since, measured after the draw, and an option is in
   * its place only in the window that drew it.
   */
  private span = { first: 0, last: 0 }

  constructor(
    host: ReactiveControllerHost & HTMLElement & { disabled?: boolean; isDisabled?: boolean },
    options: OptionWindowOptions,
  ) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  /**
   * The options as the list reads them, or undefined for a list of children.
   *
   * Built when `items` is a new array, so a page that changes the set hands
   * over a new one, as a property of any framework is set. The windowing is
   * made then too, and only then: a list of children observes no size and
   * listens to no scroll it does not need. Its estimate of 32 pixels is
   * corrected by the rows it draws, on first sight.
   */
  get records(): DataOption[] | undefined {
    const items = this.options.items()
    if (items !== this.source) {
      this.source = items
      this.built = items && dataOptions(items)
      this.virtualize?.forget()
      if (items) {
        this.virtualize ??= new VirtualizeController(this.host, {
          container: () => this.box()?.parentElement,
          count: () => this.shown.length,
          estimate: () => 32,
          measured: () => false,
          rows: () =>
            this.drawn.map((element) => ({
              element,
              index: Number(element.getAttribute('aria-posinset')) - 1,
            })),
        })
      }
    }
    return this.built
  }

  /** The box the window is drawn into, inside the scrolling one. */
  private box(): HTMLElement | null | undefined {
    return this.host.shadowRoot?.querySelector('[data-rows]')
  }

  /** The records a filter has left showing. */
  private get shown(): DataOption[] {
    return this.records?.filter((record) => !record.hidden) ?? []
  }

  /**
   * The spacers and the box the window is drawn in, for the host's scrolling
   * box, or undefined for a list of children, which draws its slot instead.
   *
   * A spacer never shrinks: in a column of rows that flexes, it shrank to
   * nothing, and the list scrolled for a screenful.
   */
  render(): TemplateResult | undefined {
    if (!this.records || !this.virtualize) {
      return undefined
    }
    const current = this.options.current()
    this.kept = this.shown.findIndex((record) => record.value === current)
    const { after, before } = this.virtualize.spacers(this.kept < 0 ? undefined : this.kept)
    return html`<div style="flex: none; block-size: ${before}px"></div>
      <div data-rows></div>
      <div style="flex: none; block-size: ${after}px"></div>`
  }

  /**
   * Draws the window once the render has put its box in place, then measures
   * it again. Before `VirtualizeController`'s own pass, which reads the rows.
   */
  hostUpdated(): void {
    const box = this.box()
    if (!this.records || !this.virtualize || !box) {
      return
    }
    const { first, last } = this.virtualize.window
    const shown = this.shown
    this.span = { first, last }
    this.drawn = drawOptions(
      box,
      `${(this.host.constructor as { tier?: string }).tier}option`,
      shown,
      windowOf(first, last, shown.length, this.kept),
      Boolean(this.host.isDisabled ?? this.host.disabled),
    )
    this.virtualize.measure()
  }

  /**
   * Brings the highlight into view where `moved` says it moved, and answers
   * whether its drawn element is in place for the host to scroll to now.
   *
   * Only when it moved, or the filter did: the window moves on every scroll,
   * and following then would pull a reader scrolling with a wheel back to the
   * highlight.
   */
  follow(moved: boolean): boolean {
    this.following ||= moved
    if (!this.virtualize || !this.following || this.kept < 0) {
      return false
    }
    const { first, last } = this.span
    if (this.kept < first || this.kept >= last) {
      this.virtualize.reveal(this.kept)
      return false
    }
    this.following = false
    return true
  }

  /** Scrolls the box to put the option of `value` in its middle. */
  center(value: string): void {
    const at = this.shown.findIndex((record) => record.value === value)
    if (at >= 0) {
      this.virtualize?.reveal(at, 0, { align: 'center' })
    }
  }
}
