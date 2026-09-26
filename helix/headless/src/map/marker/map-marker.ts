import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** What the frame and the connector write on a marker, which is not news to either. */
const BOOKKEEPING = new Set<PropertyKey>(['current', 'fanned', 'gathered', 'gatheredBy', 'side'])

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
 * @slot icon - What the point holds: a letter, a number or an icon, such as the order of a stop. Seen, not read: the marker's name is its label.
 *
 * @event {HelixMapClusterEvent} helix-map-cluster - A reader pressed this while it stood for several places, which the connector answers by zooming in to its places.
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The place moved or was renamed, which the connector follows. Not news for a page.
 *
 * @csspart label - The place's name, beside the point.
 * @csspart marker - The button a reader presses, holding the point and the name.
 * @csspart point - The dot that stands on the place, and holds its `icon` where it has one.
 *
 * @cssstate cluster - While this stands for several places the frame gathered, drawn as their count and named by their names.
 * @cssstate clustered - While another marker stands for this one, which is hidden until the view has room for it.
 * @cssstate current - While this is the marker the map's tab stop is on.
 * @cssstate fanned - While this stands fanned out from a spot it shares with other places, a leg back to it, after its cluster was pressed.
 * @cssstate icon - While something is slotted into the point, which the point grows to hold.
 * @cssstate passed - While the page says something traveling the map has passed this place, which the styled tier mutes.
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
   * @internal The names of the places this stands for, its own first, written
   * by the connector while it gathers markers that would draw over each other.
   * Empty while it stands only for itself.
   */
  @state()
  gathered: string[] = []

  /**
   * @internal Whether this stands fanned out from a spot it shares with
   * other places, written by the connector when their cluster is pressed and
   * no zoom would draw them apart.
   */
  @state()
  fanned = false

  /**
   * @internal The marker standing for this one while they are gathered,
   * written by the connector. This one is hidden meanwhile, and the frame's
   * walk and tab stop go to the one standing for it.
   */
  @state()
  gatheredBy: HelixHeadlessMapMarker | undefined = undefined

  /**
   * Marks this as a map marker for the frame and the connector, which find
   * their markers among the frame's children by this rather than by tag, so a
   * styled marker and a headless one are the same thing to them.
   */
  readonly isMapMarker = true

  /** What the place is called, which is what a reader hears and sees. */
  @property()
  label?: string

  /**
   * How far north, in degrees. A marker without both this and `lng` is not
   * placed.
   */
  @property({ type: Number })
  lat?: number

  /** How far east, in degrees. */
  @property({ type: Number })
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

  /**
   * Whether something traveling the map has already passed this place, which
   * the page says: a stop behind a walker or a delivery made. Drawn quieter,
   * as the part of a route behind is, and said after the name, so a reader
   * walking the places hears which are done.
   */
  @property({ type: Boolean })
  passed = false

  /** What is said after a passed place's name. */
  @property({ attribute: 'passed-label' })
  passedLabel = 'passed'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('cluster', this.gathered.length > 1)
    this.toggleState('clustered', this.gatheredBy !== undefined)
    this.toggleState('current', this.current)
    this.toggleState('fanned', this.fanned)
    this.toggleState('passed', this.passed)
    this.toggleState('start', this.side === 'start')
    if (this.childrenKnown) {
      this.toggleState(
        'icon',
        this.knownChildren.some((child) => child.slot === 'icon'),
      )
    }
  }

  /**
   * Tells the connector the place moved or was renamed, which moves the point
   * or changes how far the name reaches, and the frame that it was gathered
   * or let go, which moves its tab stop. Not for the rest of the frame's own
   * bookkeeping, `current` and `side`, which the frame and the connector wrote.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const keys = [...changed.keys()]
    if (keys.some((key) => key === 'gathered' || key === 'gatheredBy')) {
      this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'cluster' }))
    }
    if (keys.some((key) => !BOOKKEEPING.has(key))) {
      this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'place' }))
    }
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
       until the marker is pointed at must hide it by opacity for that reason.
       **A cluster is its count and its places' names**, the names in the
       page's own language's list, and a marker another stands for is out of
       the tree until the view has room for it again. */
    const cluster = this.gathered.length > 1
    /* Asked only of a cluster, which only the connector makes in a browser:
       the server has no tree to find a language in. */
    const lang = cluster ? this.closest('[lang]')?.getAttribute('lang') || undefined : undefined
    return html`<span part="marker" role="button" tabindex=${this.current ? '0' : '-1'} ?hidden=${this.gatheredBy !== undefined}>
      <span part="point" aria-hidden="true">${cluster ? new Intl.NumberFormat(lang).format(this.gathered.length) : nothing}<slot name="icon" ?hidden=${cluster} @slotchange=${() => this.requestUpdate()}></slot></span>
      <span part="label">${cluster ? new Intl.ListFormat(lang, { type: 'conjunction' }).format(this.gathered) : this.passed ? `${this.label ?? ''}, ${this.passedLabel}` : (this.label ?? '')}</span>
    </span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map-marker': HelixHeadlessMapMarker
  }
}
