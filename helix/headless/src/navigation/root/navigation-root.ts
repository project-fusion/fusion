import { customElement, HelixElement, IndicatorController } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A set of destinations, with a marker on the current one.
 *
 * @description
 * Renders a real `<nav>`, which is the landmark a screen-reader user jumps to.
 * It exists as its own component rather than as a region of `AppHeader` because
 * a header is not inherently navigation, and navigation is not only ever in a
 * header: a footer and a sidebar hold the same thing.
 *
 * **It renders no links.** The consumer brings them, marked with
 * `aria-current="page"` and styled by the `data-navigation-item` recipe, for the same
 * reason nothing else here renders an anchor: a router renders its own, and
 * cannot render it inside this shadow root.
 *
 * What this owns is the marker that travels between them, and that is the whole
 * reason it is a component. A marker that moves needs something that knows
 * where every item is, and reading `aria-current` is how it knows which: the
 * thing that makes the page announce correctly is the same thing that puts the
 * marker in the right place.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Nav, NavList, Tabs
 * @documentation https://fusion.dev/helix/components/navigation
 *
 * @slot - The destinations, as the consumer's own links.
 *
 * @csspart indicator - The marker that travels to the current destination.
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
   * Accessible name for the landmark.
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
     * layer selects `helix-navigation a`, so the styling is true the moment the
     * markup is parsed, on the server and on the client. */
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
