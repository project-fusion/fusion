import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** What the frame and the connector write on a marker, which is not news to either. */
const BOOKKEEPING = new Set<PropertyKey>(['current', 'fanned', 'gathered', 'gatheredBy', 'side'])

/**
 * @summary A named place on a map.
 *
 * @description
 * A button placed at a latitude and longitude. `connectMap` positions it on
 * the map and moves it as the map moves. Its name shows beside it on hover
 * and focus.
 *
 * Pressing a marker sends `helix-activate` from the frame with the marker's
 * `name`, or its `label` if it has no name.
 *
 * All the markers in a map share one tab stop. The arrow keys move between
 * them in the order they are written.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map pin, Place, Point of interest
 * @documentation https://fusion.dev/helix/components/map
 *
 * @slot icon - A letter, number, or icon shown in the point, such as a stop's order. Screen readers read the marker's label only.
 *
 * @event {HelixMapClusterEvent} helix-map-cluster - This marker shows a cluster and was pressed. `connectMap` zooms in to its places.
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The marker moved or was renamed. Used by `connectMap`; pages do not need to listen for it.
 *
 * @csspart label - The place's name, next to the point.
 * @csspart marker - The button, holding the point and the name.
 * @csspart point - The dot on the place, holding the icon if there is one.
 *
 * @cssstate cluster - Shows several markers as one count.
 * @cssstate clustered - Hidden inside another marker's cluster.
 * @cssstate current - Holds the map's tab stop.
 * @cssstate fanned - Spread out from a location it shares with other markers, after their cluster was pressed.
 * @cssstate icon - Has content in the icon slot.
 * @cssstate passed - Marked as passed.
 * @cssstate start - Shows its name before the point, because there was no room after it.
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
   * Marks the element as a map marker. The frame and the connector find
   * markers among the frame's children by this flag, so they treat a styled
   * marker and a headless one the same way.
   */
  readonly isMapMarker = true

  /** The place's name. Shown next to the marker and read by screen readers. */
  @property()
  label?: string

  /** Latitude, in degrees. A marker without both `lat` and `lng` is not shown. */
  @property({ type: Number })
  lat?: number

  /** Longitude, in degrees. */
  @property({ type: Number })
  lng?: number

  /**
   * @internal Which side of the point the name sits on, in reading order,
   * written by the connector from the room either side of the place. After
   * the point unless the view's edge would cut the name off there.
   */
  @state()
  side: 'end' | 'start' = 'end'

  /** The value `helix-activate` reports. Defaults to the label. */
  @property()
  name = ''

  /**
   * Marks the place as passed, such as a stop already visited. The marker is
   * drawn muted, and its name is followed by `passed-label`.
   */
  @property({ type: Boolean })
  passed = false

  /** The word added after a passed place's name. Defaults to "passed". */
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

  /** Focuses the marker's button. The host draws no box of its own. */
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
