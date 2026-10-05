import {
  AriaForwardController,
  customElement,
  focusableElements,
  HelixElement,
  IndicatorController,
  KeyboardNavigationController,
  type NavigableItem,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** What can take focus itself, which a destination usually is. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * A destination as the keyboard controller moves through it: the link itself,
 * a `Megamenu`'s trigger, or the first thing inside it that takes focus.
 *
 * `contains` is that control and what is inside it, and not the whole
 * destination, so an arrow pressed among the links of an open megamenu panel
 * stays with the panel.
 */
const navigable = (item: HTMLElement): NavigableItem => {
  const control = (): HTMLElement | undefined =>
    (item as HTMLElement & { navigationControl?: HTMLElement }).navigationControl ??
    (item.matches(FOCUSABLE) ? item : focusableElements(item)[0])
  return {
    contains: (node) => {
      const target = control()
      return target !== undefined && node !== null && (node === target || target.contains(node))
    },
    disabled: false,
    focusItem: () => control()?.focus(),
    select: () => {},
    selected: false,
  }
}

/**
 * @summary A set of destinations, with a marker on the current one.
 *
 * @description
 * Renders a real `<nav>`, the landmark that screen reader users jump to.
 * Navigation is its own component, separate from `AppHeader`, so you can use it
 * in a header, a footer, or a sidebar.
 *
 * **It renders no links.** Bring your own, mark the current one with
 * `aria-current="page"`, and style them with the `data-navigation-item` recipe.
 * A router renders its own anchors and cannot render them inside the
 * component's shadow root.
 *
 * The component moves a marker to the current item. It finds the current item
 * by reading `aria-current`, so the attribute that screen readers announce also
 * places the marker. Any value but `false` counts, so a sidebar of sections on
 * one page can mark the section in view with `aria-current="location"`. Where
 * several are marked, `page` wins.
 *
 * Set `orientation="vertical"` to stack the destinations in a column, for a
 * sidebar.
 *
 * Set `arrows` and the arrow keys move focus between the destinations, as
 * Radix's navigation menu does: left and right along a row, up and down a
 * column, Home and End to the ends. A `Megamenu` among them is reached at its
 * trigger. Tab still stops at every link, since a navigation is a list of
 * links and not a single control, and the keys across the other axis are
 * left to the page and to an open panel.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Nav, NavList, Tabs
 * @documentation https://fusion.dev/helix/components/navigation
 *
 * @slot - The destinations, as your own links.
 * @slot indicator - A marker of your own, drawn inside the `indicator` part, where the current destination's place and size reach it.
 *
 * @csspart indicator - The marker that moves to the current destination. It carries the destination's place and size as `--indicator-x`, `--indicator-y`, `--indicator-inline-size` and `--indicator-block-size`, and `data-placed` once it has been placed.
 * @csspart nav - The navigation landmark.
 */
@customElement('helix-headless-navigation')
export class HelixHeadlessNavigation extends HelixElement {
  /* The controller carries the RTL sign and border correction: a distance
     measured from the physical left and applied from the inline-start edge
     travels the wrong way in a right-to-left document. */
  private readonly indicator = new IndicatorController(this, {
    active: () => {
      const items = this.items
      const marked = (item: HTMLElement): boolean => {
        const current = item.getAttribute('aria-current')
        return current !== null && current !== 'false'
      }
      return (
        items.find((item) => item.getAttribute('aria-current') === 'page') ?? items.find(marked)
      )
    },
    indicator: () => this.partNamed('indicator'),
    observe: () => this.items,
    surface: () => this.partNamed('nav'),
  })

  /**
   * Whether the arrow keys move focus between the destinations.
   *
   * Off by default, so a page whose readers scroll with the arrow keys while
   * a link has focus keeps doing so.
   */
  @property({ type: Boolean })
  arrows = false

  /**
   * The landmark's name, read by screen readers.
   *
   * An `aria-label` or `aria-labelledby` on the host names the landmark too,
   * and wins over this, so a footer navigation written the usual way is not a
   * second "Main".
   */
  @property()
  label = 'Main'

  /* The arrow keys, through the shared controller: from where focus is,
     choosing nothing, stopping at the ends. Only the axis the destinations run
     along: the other is the page's to scroll with and an open panel's. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => (this.arrows ? this.items.map(navigable) : []),
    origin: 'focus',
    reserved: () =>
      this.orientation === 'vertical' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowDown', 'ArrowUp'],
    selects: () => false,
    wrap: false,
  })

  /** Carries a host `aria-label` and `aria-labelledby` to the `<nav>`. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('nav'),
  })

  /**
   * Stacks the destinations in a column, for a sidebar, where unset is a row
   * for a header or a footer. The marker follows the current destination down
   * the column as it does along the row.
   */
  @property({ reflect: true })
  orientation?: 'vertical'

  private current: MutationObserver | undefined

  /** The destinations the consumer slotted. */
  private get items(): HTMLElement[] {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])')
    return (slot?.assignedElements() ?? []) as HTMLElement[]
  }

  /** Re-measures when the links change or hand over the current page. */
  private watch(): void {
    this.current?.disconnect()

    /* Nothing is written onto the items, and `data-navigation-item` must not be
     * written here: it would land after upgrade, so a server-rendered nav would
     * arrive unstyled and restyle itself a frame later, and a React consumer
     * who wrote the attribute themselves gets `data-navigation-item="true"`
     * from JSX, which overwriting reports as a hydration mismatch. The base
     * layer selects the links through the host instead, so the styling is true
     * the moment the markup is parsed, on the server and on the client. */
    this.indicator.place()

    // Client-side routing changes `aria-current` in place rather than
    // reloading, so nothing else would tell the marker to move.
    this.current = new MutationObserver(() => this.indicator.place())
    for (const item of this.items) {
      this.current.observe(item, { attributeFilter: ['aria-current'] })
    }
  }

  /* Rebuilt on reconnection, because nothing else does it.
   *
   * `firstUpdated` runs once for the life of the element and
   * `disconnectedCallback` runs every time it moves, so a framework reordering
   * a list left this permanently dead: the observer gone, nothing to rebuild
   * it, and the component still rendering as though it were watching. Guarded
   * on `hasUpdated`, because the first connection happens before the first
   * render and there is nothing to watch yet. */
  override connectedCallback(): void {
    super.connectedCallback()
    if (this.hasUpdated) {
      this.watch()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.current?.disconnect()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watch()
  }

  protected override render(): TemplateResult {
    return html`<nav part="nav" aria-label=${this.label}>
      <div part="indicator" aria-hidden="true"><slot name="indicator"></slot></div>
      <slot @slotchange=${() => this.watch()}></slot>
    </nav>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-navigation': HelixHeadlessNavigation
  }
}
