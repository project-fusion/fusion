import {
  customElement,
  fillTemplate,
  focusItemOf,
  formatNumbers,
  HelixActivateEvent,
  HelixBeforeChangeEvent,
  HelixBeforeToggleEvent,
  HelixElement,
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapReadyEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
  HelixToggleEvent,
  hostAria,
  KeyboardNavigationController,
  MixinViewport,
  requestChange,
  type ViewportControlsPlacement,
  type ViewportGestureLabels,
  type ViewportPanDetail,
  type ViewportZoomDetail,
} from '@fusion.dev/helix-core'
import {
  buildings,
  cloudRain,
  dotsNine,
  type HelixIcon,
  leaf,
  mountains,
  path,
  polygon,
  stack,
  target,
} from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import type { HelixHeadlessMapMarker } from '../marker/map-marker.js'

/** What the frame reads off a layer, which is all its list and menu need. */
interface MapLayer extends Element {
  description?: string | undefined
  /** A raster layer's: whether it is imagery of the ground. */
  ground?: boolean | undefined
  group?: string | undefined
  hidden: boolean
  isMapLayer: true
  label?: string | undefined
  /** Which kind of layer, which picks its picture in the layers menu. */
  layerKind?: string | undefined
}

/**
 * What `ViewportControlsPlacement` is called for a map.
 *
 * The corners are the surface's and the name is the family's, so a consumer who
 * imported this before the surface was shared still has it.
 */
export type MapControlsPlacement = ViewportControlsPlacement

/** How the map draws the ground: the themed map, imagery under its roads and names, or imagery alone. */
export type MapType = 'hybrid' | 'satellite' | 'standard'

/** The map types, in the order the menu offers them. */
const MAP_TYPES: readonly MapType[] = ['standard', 'hybrid', 'satellite']

/**
 * A layer's picture in the layers menu, by what it draws: a path for a route,
 * a shape for an area, dots for points, buildings, mountains for terrain,
 * rings for contour lines, a leaf for land cover, and a rain cloud for tiles
 * over the map, such as weather. Imagery of the ground
 * is a map type, with a card of its own.
 */
const iconOf = (layer: MapLayer | undefined): HelixIcon => {
  switch (layer?.layerKind) {
    case 'route':
      return path
    case 'area':
      return polygon
    case 'points':
      return dotsNine
    case 'buildings':
      return buildings
    case 'terrain':
      return mountains
    case 'contours':
      return target
    case 'landcover':
      return leaf
    case 'raster':
      return cloudRain
    default:
      return stack
  }
}

/** Degrees a rotate button or key turns the map. */
const ROTATE_STEP = 15

/** Degrees a tilt key tilts the map. */
const TILT_STEP = 10

/** The tilt the 3D button goes to, in degrees from looking straight down. */
const TILTED = 50

/** Whether a marker has a place to stand, which the connector needs to show it. */
const placed = (marker: HelixHeadlessMapMarker): boolean =>
  Number.isFinite(marker.lat) && Number.isFinite(marker.lng)

/**
 * How long after a reader asks that the view moving still counts as the
 * answer, in milliseconds. Longer than the slowest trip the connector animates.
 */
const ASK_LAPSES = 3000

/** How long the view must be still before what it did is said, in milliseconds. */
const SETTLES = 400

/**
 * @summary A frame around a map drawn by another library.
 *
 * @description
 * Wraps a map drawn by MapLibre, Leaflet, or another renderer. The frame adds
 * a name for the map, a column of controls, and a strip for the map credit.
 * Helix does not draw the map itself.
 *
 * The controls are one column, and `controls` names which ones: `fullscreen`,
 * `layers`, `tilt`, `zoom`, and `compass`, top to bottom. `zoom compass
 * fullscreen` by default. The compass's needle points north as the map turns,
 * and pressing it turns the map to face north.
 *
 * Add `pan` and `rotate` for buttons around the compass that move and turn the
 * map. Dragging is otherwise the only way a pointer moves the map, so add them
 * where the map has to be usable without dragging, as WCAG 2.2 asks at level
 * AA. The arrow keys pan the map and Shift with Left or Right turns it either
 * way.
 *
 * The pan and zoom buttons and the arrow keys send `helix-map-pan` and
 * `helix-map-zoom`. Move your map in response, or connect it with
 * `connectMap` from `@fusion.dev/helix-map`, which does this for you.
 *
 * Add `tilt` to `controls` for the 3D button, which a map with 3D buildings
 * or terrain needs. It is a toggle. Pressed, it tilts the map 50 degrees, and
 * `connectMap` raises the buildings and the ground. Pressed again, it makes the
 * map flat, and lays them flat too. Shift with Up or Down tilts the map in
 * steps. Turning and tilting send `helix-map-rotate` and `helix-map-tilt`,
 * which `connectMap` answers on MapLibre. Leaflet draws maps flat and does not
 * rotate.
 *
 * Add `layers` to `controls` for a layers button. It opens a menu with a tile
 * for each layer, which sets the layer's `hidden` attribute. Layers with the
 * same `group`, such as a route and its dotted legs, share one tile. A tile
 * sends `helix-before-toggle` from the layer first, so you can store the
 * choice or refuse it, and `helix-toggle` from it once `hidden` holds the
 * choice.
 *
 * Imagery, a `helix-map-raster` with `ground`, is a map type and not a tile.
 * The menu opens with a card for each type, Standard, Hybrid, and Satellite,
 * with a picture of the map in it, and `map-type` says which is chosen.
 * Standard hides the imagery, Hybrid draws it under the roads and names, and
 * Satellite draws it alone. Choosing one sends `helix-before-change` with its
 * name, and `change` once `map-type` holds it. `connectMap` does not draw a
 * hidden layer, so a layer you write with `hidden` starts turned off.
 *
 * Markers, routes, areas, live positions, and points layers go inside the
 * frame as child elements.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases Map frame, Map container, Geo
 * @documentation https://fusion.dev/helix/components/map
 *
 * @slot - The element your renderer draws the map in, and the map's markers, routes, areas, positions, and points layers.
 * @slot attribution - The map credit, which most tile licenses require.
 * @slot footer - Content below the map, such as a legend or a scale.
 * @slot header - Content above the map, such as a title or a search field.
 *
 * @event {Event} change - The layers menu changed the map type, which `map-type` now holds.
 * @event {HelixActivateEvent} helix-activate - A marker was pressed. The value is the marker's `name`, or its `label` if it has no name. A cluster sends `helix-map-cluster` instead.
 * @event {HelixBeforeChangeEvent} helix-before-change - A map type was chosen in the layers menu, with its name: `standard`, `hybrid`, or `satellite`. Cancelable: cancel it to keep the current type.
 * @event {HelixBeforeToggleEvent} helix-before-toggle - A layer's tile in the layers menu was pressed. Sent from the layer, with `checked` true when it is to be shown. Cancelable: cancel it to keep the layer as it is.
 * @event {HelixMapClusterEvent} helix-map-cluster - A cluster was pressed. Sent from the marker that shows the cluster, with the names of its places.
 * @event {HelixMapPanEvent} helix-map-pan - A pan button or arrow key was pressed. Move your map in response.
 * @event {HelixMapPartChangeEvent} helix-map-part-change - Clustering was turned on or off. Used by `connectMap`; pages do not need to listen for it.
 * @event {HelixMapReadyEvent} helix-map-ready - The map has been drawn whole: its style, every tile the view needs, and the ground where it has terrain. Sent once per connection. Show a map that is finished on it, where it would otherwise draw in stages.
 * @event {HelixMapRotateEvent} helix-map-rotate - A rotate or Face north button, or Shift with Left or Right, was pressed. Turn your map in response.
 * @event {HelixMapTiltEvent} helix-map-tilt - The 3D button, or Shift with Up or Down, was pressed. Tilt your map in response.
 * @event {HelixMapZoomEvent} helix-map-zoom - A zoom button or key was pressed, with a direction. Zoom your map in response.
 * @event {HelixToggleEvent} helix-toggle - A layer's tile in the layers menu showed or hid it. Sent from the layer once its `hidden` attribute holds the choice, with `checked` true when it is shown.
 *
 * @csspart attribution - The strip under the map that holds the credit.
 * @csspart compass - The compass and the pan and rotate buttons around it.
 * @csspart controls - The column of buttons that move the map.
 * @csspart face-north - The compass: its needle points north as the map turns, and pressing it turns the map to face north.
 * @csspart footer - The strip below the map.
 * @csspart fullscreen - The button that makes the map fill the screen.
 * @csspart gesture-hint - Words over the map for a moment when it lets a gesture pass to the page, such as how to zoom it.
 * @csspart gesture-status - The line shown while a map with `gestures="activate"` has the gestures.
 * @csspart header - The strip above the map.
 * @csspart layer - One entry in the list of the map's layers.
 * @csspart layer-choice - One layer's tile in the layers menu, pressed while the layer is shown.
 * @csspart layer-choices - The layer tiles in the layers menu, under the map types.
 * @csspart layer-icon - The picture on a layer's tile, drawn for its kind: a line for a route, a peak for terrain.
 * @csspart layer-name - The name on a layer's tile.
 * @csspart layers - The list of the map's shown layers, such as routes, areas, and points, read by screen readers.
 * @csspart layers-menu - The menu of the map's layers, which the layers button opens.
 * @csspart layers-toggle - The button that opens and closes the layers menu.
 * @csspart live - What screen readers hear after the map moves: the zoom level, the way it faces, its tilt, or the way it moved. Visually hidden in the styled tier.
 * @csspart map-type - One map type's card in the layers menu: a radio button, its picture, and its name.
 * @csspart map-type-name - The name on a map type's card.
 * @csspart map-type-preview - The picture of the map on a map type's card.
 * @csspart map-types - The map-type cards at the top of the layers menu, where the map has imagery.
 * @csspart needle - The compass needle, turned to point north.
 * @csspart pan-down - The button that pans the map down.
 * @csspart pan-end - The button that pans toward the end of a line of text: right in English.
 * @csspart pan-start - The button that pans toward the start of a line of text: left in English.
 * @csspart pan-up - The button that pans the map up.
 * @csspart region - The named region the map sits in.
 * @csspart rotate-left - The button that turns the map counterclockwise.
 * @csspart rotate-right - The button that turns the map clockwise.
 * @csspart tilt - The 3D button, which tilts the map and makes it flat again. Pressed while the map is tilted.
 * @csspart viewport - The box the map is drawn in.
 * @csspart zoom-in - The button that zooms in.
 * @csspart zoom-out - The button that zooms out.
 *
 * @cssproperty --map-needle-turn - How far the needle turns to point north, as an angle. The frame writes it from `bearing`.
 *
 * @cssstate fullscreen - The map fills the screen.
 * @cssstate idle - The user has been still long enough for the header and footer to fade.
 * @cssstate layers-open - The layers menu is open.
 * @cssstate ready - The map has been drawn whole, after `helix-map-ready`.
 * @cssstate rotated - The map is turned away from north, by `bearing`.
 * @cssstate sharing - The page keeps the plain wheel and one finger, with `gestures="cooperative"` or while a map with `gestures="activate"` waits to be pressed.
 * @cssstate tilted - The map is tilted by `pitch`, so it no longer looks straight down.
 * @cssstate using - A map with `gestures="activate"` has been pressed and has the gestures.
 */
@customElement('helix-headless-map')
export class HelixHeadlessMap extends MixinViewport(HelixElement) {
  /**
   * The map's rotation, in degrees clockwise from north. `connectMap` keeps it
   * current, and the Face north button's needle turns with it.
   */
  @property({ type: Number })
  bearing = 0

  /**
   * Combines markers that would overlap into one count. Counts split apart as
   * the map zooms in, and pressing one zooms in to its places.
   */
  @property({ type: Boolean })
  cluster = false

  /** The Face north button's label. */
  @property({ attribute: 'face-north-label' })
  faceNorthLabel = 'Face north'

  /** What screen readers hear when the map is tilted back to looking straight down. */
  @property({ attribute: 'flat-label' })
  flatLabel = 'Looking straight down'

  /** The Hybrid map type's name. */
  @property({ attribute: 'hybrid-label' })
  hybridLabel = 'Hybrid'

  /**
   * The map's name, read by screen readers. Name the place, such as "Delivery
   * area", so that several maps on one page can be told apart. Required.
   */
  @property()
  label = ''

  /**
   * The name of the layers button and menu, and of the list of the map's
   * layers, such as routes, areas, and points, read by screen readers.
   */
  @property({ attribute: 'layers-label' })
  layersLabel = 'Map layers'

  /**
   * @internal Pictures of the map in each map type, written by the connector
   * when the layers menu opens.
   */
  @state()
  mapPreviews: Partial<Record<MapType, string>> = {}

  /**
   * How the map draws the ground, where it has imagery: `hybrid` for imagery
   * under the roads and names, and `satellite` for imagery alone. Absent is
   * the standard, themed map. The layers menu chooses it.
   */
  @property({ attribute: 'map-type', reflect: true })
  mapType?: 'hybrid' | 'satellite' | undefined

  /** The name of the map types in the layers menu, read by screen readers. */
  @property({ attribute: 'map-type-label' })
  mapTypeLabel = 'Map type'

  /** What screen readers hear when the map has moved down. */
  @property({ attribute: 'moved-down-label' })
  movedDownLabel = 'Moved down'

  /** What screen readers hear when the map has moved left. */
  @property({ attribute: 'moved-left-label' })
  movedLeftLabel = 'Moved left'

  /** What screen readers hear when the map has moved right. */
  @property({ attribute: 'moved-right-label' })
  movedRightLabel = 'Moved right'

  /** What screen readers hear when the map has moved up. */
  @property({ attribute: 'moved-up-label' })
  movedUpLabel = 'Moved up'

  /** What screen readers hear when the map is turned back to face north. */
  @property({ attribute: 'north-label' })
  northLabel = 'Facing north'

  /**
   * How far the map is tilted, in degrees from looking straight down.
   * `connectMap` keeps it current, and the 3D button is pressed while it is
   * above `0`.
   */
  @property({ type: Number })
  pitch = 0

  /** The rotate left button's label. */
  @property({ attribute: 'rotate-left-label' })
  rotateLeftLabel = 'Rotate left'

  /** The rotate right button's label. */
  @property({ attribute: 'rotate-right-label' })
  rotateRightLabel = 'Rotate right'

  /** The Satellite map type's name. */
  @property({ attribute: 'satellite-label' })
  satelliteLabel = 'Satellite'

  /** The Standard map type's name. */
  @property({ attribute: 'standard-label' })
  standardLabel = 'Standard'

  /**
   * What screen readers hear when the map is tilted. `{degrees}` is the tilt
   * from looking straight down.
   */
  @property({ attribute: 'tilted-label' })
  tiltedLabel = 'Tilted {degrees} degrees'

  /** The 3D button's label. */
  @property({ attribute: 'tilt-label' })
  tiltLabel = 'Show in 3D'

  /**
   * What screen readers hear when the map is turned. `{degrees}` is the way the
   * top of the map faces, clockwise from north.
   */
  @property({ attribute: 'turned-label' })
  turnedLabel = 'Facing {degrees} degrees'

  /**
   * What screen readers hear after a zoom. `{level}` is the zoom level.
   */
  @property({ attribute: 'zoomed-label' })
  zoomedLabel = 'Zoom level {level}'

  /**
   * How far the map is zoomed, in its renderer's levels. `connectMap` keeps it
   * current, and the map says it after a zoom.
   */
  @property({ attribute: 'zoom-level', type: Number })
  zoomLevel?: number | undefined

  /** What the live region says now. */
  @state()
  private said = ''

  /** What a reader last asked of the map, until the map has answered it. */
  private asked:
    | { at: number; kind: 'north' | 'pan' | 'rotate' | 'tilt' | 'zoom'; side?: string }
    | undefined = undefined

  /** The wait for the view to settle before it is said. */
  private settling: ReturnType<typeof setTimeout> | undefined = undefined

  /**
   * Says the map has moved, where a reader asked it to.
   *
   * **Called by whatever moves the map**, as `connectMap` does on every frame
   * the view moves. The frame's keys and buttons only ask, and nothing moves
   * until something answers, so the frame says nothing until it is told the
   * view moved: an announcement for a move that never happened is worse than
   * none. A page moving its own map in answer to `helix-map-pan` sets
   * `zoomLevel`, `bearing` and `pitch` to where the map now is and then calls
   * this, since those are what is said.
   *
   * What is said waits for the view to settle, so a held key or a long
   * animation is one sentence, and it is the view's state where there is one:
   * the zoom level, the way the map faces, its tilt. A pan has no state to
   * say, so it says which way the map moved.
   */
  moved(): void {
    if (!this.asked || performance.now() - this.asked.at > ASK_LAPSES) {
      return
    }
    clearTimeout(this.settling)
    this.settling = setTimeout(() => this.say(), SETTLES)
  }

  /**
   * Whether the map has been drawn whole, which `drawn()` says. For a page that
   * connects after `helix-map-ready` has been sent, and missed it.
   */
  get ready(): boolean {
    return this.whole
  }

  /** What `ready` reads, written by `drawn()`. */
  private whole = false

  /**
   * Says the map has been drawn whole, or with `false`, that it no longer is.
   *
   * **Called by whatever draws the map**, as `connectMap` does once its driver
   * has every tile the view needs and the ground where there is terrain, and
   * with `false` when it disconnects. A page drawing its own map calls it when
   * that map is finished. The first call after the map was not drawn sends
   * `helix-map-ready` and turns on `:state(ready)`, so a page can wait on the
   * event or select on the state, and a page that connects late reads `ready`.
   */
  drawn(whole = true): void {
    if (whole === this.whole) {
      return
    }
    this.whole = whole
    this.toggleState('ready', whole)
    if (whole) {
      this.dispatchEvent(new HelixMapReadyEvent())
    }
  }

  private say(): void {
    const asked = this.asked
    this.asked = undefined
    if (!asked) {
      return
    }
    const numbers = formatNumbers(this.closest('[lang]')?.getAttribute('lang') ?? '')
    const degrees = (value: number): string => numbers(Math.round(value))
    const bearing = ((Math.round(this.bearing) % 360) + 360) % 360
    const words: Record<string, string> = {
      down: this.movedDownLabel,
      left: this.movedLeftLabel,
      right: this.movedRightLabel,
      up: this.movedUpLabel,
    }
    const next =
      asked.kind === 'pan'
        ? (words[asked.side ?? ''] ?? '')
        : asked.kind === 'zoom'
          ? this.zoomLevel === undefined
            ? ''
            : fillTemplate(this.zoomedLabel, { level: numbers(this.zoomLevel) })
          : asked.kind === 'tilt'
            ? Math.round(this.pitch) === 0
              ? this.flatLabel
              : fillTemplate(this.tiltedLabel, { degrees: degrees(this.pitch) })
            : bearing === 0
              ? this.northLabel
              : fillTemplate(this.turnedLabel, { degrees: degrees(bearing) })
    /* The same words twice would change nothing in the region and be heard
       once, so a second "Moved left" differs by a space no reader says. */
    /* Against the region as it stands, and not trimmed: `trim` takes the
       no-break space off too, so the third "Moved left" matched the second and
       was never heard. */
    this.said = next !== '' && next === this.said ? `${next}\u00a0` : next
  }

  /** Records what a reader asked, so the answer can be said. */
  private ask(kind: 'north' | 'pan' | 'rotate' | 'tilt' | 'zoom', side?: string): void {
    this.asked = { at: performance.now(), kind, ...(side ? { side } : {}) }
  }

  /**
   * The routes and areas among the frame's children, in the order they are
   * written, which is the order the list names them in.
   */
  private get layers(): MapLayer[] {
    return this.knownChildren.filter(
      (child): child is MapLayer => (child as Partial<MapLayer>).isMapLayer === true,
    )
  }

  /** Whether the layers menu is open. */
  @state()
  private layersOpen = false

  /* A layer a page hides or shows itself, which its checkbox and the list
     follow. Made on connection, so the server never builds one. */
  private hiding?: MutationObserver

  /** Closes the layers menu on a press anywhere outside the frame. */
  private readonly handleOutside = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) {
      this.layersOpen = false
    }
  }

  /**
   * Keys pressed in the layers menu. Escape closes it and returns to its
   * button, and no key reaches the region, where the arrows would pan the map.
   */
  private readonly handleMenuKeydown = (event: KeyboardEvent): void => {
    event.stopPropagation()
    if (event.key === 'Escape' && this.layersOpen) {
      this.layersOpen = false
      this.renderRoot.querySelector<HTMLElement>('[part="layers-toggle"]')?.focus()
    }
  }

  /**
   * The imagery among the layers: raster layers drawn as the ground, which the
   * map types show and hide rather than a tile of their own.
   */
  private get imagery(): MapLayer[] {
    return this.layers.filter((layer) => layer.layerKind === 'raster' && layer.ground === true)
  }

  /**
   * Whether a layer is drawn: not hidden, and, for imagery of the ground, while
   * a map type shows imagery.
   *
   * **The map type decides imagery without writing onto it.** It set `hidden`
   * on the consumer's own `<helix-map-raster ground>`, before anyone had asked,
   * which is an attribute their server never sent: the hydration mismatch the
   * area rules record. `connectMap` asks the same question.
   */
  private shown(layer: MapLayer): boolean {
    return !layer.hidden && !(layer.layerKind === 'raster' && layer.ground && !this.mapType)
  }

  /** A map type's name on its card. */
  private nameOf(type: MapType): string {
    return type === 'hybrid'
      ? this.hybridLabel
      : type === 'satellite'
        ? this.satelliteLabel
        : this.standardLabel
  }

  /**
   * Shows or hides layers, which `connectMap` draws or takes off the map.
   *
   * **Asked first, from the layer.** The tile wrote `hidden` onto the
   * consumer's element and said nothing, so a page could neither keep the
   * choice nor keep its own state in step. The request comes from the first
   * layer of the tile, which is the element the page wrote. Once `hidden`
   * holds the answer, the same layer sends `helix-toggle`, the request's verb
   * without `before`, since the platform has no word for a layer shown.
   */
  private showLayers(layers: readonly MapLayer[], shown: boolean): void {
    const first = layers[0]
    if (!first) {
      return
    }
    const applied = requestChange({
      apply: () => {
        for (const layer of layers) {
          layer.hidden = !shown
        }
        this.requestUpdate()
      },
      event: (checked) => new HelixBeforeToggleEvent({ checked }),
      host: first,
      next: shown,
    })
    if (applied) {
      first.dispatchEvent(new HelixToggleEvent({ checked: shown }))
    }
  }

  /** Asks for a map type, and sends `change` once it holds. */
  private chooseMapType(type: MapType): void {
    const applied = requestChange({
      apply: (value) => {
        this.mapType = value === 'standard' ? undefined : (value as 'hybrid' | 'satellite')
      },
      event: (value) => new HelixBeforeChangeEvent({ value }),
      host: this,
      next: type as string,
    })
    if (applied) {
      this.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      /* Refused: the radio the reader pressed is checked, and the type is not. */
      this.requestUpdate()
    }
  }

  /**
   * The layers menu's entries, in the order the layers are written: a layer
   * of its own, or every layer in a group, at the place of the first.
   */
  private get layerEntries(): MapLayer[][] {
    const entries: MapLayer[][] = []
    const groups = new Map<string, MapLayer[]>()
    const imagery = this.imagery
    for (const layer of this.layers.filter((one) => !imagery.includes(one))) {
      const had = layer.group ? groups.get(layer.group) : undefined
      if (had) {
        had.push(layer)
        continue
      }
      const entry = [layer]
      entries.push(entry)
      if (layer.group) {
        groups.set(layer.group, entry)
      }
    }
    return entries
  }

  /**
   * A route or area renamed, or its description changed, which the list says
   * and a slot change does not report.
   */
  private readonly handlePartChange = (event: HelixMapPartChangeEvent): void => {
    if (event.detail.kind !== 'place') {
      this.requestUpdate()
    }
  }

  /**
   * The markers among the frame's children, in the order they are written,
   * which is the order the arrow keys walk them in.
   */
  private get markers(): HelixHeadlessMapMarker[] {
    return this.knownChildren.filter(
      (child): child is HelixHeadlessMapMarker =>
        (child as Partial<HelixHeadlessMapMarker>).isMapMarker === true,
    )
  }

  /**
   * The marker the map's one tab stop is on, by position among the markers:
   * the one a reader last reached, and the first before they have reached any.
   */
  @state()
  private stop = 0

  /* Arrow keys, Home and End between the markers, wrapping, the controller the
     accordion and the tabs use: `origin: 'focus'` because the press says which
     marker it came from, and `selects` off because arriving on a place does
     nothing but arrive. The frame's own arrows pan the map, and only from the
     frame's region, so a press on a marker walks rather than pans. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () =>
      this.markers.map((marker, at) =>
        focusItemOf(marker, {
          /* Hidden inside a cluster, which the walk reaches instead, or with
             no place to stand, which a stylesheet cannot show: a walk that
             stopped there moved the stop to a marker nothing could focus. */
          disabled: marker.gatheredBy !== undefined || !placed(marker),
          /* The stop moves with the walk rather than waiting to hear focus
             arrive: a focus event from inside a marker's own shadow root is
             one an engine can fail to carry out to the frame, and the stop
             is the walk's to keep. */
          focus: () => {
            this.stop = at
            marker.focus()
          },
          /* The marker itself, as a browser retargets a press from its
             shadow root to it, or a node inside that root, as an engine that
             does not retarget reports it. */
          owns: (node) =>
            node !== null && (marker.contains(node) || marker.shadowRoot?.contains(node) === true),
        }),
      ),
    origin: 'focus',
    selects: () => false,
  })

  /** The marker a press or a click came from, where it came from one. */
  private markerOf(event: Event): HelixHeadlessMapMarker | undefined {
    return event
      .composedPath()
      .find(
        (one): one is HelixHeadlessMapMarker =>
          (one as Partial<HelixHeadlessMapMarker>).isMapMarker === true,
      )
  }

  /** Moves the tab stop to the marker focus arrived at. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const marker = this.markerOf(event)
    const at = marker ? this.markers.indexOf(marker) : -1
    if (at !== -1) {
      this.stop = at
    }
  }

  /**
   * Says a marker was pressed, by click, Enter or Space: a place by its name,
   * and a cluster as a cluster, from the marker it is drawn as.
   */
  private activate(marker: HelixHeadlessMapMarker): void {
    if (marker.gathered.length > 1) {
      marker.dispatchEvent(new HelixMapClusterEvent({ labels: [...marker.gathered] }))
      return
    }
    this.dispatchEvent(new HelixActivateEvent({ value: marker.name || marker.label || '' }))
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const marker = this.markerOf(event)
    if (marker) {
      this.activate(marker)
    }
  }

  /**
   * **Enter on the press and Space on the release**, as a native button
   * takes them, and a key held down says it once: auto-repeat sent a travel
   * thirty times a second, each restarting the last.
   */
  private readonly handleMarkerKeydown = (event: KeyboardEvent): void => {
    const marker = this.markerOf(event)
    if (!marker || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }
    /* Space's own default is to scroll the page, which a press on a button does not. */
    event.preventDefault()
    if (event.key === 'Enter' && !event.repeat) {
      this.activate(marker)
    }
  }

  private readonly handleMarkerKeyup = (event: KeyboardEvent): void => {
    const marker = this.markerOf(event)
    if (marker && event.key === ' ') {
      event.preventDefault()
      this.activate(marker)
    }
  }

  /** What the map says about its gestures where the page does not say it. */
  protected override get restingGestureLabels(): ViewportGestureLabels {
    return {
      activate: 'Press the map to use it',
      twoFinger: 'Use two fingers to move the map',
      using: 'Using the map. Press Escape to scroll the page again.',
      wheel: 'Use {key} and scroll to zoom the map',
    }
  }

  /** Which gestures the renderer takes, which `connectMap` hears from here. */
  protected override gesturesChanged(): void {
    this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'gestures' }))
  }

  /** A marker added or taken away is a walk of a different length. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener(HelixMapPartChangeEvent.eventName, this.handlePartChange)
    this.addEventListener('click', this.handleClick)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('keydown', this.handleMarkerKeydown)
    this.addEventListener('keyup', this.handleMarkerKeyup)
    this.hiding = new MutationObserver(() => this.requestUpdate())
    this.hiding.observe(this, { attributeFilter: ['hidden'], attributes: true, subtree: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    clearTimeout(this.settling)
    this.settling = undefined
    this.hiding?.disconnect()
    document.removeEventListener('pointerdown', this.handleOutside)
    this.removeEventListener(HelixMapPartChangeEvent.eventName, this.handlePartChange)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('keydown', this.handleMarkerKeydown)
    this.removeEventListener('keyup', this.handleMarkerKeyup)
  }

  /**
   * Asks for the render the hydration put off, which is the first one to know
   * the markers and the layers.
   *
   * **Without it a map a server sent never drew them.** The hydrating render
   * reads no children, and the parts' own first updates reach the frame while
   * its update is still pending, so nothing else asked: every marker kept
   * `tabindex="-1"` and there was no list of layers until the connector
   * happened to write a property, and a page moving its own map never did.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /**
   * Puts the tab stop on one marker and takes it off the rest, the roving
   * pattern the toolbar uses: every marker at `-1` is a map whose places the
   * keyboard cannot reach, and every one at `0` is a Tab press per place.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* A new map type is a redraw, and hides or shows the map's own roads and
       names, which `connectMap` hears from here. */
    if (changed.has('mapType')) {
      this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'layer' }))
    }
    if (changed.has('layersOpen')) {
      if (this.layersOpen) {
        document.addEventListener('pointerdown', this.handleOutside)
      } else {
        document.removeEventListener('pointerdown', this.handleOutside)
      }
    }
    const markers = this.markers
    /* On the cluster standing for the marker the stop was on, while it is
       gathered, so Tab still reaches the map's places, and on a placed
       marker where the stop's own has no place to stand. */
    const at = markers[Math.min(this.stop, markers.length - 1)]
    const on = at && placed(at) ? at : (markers.find(placed) ?? at)
    const stop = on?.gatheredBy ?? on
    for (const marker of markers) {
      marker.current = marker === stop
    }
    /* Asked of the connector as a place is: the next placing gathers or lets go. */
    if (changed.has('cluster')) {
      this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'place' }))
    }
  }

  /** Turns the map by some degrees, clockwise where positive. */
  rotate(by: number): void {
    this.ask('rotate')
    this.dispatchEvent(new HelixMapRotateEvent({ by }))
  }

  /** Turns the map to face north. */
  faceNorth(): void {
    this.ask('north')
    this.dispatchEvent(new HelixMapRotateEvent({ to: 0 }))
  }

  /** Tilts the map by some degrees, toward the horizon where positive. */
  tilt(by: number): void {
    this.ask('tilt')
    this.dispatchEvent(new HelixMapTiltEvent({ by }))
  }

  /** Tilts the map to some degrees from looking straight down. `0` makes it flat. */
  tiltTo(to: number): void {
    this.ask('tilt')
    this.dispatchEvent(new HelixMapTiltEvent({ to }))
  }

  /**
   * The layers button and its menu: a tile for each layer or group, in the
   * order they are written, with its picture and name, pressed while it is
   * shown. A group's tile is pressed while any of its layers is shown.
   */
  private renderLayersMenu(): TemplateResult | typeof nothing {
    const layers = this.layers
    if (!this.drawsControls('layers') || layers.length === 0) {
      return nothing
    }
    const entries = this.layerEntries
    return html`<button
        part="layers-toggle"
        aria-controls="layers-menu"
        aria-expanded=${this.layersOpen ? 'true' : 'false'}
        aria-label=${this.layersLabel}
        type="button"
        @click=${() => {
          this.layersOpen = !this.layersOpen
          /* Opening asks the connector for fresh previews of the map types. */
          if (this.layersOpen) {
            this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'menu' }))
          }
        }}
        @keydown=${this.handleMenuKeydown}
      >
        <svg aria-hidden="true" fill="currentColor" height="16" viewBox=${stack.viewBox} width="16">
          ${unsafeSVG(stack.content)}
        </svg>
      </button>
      <div
        part="layers-menu"
        id="layers-menu"
        role="group"
        aria-label=${this.layersLabel}
        ?hidden=${!this.layersOpen}
        @keydown=${this.handleMenuKeydown}
      >
        ${this.imagery.length > 0 ? this.renderMapTypes() : nothing}
        ${
          entries.length > 0
            ? html`<div part="layer-choices">
                ${entries.map((entry) => {
                  const shown = entry.some((layer) => !layer.hidden)
                  return html`<button
                    part="layer-choice"
                    aria-pressed=${shown ? 'true' : 'false'}
                    type="button"
                    @click=${() => this.showLayers(entry, !shown)}
                  >
                    <svg part="layer-icon" aria-hidden="true" fill="currentColor" viewBox=${iconOf(entry[0]).viewBox}>
                      ${unsafeSVG(iconOf(entry[0]).content)}
                    </svg>
                    <span part="layer-name">${entry[0]?.label ?? ''}</span>
                  </button>`
                })}
              </div>`
            : nothing
        }
      </div>`
  }

  /**
   * The map types, as cards with a picture of the map in each: Standard,
   * Hybrid, and Satellite. One is chosen, so they are radio buttons, and the
   * arrow keys move between them as a group of radios does.
   */
  private renderMapTypes(): TemplateResult {
    const chosen = this.mapType ?? 'standard'
    return html`<div part="map-types" role="radiogroup" aria-label=${this.mapTypeLabel}>
      ${MAP_TYPES.map((type) => {
        const preview = this.mapPreviews[type]
        return html`<label part="map-type">
          <input
            type="radio"
            name="map-type"
            .checked=${live(chosen === type)}
            @change=${(event: Event) => {
              event.stopPropagation()
              this.chooseMapType(type)
            }}
          />
          ${
            preview
              ? html`<img part="map-type-preview" alt="" src=${preview} />`
              : html`<span part="map-type-preview"></span>`
          }
          <span part="map-type-name">${this.nameOf(type)}</span>
        </label>`
      })}
    </div>`
  }

  /**
   * The compass, and the pan and rotate buttons around it where `controls`
   * names them.
   *
   * **One control for which way the map faces and where it goes.** The needle
   * turns with the map and points north; pressing it turns the map back. The
   * arrows around it are the way to move and turn the map without dragging,
   * which a pointer otherwise needs.
   */
  private renderCompass(pan: boolean, rotate: boolean): TemplateResult {
    return html`<div part="compass">
      ${
        rotate
          ? html`<button part="rotate-left" aria-label=${this.rotateLeftLabel} type="button" @click=${() => this.rotate(-ROTATE_STEP)}>
              ↺
            </button>`
          : nothing
      }
      ${
        pan
          ? html`<button part="pan-up" aria-label=${this.panLabel('up')} type="button" @click=${() => this.pan('up')}>
              ${this.panGlyph('up')}
            </button>`
          : nothing
      }
      ${
        rotate
          ? html`<button part="rotate-right" aria-label=${this.rotateRightLabel} type="button" @click=${() => this.rotate(ROTATE_STEP)}>
              ↻
            </button>`
          : nothing
      }
      ${
        pan
          ? html`<button part="pan-start" aria-label=${this.panLabel('start')} type="button" @click=${() => this.pan('start')}>
              ${this.panGlyph('start')}
            </button>`
          : nothing
      }
      <button part="face-north" aria-label=${this.faceNorthLabel} type="button" style=${`--map-needle-turn: ${-this.bearing}deg`} @click=${() => this.faceNorth()}>
        <svg part="needle" aria-hidden="true" viewBox="0 0 16 16">
          <path data-end="north" d="M8 1.5 10.5 8h-5Z" />
          <path data-end="south" d="M8 14.5 5.5 8h5Z" />
        </svg>
      </button>
      ${
        pan
          ? html`<button part="pan-end" aria-label=${this.panLabel('end')} type="button" @click=${() => this.pan('end')}>
              ${this.panGlyph('end')}
            </button>`
          : nothing
      }
      ${
        pan
          ? html`<button part="pan-down" aria-label=${this.panLabel('down')} type="button" @click=${() => this.pan('down')}>
              ${this.panGlyph('down')}
            </button>`
          : nothing
      }
    </div>`
  }

  /**
   * The controls, in one column in the order they are read: fullscreen, the
   * layers, 3D, zoom, and the compass with the arrows round it, last, where
   * the room its arrows take is below the column and not inside it.
   *
   * **Drawn here, not by the surface**, which lays its pad out for a board:
   * a map's arrows belong round its compass, and the reading order is the
   * column's, top to bottom.
   */
  protected override renderControls(): TemplateResult | typeof nothing {
    const pan = this.drawsControls('pan')
    const zoom = this.drawsControls('zoom')
    const rotate = this.drawsControls('rotate')
    const tilt = this.drawsControls('tilt')
    const fullscreen = this.drawsControls('fullscreen')
    const menu = this.renderLayersMenu()
    if (!pan && !zoom && !rotate && !tilt && !fullscreen && menu === nothing) {
      return nothing
    }
    return html`<div part="controls" role="group" aria-label=${this.controlsLabel ?? this.restingControlsLabel}>
      ${
        fullscreen
          ? html`<button
              part="fullscreen"
              aria-label=${this.fullscreenLabel}
              aria-pressed=${this.filled ? 'true' : 'false'}
              type="button"
              @click=${this.toggleFullscreen}
            >
              ⤢
            </button>`
          : nothing
      }
      ${menu}
      ${
        tilt
          ? html`<button
              part="tilt"
              aria-label=${this.tiltLabel}
              aria-pressed=${this.pitch > 0 ? 'true' : 'false'}
              type="button"
              @click=${() => this.tiltTo(this.pitch > 0 ? 0 : TILTED)}
            >
              3D
            </button>`
          : nothing
      }
      ${
        zoom
          ? html`<button part="zoom-in" aria-label=${this.zoomInLabel} type="button" @click=${() => this.zoom(1)}>
                +
              </button>
              <button part="zoom-out" aria-label=${this.zoomOutLabel} type="button" @click=${() => this.zoom(-1)}>
                −
              </button>`
          : nothing
      }
      ${this.drawsCompass ? this.renderCompass(pan, rotate) : nothing}
    </div>`
  }

  /** The controls the map draws while `controls` is absent. */
  protected override get restingControls(): string {
    return 'zoom compass fullscreen'
  }

  /** Whether the compass is drawn: named, or asked for by the arrows round it. */
  private get drawsCompass(): boolean {
    return ['compass', 'pan', 'rotate'].some((group) => this.drawsControls(group))
  }

  /** The keys the region answers, which the compass and `tilt` add to. */
  private get keyShortcuts(): string {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Plus', 'Minus']
    if (this.drawsCompass) {
      keys.push('Shift+ArrowLeft', 'Shift+ArrowRight')
    }
    if (this.drawsControls('tilt')) {
      keys.push('Shift+ArrowUp', 'Shift+ArrowDown')
    }
    return keys.join(' ')
  }

  /** Shift with the arrow keys: left and right rotate, and up and down tilt in steps. */
  protected override handleMoreKeys(event: KeyboardEvent): boolean {
    if (!event.shiftKey) {
      return false
    }
    if (this.drawsCompass && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      this.rotate(event.key === 'ArrowLeft' ? -ROTATE_STEP : ROTATE_STEP)
      return true
    }
    if (this.drawsControls('tilt') && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      this.tilt(event.key === 'ArrowUp' ? TILT_STEP : -TILT_STEP)
      return true
    }
    return false
  }

  /** The events this family names, the surface naming none of its own. */
  protected override panEvent(detail: ViewportPanDetail): Event {
    this.ask('pan', this.sideOf(detail.to))
    return new HelixMapPanEvent(detail)
  }

  protected override zoomEvent(detail: ViewportZoomDetail): Event {
    this.ask('zoom')
    return new HelixMapZoomEvent(detail)
  }

  /**
   * What the group of controls is called.
   *
   * The surface is shared and this is the half that is a map: a reader meeting
   * the group hears what it drives rather than "view controls", which names the
   * mechanism.
   */
  protected override get restingControlsLabel(): string {
    return 'Map controls'
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The host carries the name, so a consumer's own `aria-label` is the thing
       that wins rather than fighting an attribute this wrote. */
    hostAria(this.internals, { label: this.label })
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
    this.toggleState('layers-open', this.layersOpen)
    /* Whole degrees, as the readout says them: a map settling a hair off
       north is facing north to a reader, and to a stylesheet. */
    this.toggleState('rotated', Math.round(this.bearing) % 360 !== 0)
    this.toggleState('tilted', Math.round(this.pitch) !== 0)
  }

  /**
   * The routes and areas, named, for a reader who cannot see the map.
   *
   * **What the renderer draws is a picture to a screen reader**, so a route
   * from the depot or a delivery zone is not on the page at all until this
   * says it is. A list rather than a live region, because the reader should
   * find it when they come to the map rather than be told about it as it
   * changes. Nothing where there are none, so a map with only markers says
   * no more than it did.
   *
   * **Written once the frame knows its children**, which is in the browser:
   * the server renders the frame before it has any, and a route is only on
   * the page once a renderer has drawn it, which is later still.
   */
  protected renderLayers(): TemplateResult | typeof nothing {
    const layers = this.layers.filter((layer) => this.shown(layer))
    if (layers.length === 0) {
      return nothing
    }
    return html`<ul part="layers" aria-label=${this.layersLabel}>
      ${layers.map(
        (layer) =>
          html`<li part="layer">${layer.label ?? ''}${layer.description ? `, ${layer.description}` : ''}</li>`,
      )}
    </ul>`
  }

  /**
   * The frame, with each region in a box of its own.
   *
   * **The boxes are load-bearing rather than tidiness.** A `<slot>` is
   * `display: contents`, so what lands in the grid is whatever a consumer
   * assigned rather than the slot itself: with no header slotted, the viewport
   * took the first row and the attribution took the `1fr`, and the map collapsed
   * to the height of one line of text. Which slots a consumer fills is not
   * something the layout may depend on, so each region is a box that holds its
   * row whether or not anything is in it, and an empty one is a row of no
   * height.
   */
  protected override render(): TemplateResult {
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || this.getAttribute('aria-label') || 'Map'}
      aria-keyshortcuts=${this.keyShortcuts}
      tabindex="0"
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerleave=${this.handlePointerLeave}
      @pointermove=${this.idle.stir}
    >
      <div part="header">
        <slot name="header"></slot>
      </div>
      <div part="viewport">
        <slot @slotchange=${this.handleSlotChange}></slot>
        ${this.renderGestures()}
      </div>
      ${this.renderLayers()}
      ${this.renderControls()}
      <div part="footer">
        <slot name="footer"></slot>
      </div>
      <div part="attribution">
        <slot name="attribution"></slot>
      </div>
      <span part="live" role="status">${this.said}</span>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map': HelixHeadlessMap
  }
}
