import {
  customElement,
  formatWords,
  HelixElement,
  hostAria,
  whenHydrated,
  words,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { html } from 'lit/static-html.js'
import { HelixHeadlessBreadcrumb } from '../breadcrumb/breadcrumb.js'

/** One step of a trail written as data, for `items`. */
export interface BreadcrumbItem {
  /** The URL the step links to. The last step is the current page and takes none. */
  href?: string
  /** The step's words. */
  label: string
  /** The link's `rel`. */
  rel?: string
  /** Where the link opens. */
  target?: string
}

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * The host is the navigation landmark, named "Breadcrumb" by default. An
 * `aria-label` on the host names the trail instead, and so does `label`. When a
 * page has more than one navigation landmark, screen reader users choose
 * between them by name.
 *
 * The `<ol>` has an explicit `role="list"`, because Safari removes list
 * semantics from a list with `list-style: none`, and the trail always hides its
 * markers.
 *
 * The items are slotted directly, so they are `<ol>` children in the flat tree,
 * and each item sets `role="listitem"` on itself. Where no slotted crumb is
 * `current`, the last one is said to be the current page.
 *
 * The trail does not measure itself, and you write its overflow in markup: put
 * the crumb that holds the folded items where the gap should appear.
 *
 * A trail built from data, such as a router's matched routes, takes `items`: an
 * array of `{ label, href }`, drawn as crumbs in order, the last one as the
 * current page. Slotted crumbs follow them. Use one way or the other in a trail.
 *
 * With `max-items`, a trail drawn from `items` that is longer folds its middle
 * into one crumb: the first crumb, a button, then the last `max-items` less one.
 * The button is named by `expand-label` and shows the whole trail, moving focus
 * to the first crumb it brought back. A new `items` folds again. Slotted crumbs
 * do not fold; write the folded crumb where the gap should be.
 *
 * **Keyboard.** Each crumb with an `href` is a link and one tab stop, and
 * Enter follows it. The current page and the separators are not in the tab
 * order. In a folded trail, Enter or Space on the fold's button shows the
 * whole trail and moves focus to the first crumb it brought back.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://fusion.dev/helix/components/breadcrumbs
 *
 * @slot - The trail's items, in order from the root to the current page. Put
 * the crumb that holds the folded items where the gap should appear.
 *
 * @csspart crumb - Each crumb drawn from `items`.
 * @csspart crumb-collapsed - The crumb that holds the folded middle of a trail longer than `max-items`.
 * @csspart crumb-current - The crumb drawn from `items` for the current page.
 * @csspart crumb-link - The link, or the current page's words, of a crumb drawn from `items`.
 * @csspart crumb-separator - The separator before a crumb drawn from `items`.
 * @csspart crumb-separator-mark - The chevron before a crumb drawn from `items`.
 * @csspart expand - The button in the folded crumb that shows the whole trail.
 * @csspart list - The ordered list.
 */
@customElement('helix-headless-breadcrumbs')
export class HelixHeadlessBreadcrumbs extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-breadcrumbs': { label: 'Brotkrümelpfad' } })`.
   */
  static words = 'helix-breadcrumbs'

  /**
   * The name of the button that shows a folded trail's hidden crumbs. `{count}`
   * is how many it shows, written in the locale, and a language with plural
   * forms writes them: `{count, plural, one {# weiteren zeigen} other {#
   * weitere zeigen}}`.
   */
  @words
  @property({ attribute: 'expand-label' })
  expandLabel = 'Show {count} more'

  /**
   * The trail as data, drawn as crumbs before any you slot. The last item is the
   * current page.
   *
   * React Aria's `items`. A property only: a trail is built by script, and an
   * attribute would put the whole path into the markup twice.
   */
  @property({ attribute: false })
  items: BreadcrumbItem[] = []

  /**
   * The landmark's name, read by screen readers. An `aria-label` on the host
   * wins over it.
   */
  @words
  @property()
  label = 'Breadcrumb'

  /**
   * The most crumbs a trail drawn from `items` shows before it folds its middle
   * into one, counting the first and the last. Unset, it never folds. At least
   * 2, so the first crumb and the current page always show.
   */
  @property({ attribute: 'max-items', type: Number })
  maxItems?: number

  /** Whether a reader has asked to see the whole of a folded trail. */
  @state()
  private expanded = false

  /** Shows the whole trail and moves focus to the first crumb it brought back. */
  private readonly expand = (): void => {
    this.expanded = true
    this.updateComplete.then(() => {
      const crumb = this.renderRoot.querySelectorAll('[part~="crumb"]')[1]
      crumb?.shadowRoot?.querySelector<HTMLElement>('a, [part="link"]')?.focus()
    })
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host through internals, so the landmark is the element itself and
    // an author's `aria-label` names it without anything being copied inward.
    // The default name goes the same way, and an attribute beats internals.
    hostAria(this.internals, { label: this.label, role: 'navigation' })
    if (changed.has('items') && changed.get('items') !== undefined) {
      this.expanded = false
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markLast()
  }

  /** How many crumbs drawn from `items` are folded away, or 0. */
  private get folded(): number {
    const most = this.maxItems ?? 0
    const count = this.items.length
    return !this.expanded && most >= 2 && count > most ? count - most : 0
  }

  /**
   * Says the last slotted crumb is the current page where none is marked
   * `current`, as React Aria's trail does. Through a property the crumb does
   * not reflect, so nothing is written onto your markup.
   */
  private readonly markLast = (): void => {
    const crumbs = (
      this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])')?.assignedElements() ?? []
    ).filter((one): one is HelixHeadlessBreadcrumb => one instanceof HelixHeadlessBreadcrumb)
    const marked = crumbs.some((one) => one.current)
    crumbs.forEach((crumb, index) => {
      whenHydrated(crumb, () => {
        crumb.implied = !marked && this.items.length === 0 && index === crumbs.length - 1
      })
    })
  }

  /** The crumbs `items` describes, each a crumb of this tier. */
  protected renderItems(): TemplateResult | typeof nothing {
    if (this.items.length === 0) {
      return nothing
    }
    const crumb = this.tag('breadcrumb')
    const last = this.items.length - 1
    const folded = this.folded
    /* The first crumb, then the fold, then the rest from past what it holds. */
    const shown = this.items
      .map((item, index) => ({ index, item }))
      .filter(({ index }) => folded === 0 || index === 0 || index > folded)
    const fold =
      folded === 0
        ? nothing
        : html`<${crumb}
            part="crumb crumb-collapsed"
            exportparts="link: crumb-link, separator: crumb-separator, separator-mark: crumb-separator-mark"
            ><button
              part="expand"
              type="button"
              aria-label=${formatWords(this, 'expandLabel', { count: folded })}
              @click=${this.expand}
            >
              …
            </button></${crumb}
          >`
    const first = shown.slice(0, 1)
    const rest = shown.slice(1)
    const draw = ({ index, item }: { index: number; item: BreadcrumbItem }) => html`<${crumb}
        part="crumb${index === last ? ' crumb-current' : ''}"
        exportparts="link: crumb-link, separator: crumb-separator, separator-mark: crumb-separator-mark"
        href=${index === last ? nothing : (item.href ?? nothing)}
        rel=${item.rel ?? nothing}
        target=${item.target ?? nothing}
        ?current=${index === last}
        >${item.label}</${crumb}
      >`
    return html`${repeat(first, ({ index }) => index, draw)}${fold}${repeat(
      rest,
      ({ index }) => index,
      draw,
    )}`
  }

  protected override render(): TemplateResult {
    /* One slot. The crumb holding the fold is one the consumer placed in
       source order, so there is nothing here to position it: the list renders
       what it was given, in the order it was given. */
    return html`<ol part="list" role="list">
      ${this.renderItems()}<slot @slotchange=${this.markLast}></slot>
    </ol>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-breadcrumbs': HelixHeadlessBreadcrumbs
  }
}
