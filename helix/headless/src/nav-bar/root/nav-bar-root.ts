import { customElement, HelixElement } from '@helix-io/core'
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
 * `aria-current="page"` and styled by the `data-nav-item` recipe, for the same
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
 * @aliases Nav, NavList, Tabs
 * @documentation https://helix.fusion.dev/components/nav-bar
 *
 * @slot - The destinations, as the consumer's own links.
 *
 * @csspart nav - The navigation landmark.
 * @csspart indicator - The marker that travels to the current destination.
 */
@customElement('helix-base-nav-bar')
export class HelixBaseNavBar extends HelixElement {
  /** Accessible name for the landmark. */
  @property()
  label = 'Main'

  private observer: ResizeObserver | undefined
  private current: MutationObserver | undefined

  /** The destinations the consumer slotted. */
  private get items(): HTMLElement[] {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot')
    return (slot?.assignedElements() ?? []) as HTMLElement[]
  }

  /**
   * Moves the marker to whichever destination is current.
   *
   * Geometry goes onto the marker inside the shadow root. On the host it would
   * be an inline style the element gives itself after upgrading, which a
   * React consumer's server markup never has.
   */
  private place(): void {
    const marker = this.renderRoot.querySelector<HTMLElement>('[part="indicator"]')
    const nav = this.renderRoot.querySelector<HTMLElement>('[part="nav"]')
    if (!marker || !nav) {
      return
    }

    const active = this.items.find((item) => item.getAttribute('aria-current') === 'page')
    if (!active) {
      marker.removeAttribute('data-placed')
      return
    }

    const box = active.getBoundingClientRect()
    if (box.width === 0) {
      return
    }
    const own = nav.getBoundingClientRect()
    marker.style.setProperty('--_nav-indicator-x', `${box.left - own.left}px`)
    marker.style.setProperty('--_nav-indicator-w', `${box.width}px`)
    marker.style.setProperty('--_nav-indicator-h', `${box.height}px`)
    marker.toggleAttribute('data-placed', true)
  }

  /** Re-measures when the links change, move, or hand over the current page. */
  private watch(): void {
    this.observer?.disconnect()
    this.current?.disconnect()

    /* The recipe goes on, rather than being asked for.
     *
     * `data-nav-item` is what the base layer styles a destination with, and it
     * was the consumer's to remember. Forgetting it is silent and total: the
     * links keep working and come out as bare underlined anchors, and the
     * marker measures boxes that were never laid out as items. Measured on the
     * app header's own example, which forgot it, the links rendered at fifteen
     * pixels in link blue as `display: block`.
     *
     * These are already this component's items. It reads them, observes them,
     * and measures them for the marker, so marking them is the same claim made
     * once more rather than a new one. Written rather than reflected, and
     * client-side, so a server-rendered nav is unstyled for the moment before
     * upgrade unless the consumer wrote it too, which stays worth doing.
     *
     * Only where it is absent, and that is not tidiness. A consumer writing it
     * in JSX writes `data-nav-item`, which is `={true}`, which React serves as
     * `data-nav-item="true"`. Setting it to `""` here changes an attribute
     * React put there, and where the element upgrades before hydration React
     * finds the DOM disagreeing with what it sent and reports a mismatch.
     * Leaving a value alone costs nothing: the recipe selects on the
     * attribute being there and never on what it says. */
    for (const item of this.items) {
      if (!item.hasAttribute('data-nav-item')) {
        item.setAttribute('data-nav-item', '')
      }
    }
    this.place()

    this.observer = new ResizeObserver(() => this.place())
    this.observer.observe(this)
    for (const item of this.items) {
      this.observer.observe(item)
    }

    // Client-side routing changes `aria-current` in place rather than
    // reloading, so nothing else would tell the marker to move.
    this.current = new MutationObserver(() => this.place())
    for (const item of this.items) {
      this.current.observe(item, { attributeFilter: ['aria-current'] })
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
    'helix-base-nav-bar': HelixBaseNavBar
  }
}
