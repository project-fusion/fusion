import {
  customElement,
  formatWords,
  HelixElement,
  hostAria,
  internalsOf,
  numberConverter,
  UpgradeController,
  whenHydrated,
  words,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
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
 * With `max-items`, a trail that is longer folds its middle into a menu: the
 * first crumb, a button, then the last `max-items` less one. The button is a
 * ghost icon button named by `expand-label`, and opens a menu whose rows are
 * the crumbs folded, each a link to its crumb, drawn by the first crumb
 * after its link. A slotted trail hides the crumbs it folds, which take no
 * room; a change to the crumbs, or a new `items`, folds again.
 *
 * **Keyboard.** Each crumb with an `href` is a link and one tab stop, and
 * Enter follows it. The current page and the separators are not in the tab
 * order. In a folded trail, Enter, Space, or Down on the fold's button opens
 * its menu on its first row, and the menu's keys move among the rows.
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
 * @csspart crumb-current - The crumb drawn from `items` for the current page.
 * @csspart crumb-expand - The button of the fold the first crumb drawn from `items` draws, which opens its menu.
 * @csspart crumb-expand-button - The `expand-button` part of a crumb drawn from `items`.
 * @csspart crumb-expand-live - The `expand-live` part of a crumb drawn from `items`.
 * @csspart crumb-expand-mark - The `expand-mark` part of a crumb drawn from `items`.
 * @csspart crumb-expand-spinner - The `expand-spinner` part of a crumb drawn from `items`.
 * @csspart crumb-expand-text - The `expand-text` part of a crumb drawn from `items`.
 * @csspart crumb-fold - The `fold` part of a crumb drawn from `items`.
 * @csspart crumb-fold-back - The `fold-back` part of a crumb drawn from `items`.
 * @csspart crumb-fold-back-mark - The `fold-back-mark` part of a crumb drawn from `items`.
 * @csspart crumb-fold-empty - The `fold-empty` part of a crumb drawn from `items`.
 * @csspart crumb-fold-header - The `fold-header` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item - The `fold-item` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-end - The `fold-item-end` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-item - The `fold-item-item` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-mark - The `fold-item-mark` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-shortcut - The `fold-item-shortcut` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-shortcut-kbd - The `fold-item-shortcut-kbd` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-shortcut-key - The `fold-item-shortcut-key` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-shortcut-separator - The `fold-item-shortcut-separator` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-start - The `fold-item-start` part of a crumb drawn from `items`.
 * @csspart crumb-fold-item-surface - The `fold-item-surface` part of a crumb drawn from `items`.
 * @csspart crumb-fold-live - The `fold-live` part of a crumb drawn from `items`.
 * @csspart crumb-fold-loading - The `fold-loading` part of a crumb drawn from `items`.
 * @csspart crumb-fold-search-field - The `fold-search-field` part of a crumb drawn from `items`.
 * @csspart crumb-fold-separator - The box before that button, which holds its mark.
 * @csspart crumb-fold-separator-mark - The chevron before that button, or the slash under `separator="slash"`.
 * @csspart crumb-fold-surface - The `fold-surface` part of a crumb drawn from `items`.
 * @csspart crumb-fold-title - The `fold-title` part of a crumb drawn from `items`.
 * @csspart crumb-link - The link, or the current page's words, of a crumb drawn from `items`.
 * @csspart crumb-separator - The separator before a crumb drawn from `items`.
 * @csspart crumb-separator-mark - The chevron, or the slash under `separator="slash"`, before a crumb drawn from `items`.
 * @csspart list - The ordered list.
 */
@customElement('helix-headless-breadcrumbs')
export class HelixHeadlessBreadcrumbs extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-breadcrumbs': { fallbackLabel: 'Brotkrümelpfad' } })`.
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

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Breadcrumb'

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
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /**
   * The most crumbs a trail drawn from `items` shows before it folds its middle
   * into one, counting the first and the last. Unset, it never folds. At least
   * 2, so the first crumb and the current page always show.
   */
  @property({ attribute: 'max-items', converter: numberConverter('max-items', undefined) })
  maxItems?: number

  /**
   * The mark between one crumb and the next, for the whole trail. Unset is a
   * chevron; `slash` is a slash, as a path or a repository and its branch is
   * written.
   *
   * **On the trail rather than on each crumb**, because the marks are one
   * decision: a trail whose separators differ from crumb to crumb is a
   * mistake, and a trail drawn from `items` has no crumb of yours to set it
   * on. A crumb's own `separator` slot still replaces its mark, for the rare
   * crumb that needs something else.
   *
   * Optional and reflected, per the rule that a reflected property takes no
   * default, so a stylesheet can select on it.
   */
  @property({ reflect: true })
  separator?: 'slash'

  /** The crumbs slotted into the trail, in order. */
  private get slotted(): HelixHeadlessBreadcrumb[] {
    return (
      this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])')?.assignedElements() ?? []
    ).filter((one): one is HelixHeadlessBreadcrumb => one instanceof HelixHeadlessBreadcrumb)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host through internals, so the landmark is the element itself and
    // an author's `aria-label` names it without anything being copied inward.
    // The default name goes the same way, and an attribute beats internals.
    hostAria(internalsOf(this), { label: this.label || this.fallbackLabel, role: 'navigation' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markLast()
  }

  /** How many crumbs drawn from `items` are folded away, or 0. */
  private get folded(): number {
    const most = this.maxItems ?? 0
    const count = this.items.length
    return most >= 2 && count > most ? count - most : 0
  }

  /**
   * Says the last slotted crumb is the current page where none is marked
   * `current`, as React Aria's trail does. Through a property the crumb does
   * not reflect, so nothing is written onto your markup.
   */
  private readonly markLast = (): void => {
    const crumbs = this.slotted
    const marked = crumbs.some((one) => one.current)
    /* A slotted trail folds as a drawn one does: the crumbs after the first,
       up to the last `max-items` less one. */
    const most = this.maxItems ?? 0
    const fold =
      this.items.length === 0 && most >= 2 && crumbs.length > most ? crumbs.length - most : 0
    const folded = crumbs.slice(1, 1 + fold).map((crumb) => ({
      href: crumb.href ?? '',
      label: (crumb.textContent ?? '').trim(),
    }))
    const label = fold > 0 ? formatWords(this, 'expandLabel', { count: fold }) : ''
    crumbs.forEach((crumb, index) => {
      whenHydrated(crumb, () => {
        crumb.implied = !marked && this.items.length === 0 && index === crumbs.length - 1
        crumb.folded = index > 0 && index <= fold
        crumb.fold = index === 0 ? fold : 0
        crumb.foldCrumbs = index === 0 ? folded : []
        crumb.foldLabel = index === 0 ? label : ''
        crumb.mark = this.separator ?? 'chevron'
      })
    })
  }

  /** New crumbs fold again, as a new `items` does. */
  private readonly handleSlotChange = (): void => {
    this.markLast()
  }

  /** Reads a crumb again once it upgrades, so the current one is marked. */
  protected readonly upgradeWatch = new UpgradeController(this, this.handleSlotChange)

  /** The crumbs `items` describes, each a crumb of this tier. */
  protected renderItems(): TemplateResult | typeof nothing {
    if (this.items.length === 0) {
      return nothing
    }
    const crumb = this.tag('breadcrumb')
    const last = this.items.length - 1
    const folded = this.folded
    const label = folded > 0 ? formatWords(this, 'expandLabel', { count: folded }) : ''
    /* The first crumb, which draws the fold, then the rest from past what it holds. */
    const shown = this.items
      .map((item, index) => ({ index, item }))
      .filter(({ index }) => folded === 0 || index === 0 || index > folded)
    const crumbs = this.items
      .slice(1, 1 + folded)
      .map((item) => ({ href: item.href ?? '', label: item.label }))
    const draw = ({ index, item }: { index: number; item: BreadcrumbItem }) => html`<${crumb}
        part="crumb${index === last ? ' crumb-current' : ''}"
        exportparts="expand: crumb-expand, expand-button: crumb-expand-button, expand-live: crumb-expand-live, expand-mark: crumb-expand-mark, expand-spinner: crumb-expand-spinner, expand-text: crumb-expand-text, fold: crumb-fold, fold-back: crumb-fold-back, fold-back-mark: crumb-fold-back-mark, fold-empty: crumb-fold-empty, fold-header: crumb-fold-header, fold-item: crumb-fold-item, fold-item-end: crumb-fold-item-end, fold-item-item: crumb-fold-item-item, fold-item-mark: crumb-fold-item-mark, fold-item-shortcut: crumb-fold-item-shortcut, fold-item-shortcut-kbd: crumb-fold-item-shortcut-kbd, fold-item-shortcut-key: crumb-fold-item-shortcut-key, fold-item-shortcut-separator: crumb-fold-item-shortcut-separator, fold-item-start: crumb-fold-item-start, fold-item-surface: crumb-fold-item-surface, fold-live: crumb-fold-live, fold-loading: crumb-fold-loading, fold-search-field: crumb-fold-search-field, fold-separator: crumb-fold-separator, fold-separator-mark: crumb-fold-separator-mark, fold-surface: crumb-fold-surface, fold-title: crumb-fold-title, link: crumb-link, separator: crumb-separator, separator-mark: crumb-separator-mark"
        href=${index === last ? nothing : (item.href ?? nothing)}
        rel=${item.rel ?? nothing}
        target=${item.target ?? nothing}
        ?current=${index === last}
        .fold=${index === 0 ? folded : 0}
        .foldCrumbs=${index === 0 ? crumbs : []}
        .foldLabel=${index === 0 ? label : ''}
        .mark=${this.separator ?? 'chevron'}
        >${item.label}</${crumb}
      >`
    return html`${repeat(shown, ({ index }) => index, draw)}`
  }

  protected override render(): TemplateResult {
    /* One slot. The crumb holding the fold is one the consumer placed in
       source order, so there is nothing here to position it: the list renders
       what it was given, in the order it was given. */
    return html`<ol part="list" role="list">
      ${this.renderItems()}<slot @slotchange=${this.handleSlotChange}></slot>
    </ol>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-breadcrumbs': HelixHeadlessBreadcrumbs
  }
}
