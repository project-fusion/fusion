import { customElement, HelixElement, IndicatorController } from '@helix-io/core'
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
 * @status experimental
 * @category navigation
 * @aliases Nav, NavList, Tabs
 * @documentation https://helix.fusion.dev/components/navigation
 *
 * @slot - The destinations, as the consumer's own links.
 *
 * @csspart indicator - The marker that travels to the current destination.
 * @csspart nav - The navigation landmark.
 */
@customElement('helix-headless-navigation')
export class HelixHeadlessNavigation extends HelixElement {
  /* The mark, and the RTL sign and border correction that came with it. This
     was hand-written and had neither: the distance was measured from the
     physical left and applied from the inline-start edge, so it traveled the
     wrong way in a right-to-left document. */
  private readonly indicator = new IndicatorController(this, {
    active: () => this.items.find((item) => item.getAttribute('aria-current') === 'page'),
    indicator: () => this.renderRoot?.querySelector<HTMLElement>('[part="indicator"]'),
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="nav"]'),
  })

  /**
   * Accessible name for the landmark.
   */
  @property()
  label = 'Main'

  private observer: ResizeObserver | undefined
  private current: MutationObserver | undefined

  /** The destinations the consumer slotted. */
  private get items(): HTMLElement[] {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot')
    return (slot?.assignedElements() ?? []) as HTMLElement[]
  }

  /** Re-measures when the links change, move, or hand over the current page. */
  private watch(): void {
    this.observer?.disconnect()
    this.current?.disconnect()

    /* Nothing is written onto the items any more.
     *
     * `data-navigation-item` used to be put here, because the base layer styled a
     * destination with it and forgetting it was silent and total: the links
     * kept working and came out as bare underlined anchors. Writing it fixed
     * that and bought two problems. It happened after upgrade, so a
     * server-rendered nav arrived unstyled and restyled itself a frame later;
     * and a React consumer who wrote the attribute themselves got
     * `data-navigation-item="true"` from JSX, which this then had to be careful not to
     * overwrite or hydration reported a mismatch.
     *
     * The base layer selects `helix-navigation a` as well now, so the styling is
     * true the moment the markup is parsed, on the server and on the client,
     * and there is nothing to write or to be careful about. */
    this.indicator.place()

    this.observer = new ResizeObserver(() => this.indicator.place())
    this.observer.observe(this)
    for (const item of this.items) {
      this.observer.observe(item)
    }

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
   * render and there is nothing to watch yet. `check:observers` holds it. */
  override connectedCallback(): void {
    super.connectedCallback()
    if (this.hasUpdated) {
      this.watch()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer?.disconnect()
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
