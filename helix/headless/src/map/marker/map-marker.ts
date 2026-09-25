import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A place on a map, named and reachable from the keyboard.
 *
 * @description
 * **A place the map knows by its coordinates and a reader knows by its name.**
 * The renderer knows where `lat` and `lng` fall on the screen and the frame
 * does not, so the connector in `@fusion.dev/helix-map` writes where this
 * stands, as `--_map-marker-x` and `--_map-marker-y` on the host, every time the
 * view moves. What this draws is Helix's own: a point and the name beside it,
 * in the page's theme, rather than the renderer's marker.
 *
 * **A button, because pressing it does something.** The frame sends
 * `helix-activate` with its `name`, and a page answers it: a panel of details,
 * a route to it, a selection. The name is the button's own words, so a screen
 * reader says the place and not "marker".
 *
 * **One tab stop for every marker on the map**, which the frame moves: Tab
 * reaches the one a reader was last on, and the arrow keys walk the rest in the
 * order they are written. The order is the page's, since only the page knows
 * whether the depot comes before the stops.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map pin, Place, Point of interest
 * @documentation https://fusion.dev/helix/components/map
 *
 * @csspart label - The place's name, beside the point.
 * @csspart marker - The button a reader presses, holding the point and the name.
 * @csspart point - The dot that stands on the place.
 *
 * @cssstate current - While this is the marker the map's tab stop is on.
 * @cssstate start - While the name sits before the point in reading order, turned there by the connector because the other side of the view had no room for it.
 */
@customElement('helix-headless-map-marker')
export class HelixHeadlessMapMarker extends HelixElement {
  /**
   * @internal Whether the map's one tab stop is on this marker, written by the
   * frame. Not a consumer's to set: the frame keeps exactly one.
   */
  @state()
  current = false

  /**
   * Marks this as a map marker for the frame and the connector, which find
   * their markers among the frame's children by this rather than by tag, so a
   * styled marker and a headless one are the same thing to them.
   */
  readonly isMapMarker = true

  /** What the place is called, which is what a reader hears and sees. */
  @property({ reflect: true })
  label?: string

  /**
   * How far north, in degrees. Reflected, as `lng` is, so the connector hears
   * a place move whether a page set the attribute or the property; a marker
   * with neither is not placed.
   */
  @property({ reflect: true, type: Number })
  lat?: number

  /** How far east, in degrees. */
  @property({ reflect: true, type: Number })
  lng?: number

  /**
   * @internal Which side of the point the name sits on, in reading order,
   * written by the connector from the room either side of the place. After
   * the point unless the view's edge would cut the name off there.
   */
  @state()
  side: 'end' | 'start' = 'end'

  /**
   * What `helix-activate` reports when this is pressed. Its `label` where it
   * has none, which is enough until two places share a name.
   */
  @property()
  name = ''

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('current', this.current)
    this.toggleState('start', this.side === 'start')
  }

  /**
   * How far the marker reaches from its point along the line, name included,
   * in CSS pixels: the button's width, which is laid out even while its name is
   * faded, so the connector can ask before the name is ever shown.
   */
  extent(): number {
    return this.partNamed('marker')?.getBoundingClientRect().width ?? 0
  }

  /** Focuses the button rather than the host, which draws no box of its own. */
  override focus(options?: FocusOptions): void {
    this.partNamed('marker')?.focus(options)
  }

  protected override render(): TemplateResult {
    /* The name is the button's content rather than an `aria-label` over it:
       one set of words, read and seen, and a stylesheet that hides the label
       until the marker is pointed at must hide it by opacity for that reason. */
    return html`<span part="marker" role="button" tabindex=${this.current ? '0' : '-1'}>
      <span part="point" aria-hidden="true"></span>
      <span part="label">${this.label ?? ''}</span>
    </span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map-marker': HelixHeadlessMapMarker
  }
}
