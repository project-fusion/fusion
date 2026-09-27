import {
  customElement,
  HelixActivateEvent,
  HelixElement,
  HelixMapClusterEvent,
  HelixMapPartChangeEvent,
  isRtl,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'

/** A place in a points layer, written as an object with coordinates and an optional name. */
export interface MapPointsPlace {
  /** What pressing it reports, where it is not its label. */
  id?: string | number | undefined
  /** Its name. */
  label?: string | undefined
  lat: number
  lng: number
}

/**
 * A point or a count the renderer drew in view, as the connector found it and
 * stood it on the screen, in pixels from the map's top left.
 */
export interface MapPointsInView {
  /** How many places it stands for, where it is a count. */
  count?: number | undefined
  /** Which it is, as the connector keys it: the same point or count keeps it while it stays in view. */
  key: string
  /** Its name, where it is a point that has one. */
  label?: string | undefined
  /** What pressing it reports, where it is a point. */
  value?: string | undefined
  x: number
  y: number
}

/** A GeoJSON collection of points, longitude first as GeoJSON writes it. */
export interface MapPointsCollection {
  features: {
    geometry: { coordinates: number[]; type: string } | null
    id?: string | number | undefined
    properties?: Record<string, unknown> | null
    type: 'Feature'
  }[]
  type: 'FeatureCollection'
}

/**
 * @summary Thousands of places on a map, loaded from data.
 *
 * @description
 * Use a points layer for more places than markers can handle, such as every
 * café in a city. `connectMap` draws the points as one layer of the map. Set
 * `src` to a GeoJSON file, or set `data` to a GeoJSON collection or a list of
 * places. With `cluster`, nearby points combine into counts.
 *
 * Pressing a point sends `helix-activate` from this element with the point's
 * id, or its name if it has no id. Each point is named by its `name`
 * property, or by the property set in `name-key`.
 *
 * The points and counts in view share one tab stop. The arrow keys, Home, and
 * End move between them from top to bottom and along each line. Enter on a
 * count zooms in to it.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Data layer, GeoJSON layer, Point cloud, Point layer
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixActivateEvent} helix-activate - A point in view was pressed. The value is its id, or its name if it has no id.
 * @event {HelixMapClusterEvent} helix-map-cluster - A count in view was pressed from the keyboard. `connectMap` zooms in to it.
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The points, name, or color changed. Used by `connectMap`; pages do not need to listen for it.
 *
 * @csspart count - The button on a count, which is also a `place`.
 * @csspart label - The name of the focused point or count.
 * @csspart place - The button on a point or count in view.
 * @csspart places - The group of buttons, named by the layer's label.
 */
@customElement('helix-headless-map-points')
export class HelixHeadlessMapPoints extends HelixElement {
  /** Combines nearby points into counts. Pressing a count zooms in to it. */
  @property({ type: Boolean })
  cluster = false

  /**
   * The name read for a count. `{count}` is replaced by the number of places.
   * Defaults to "{count} places".
   */
  @property({ attribute: 'count-label' })
  countLabel = '{count} places'

  /**
   * The points, as a GeoJSON collection or a list of `{ lat, lng, label, id }`
   * places.
   */
  @property({ attribute: false })
  data?: MapPointsCollection | readonly MapPointsPlace[]

  /**
   * More about the points, such as how many there are. Read after the label in
   * the frame's list.
   */
  @property()
  description?: string

  /**
   * A name this layer shares with other layers, such as a route and its
   * dotted legs. The layers menu shows layers in the same group as one entry,
   * named by the first of them, and its checkbox shows or hides them all.
   */
  @property()
  group?: string

  /** Marks this as a layer for the frame and the connector, whatever its tag. */
  readonly isMapLayer = true

  /** The layer's name, used in the frame's list. */
  @property()
  label?: string

  /** @internal Which kind of layer, which is how the connector draws it. */
  readonly layerKind = 'points' as const

  /** The GeoJSON property each point is named by. Defaults to `name`. */
  @property({ attribute: 'name-key' })
  nameKey = 'name'

  /** A GeoJSON file of points to load. Ignored when `data` is set. */
  @property()
  src?: string

  /**
   * @internal The points and counts in view, in reading order and stood on
   * the screen, written by the connector as the view moves and settles.
   */
  @state()
  walk: MapPointsInView[] = []

  /** The one the layer's tab stop is on, by its key: the first until a reader moves it. */
  @state()
  private stop: string | undefined

  /** Where focus was when the walk changed, so it can go to what stands nearest there. */
  private held: MapPointsInView | undefined

  /** What a point or a count in view is called. */
  private nameOf(one: MapPointsInView): string {
    if (one.count !== undefined) {
      const lang = this.closest('[lang]')?.getAttribute('lang') || undefined
      return this.countLabel.replace('{count}', new Intl.NumberFormat(lang).format(one.count))
    }
    return one.label || one.value || ''
  }

  /** The button standing on one, where it is drawn. */
  private buttonOf(key: string | undefined): HTMLElement | null {
    return key === undefined
      ? null
      : (this.renderRoot.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) ?? null)
  }

  /** Moves the tab stop and the focus to one. */
  private reach(one: MapPointsInView | undefined): void {
    if (!one) {
      return
    }
    this.stop = one.key
    void this.updateComplete.then(() => this.buttonOf(one.key)?.focus())
  }

  /** Presses one: a point is the page's, a count the connector's to zoom in to. */
  private press(one: MapPointsInView): void {
    if (one.count !== undefined) {
      this.dispatchEvent(new HelixMapClusterEvent({ key: one.key, labels: [] }))
    } else {
      this.dispatchEvent(new HelixActivateEvent({ value: one.value || one.label || '' }))
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const key = (event.composedPath()[0] as HTMLElement | undefined)?.dataset?.key
    const at = this.walk.findIndex((one) => one.key === key)
    const here = this.walk[at]
    if (!here) {
      return
    }
    /* Along the reading order either way: down and the way text runs are on,
       up and back are back, which a right-to-left page reverses along the line. */
    const forward = isRtl(this) ? 'ArrowLeft' : 'ArrowRight'
    const back = isRtl(this) ? 'ArrowRight' : 'ArrowLeft'
    const last = this.walk.length - 1
    const to =
      event.key === forward || event.key === 'ArrowDown'
        ? Math.min(at + 1, last)
        : event.key === back || event.key === 'ArrowUp'
          ? Math.max(at - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined
    if (to !== undefined) {
      event.preventDefault()
      this.reach(this.walk[to])
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (event.key === 'Enter' && !event.repeat) {
        this.press(here)
      }
    }
  }

  private readonly handleKeyup = (event: KeyboardEvent): void => {
    const key = (event.composedPath()[0] as HTMLElement | undefined)?.dataset?.key
    const here = this.walk.find((one) => one.key === key)
    if (here && event.key === ' ') {
      event.preventDefault()
      this.press(here)
    }
  }

  private readonly handleFocusin = (event: FocusEvent): void => {
    const key = (event.composedPath()[0] as HTMLElement | undefined)?.dataset?.key
    if (key !== undefined) {
      this.stop = key
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Where focus is when the walk moves: kept by the button while its point
       stays in view, and handed to the nearest where it went, which is what
       a count zoomed in to does to itself. */
    if (changed.has('walk')) {
      const key = (this.shadowRoot?.activeElement as HTMLElement | null)?.dataset?.key
      const was = (changed.get('walk') as MapPointsInView[] | undefined) ?? []
      this.held = was.find((one) => one.key === key)
    }
  }

  /**
   * Tells the frame and the connector the points changed, were renamed or were
   * retoned; not the walk, which the connector wrote, nor where it stands.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const held = this.held
    this.held = undefined
    if (held && !this.walk.some((one) => one.key === held.key)) {
      const nearest = [...this.walk].sort(
        (a, b) => Math.hypot(a.x - held.x, a.y - held.y) - Math.hypot(b.x - held.x, b.y - held.y),
      )[0]
      this.reach(nearest)
    }
    if ([...changed.keys()].some((key) => key !== 'walk' && key !== 'stop')) {
      this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'layer' }))
    }
  }

  protected override render(): TemplateResult | typeof nothing {
    if (this.walk.length === 0) {
      return nothing
    }
    const stop = this.walk.some((one) => one.key === this.stop) ? this.stop : this.walk[0]?.key
    return html`<span part="places" role="group" aria-label=${this.label ?? ''} @focusin=${this.handleFocusin} @keydown=${this.handleKeydown} @keyup=${this.handleKeyup}>${repeat(
      this.walk,
      (one) => one.key,
      (one) => {
        const tabindex = one.key === stop ? '0' : '-1'
        const at = `--_map-place-x: ${one.x}px; --_map-place-y: ${one.y}px`
        const name = html`<span part="label">${this.nameOf(one)}</span>`
        return one.count === undefined
          ? html`<span part="place" role="button" data-key=${one.key} tabindex=${tabindex} style=${at}>${name}</span>`
          : html`<span part="place count" role="button" data-key=${one.key} tabindex=${tabindex} style=${at}>${name}</span>`
      },
    )}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map-points': HelixHeadlessMapPoints
  }
}
