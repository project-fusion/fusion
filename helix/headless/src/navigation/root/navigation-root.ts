import { customElement, HelixElement, IndicatorController } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
 * places the marker.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Nav, NavList, Tabs
 * @documentation https://fusion.dev/helix/components/navigation
 *
 * @slot - The destinations, as your own links.
 *
 * @csspart indicator - The marker that moves to the current destination.
 * @csspart nav - The navigation landmark.
 */
@customElement('helix-headless-navigation')
export class HelixHeadlessNavigation extends HelixElement {
  /* The controller carries the RTL sign and border correction: a distance
     measured from the physical left and applied from the inline-start edge
     travels the wrong way in a right-to-left document. */
  private readonly indicator = new IndicatorController(this, {
    active: () => this.items.find((item) => item.getAttribute('aria-current') === 'page'),
    indicator: () => this.partNamed('indicator'),
    observe: () => this.items,
    surface: () => this.partNamed('nav'),
  })

  /**
   * The landmark's name, read by screen readers.
   */
  @property()
  label = 'Main'

  private current: MutationObserver | undefined

  /** The destinations the consumer slotted. */
  private get items(): HTMLElement[] {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot')
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
      <div part="indicator" aria-hidden="true"></div>
      <slot @slotchange=${() => this.watch()}></slot>
    </nav>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-navigation': HelixHeadlessNavigation
  }
}
