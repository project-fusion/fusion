import {
  customElement,
  HelixElement,
  KeyboardNavigationController,
  type NavigableItem,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessAccordionItem } from '../item/accordion-item.js'

/**
 * An item as the keyboard controller moves through it.
 *
 * **`contains` is the item itself and not `Node.contains`, and that is the
 * reason this is an adapter rather than the item implementing the interface.**
 * The controller asks each item whether the press came from inside it, and an
 * accordion item holds its content as well as its trigger: a text field in an
 * open section is inside the item, so `Node.contains` would hand its arrow
 * keys to the accordion and the caret would stop moving. A press on the
 * trigger is retargeted to the item at the accordion's boundary, so the item
 * being the target is exactly "the press came from a trigger".
 *
 * Arriving chooses nothing, since a trigger is not a choice, and nothing here
 * is disabled: `<details>` has no such state and neither does the item.
 */
const navigable = (item: HelixHeadlessAccordionItem): NavigableItem => ({
  contains: (node) => node === item,
  disabled: false,
  focusItem: () => item.focusTrigger(),
  select: () => {},
  selected: false,
})

/**
 * @summary A group of collapsible sections.
 *
 * @description
 * Holds the mode. Each item coordinates itself: when you click an item, it
 * finds the nearest accordion, reads the mode, and closes the other items.
 *
 * The accordion does not listen for items opening. `helix-before-open` does not
 * bubble and is not composed, because overlays nest and an inner overlay's
 * events must stay separate from the outer one's.
 *
 * Items are found when they are clicked, so there is no registry to keep up to
 * date. An item added after render coordinates on its first click. Items are
 * matched with `instanceof HelixHeadlessAccordionItem`, so the headless tier
 * does not depend on the styled tier's tag names.
 *
 * The keyboard listener belongs to the controller and is attached on connect,
 * so it does not run on the server.
 *
 * Each trigger sits inside a heading, level 3 unless `heading-level` says
 * otherwise, so the sections are in a screen reader's list of headings. Set the
 * level that fits the page's outline.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Collapse, Expander group
 * @documentation https://fusion.dev/helix/components/accordion
 *
 * @slot - The accordion's items.
 */
@customElement('helix-headless-accordion')
export class HelixHeadlessAccordion extends HelixElement {
  /**
   * How many sections may be open at once.
   *
   * Absent is `multiple`, so nothing closes unexpectedly and the default costs
   * no attribute on the host. `single` keeps exactly one open and refuses to
   * close the last; `single-collapsible` keeps at most one and lets it close.
   *
   * Held however a section opens: a press, `open` set from a script,
   * `toggleOpen()`, or `default-open` in the markup. Opening one closes the
   * others, and on first render only the first section written open stays
   * open. Under `single` the first section opens when none is written open.
   *
   * A union rather than a mode plus a `collapsible` boolean, which would make
   * `collapsible` alongside `multiple` expressible and meaningless.
   */
  @property({ reflect: true })
  mode?: 'single' | 'single-collapsible'

  /**
   * The level of the heading around each trigger, from 1 to 6.
   *
   * Unset is 3. An item's own `heading-level` wins over this.
   */
  @property({ attribute: 'heading-level', type: Number })
  headingLevel?: number

  /** The accordion's own items, in the order they are written. Browser only. */
  get items(): HelixHeadlessAccordionItem[] {
    return [...this.children].filter(
      (child): child is HelixHeadlessAccordionItem => child instanceof HelixHeadlessAccordionItem,
    )
  }

  /* Arrow keys, Home and End between the triggers, wrapping. Same controller
     as the tabs and the toggle group: `origin: 'focus'` because the press says
     which item it came from, and `selects` off because arriving on a trigger
     opens nothing. Both axes, by the controller's own argument, where the
     hand-written copy this replaces answered only up and down. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.items.map(navigable),
    origin: 'focus',
    selects: () => false,
  })

  /**
   * Holds the mode over the sections as written, and passes the heading level
   * down. A section opened later closes its peers itself.
   */
  private settle(): void {
    const items = this.items
    for (const item of items) {
      whenHydrated(item, () => {
        item.groupHeadingLevel = this.headingLevel
      })
    }
    if (this.mode === undefined) {
      return
    }
    const open = items.filter((item) => item.open)
    for (const extra of open.slice(1)) {
      whenHydrated(extra, () => {
        extra.open = false
      })
    }
    const first = items[0]
    if (this.mode === 'single' && open.length === 0 && first) {
      whenHydrated(first, () => {
        first.open = true
      })
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.settle()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (this.hasUpdated && (changed.has('mode') || changed.has('headingLevel'))) {
      this.settle()
    }
  }

  protected override render(): TemplateResult {
    return html`<slot @slotchange=${() => this.settle()}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-accordion': HelixHeadlessAccordion
  }
}
