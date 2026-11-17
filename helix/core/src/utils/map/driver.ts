/*
 * What a map renderer answers for a frame to drive it, and the places,
 * bounds and layers it is asked about: the same on the web, where
 * `@fusion.dev/helix-map` connects a renderer, and on a phone, where the frame
 * draws MapLibre Native itself.
 */

/**
 * How a move is animated: the page's own duration and curve.
 *
 * `null` where it is a jump instead, which is what a reader who asked for
 * less motion gets and what a theme whose durations are zero, the `instant`
 * character, asks for.
 */
export interface MapMotion {
  /** In milliseconds. */
  duration: number
  /** Progress through the time in, progress through the move out, both 0 to 1. */
  easing(t: number): number
}

/**
 * Which of the page's paces a move is: a step, a pan or a zoom a reader asked
 * for one press at a time, or a travel, the view carried to a place.
 */
export type MapPace = 'step' | 'travel'

/** How the map draws the ground: the themed map, imagery under its roads and names, or imagery alone. */
export type MapType = 'hybrid' | 'satellite' | 'standard'

/**
 * What a renderer has to answer for the frame to drive it, and nothing that is
 * the same for every renderer: that is the connector's.
 *
 * **Physical pixels and a direction in, whatever the renderer calls them out.**
 * The frame asks in reading order and in fractions of the viewport, and the
 * connector turns that into pixels on screen before a driver sees it, so the
 * one thing every driver would otherwise get wrong on its own, which way
 * `start` is on a right-to-left page, is answered once.
 */
export interface MapDriver {
  /**
   * Which way the view is turned, in degrees clockwise from north, where the
   * renderer can turn it. A position's heading is drawn against it, so an
   * arrow pointing north still points north on a map turned east.
   */
  bearing?(): number
  /**
   * Whether a place is on the far side of a globe, out of sight. A marker
   * there is hidden, and stays in the frame's walk.
   */
  behind?(place: MapPlace): boolean
  /**
   * The renderer's credits as it writes them, which is markup, and a way to
   * hear them change. `stop` ends the listening and puts back anything the
   * driver hid to take the credit over, such as the renderer's own control.
   */
  credits?(changed: () => void): { read(): string[]; stop(): void }
  /**
   * Calls `done` once the renderer has drawn its view whole, with every tile
   * it needs and the ground where there is terrain, and returns what stops the
   * waiting. Leave the frame's own shapes out, since a route that animates is
   * redrawn every frame and would never count as drawn. What takes a snapshot
   * drawn on the server away and sends the frame's `helix-map-ready`; without
   * it, the snapshot stays under the renderer's drawing and the frame is never
   * `:state(ready)`.
   */
  ready?(done: () => void): () => void
  /**
   * Which gestures the renderer takes from the page, as the frame's
   * `gestures` decides. `free` is what the renderer did before it was told
   * otherwise. `cooperative` leaves the wheel and one finger to the page and
   * takes the wheel with Ctrl or ⌘, and two fingers. `off` takes none, while a
   * map waiting to be pressed has not been. The frame tells the reader what
   * passed to the page, so hide the renderer's own message where it has one.
   */
  gestures?(mode: 'cooperative' | 'free' | 'off'): void
  /**
   * The element the renderer made focusable, which the connector takes out of
   * the tab order while connected so the frame's region is the one stop.
   */
  focusTarget?(): HTMLElement | null
  /**
   * Frames a stretch of the world, its two corners in degrees, inset by
   * `padding` pixels from the view's edges, over the page's motion or at once.
   * What `connection.fit()` asks, to show every place the frame holds.
   */
  fit?(bounds: MapBounds, padding: MapPadding, motion: MapMotion | null): void
  /**
   * Shows or hides the renderer's own roads and names, which the Satellite
   * map type hides so the imagery stands alone.
   */
  labels?(shown: boolean): void
  /**
   * Draws the frame's routes and areas as the renderer's own layers, under its
   * place names where it has them. `read` is the whole set as it stands, its
   * colors settled, and a driver asks it every time it draws, including after
   * the renderer's style was replaced and took them with it. The connector
   * calls `update` when one is added, taken away or changed; `stop` takes
   * them off.
   */
  layers?(
    read: () => MapLayerSpec[],
    events?: MapLayerEvents,
  ): {
    /**
     * The zoom a points layer's count comes apart at, by the renderer's id
     * for it, or `undefined` where the renderer cannot say.
     */
    apartAt?(id: string, cluster: number): Promise<number | undefined>
    /** Zooms in to where a points layer's count comes apart, at the page's pace, centered on `place` where given. */
    expand?(id: string, cluster: number, place?: MapPlace): void
    /** A points layer's points and counts drawn in view, which the keyboard walks. */
    inView?(id: string): MapInView[]
    stop(): void
    update(): void
  }
  /**
   * Hears the view move, every frame it moves, and returns what stops it. What
   * lets markers keep up with the map; without it they are placed once.
   */
  onView?(moved: () => void): () => void
  /**
   * Moves the view by this many CSS pixels, right and down positive, over the
   * page's own motion, or at once where it is `null`.
   */
  panBy(x: number, y: number, motion: MapMotion | null): void
  /**
   * Pictures of the view in each map type, as image URLs, for the cards in
   * the frame's layers menu. `imagery` is the tile URL the Hybrid and
   * Satellite types draw; without it, only Standard can be drawn.
   */
  previews?(ask: {
    imagery?: { maxZoom?: number | undefined; src: string } | undefined
    types: readonly MapType[]
  }): Promise<Partial<Record<MapType, string>>>
  /**
   * How far the view is tilted, in degrees from looking straight down, where
   * the renderer can tilt it. The frame's 3D button is pressed while it is
   * above `0`.
   */
  pitch?(): number
  /**
   * Where a place falls in the map's box, in CSS pixels from its top left.
   * Without it markers cannot be placed, and the connector leaves them hidden.
   */
  project?(place: MapPlace): { x: number; y: number }
  /**
   * Takes off the renderer's own zoom buttons, which the frame's replace, and
   * returns what puts them back. Asked only where the frame draws its own.
   */
  replaceZoom?(): () => void
  /**
   * Turns the view by `by` degrees clockwise, or to the bearing `to`, over the
   * page's motion or at once. What the frame's rotate buttons and keys ask.
   */
  rotate?(
    turn: { by?: number | undefined; to?: number | undefined },
    motion: MapMotion | null,
  ): void
  /**
   * Turns the renderer's own keyboard handling off, and returns what turns it
   * back to how it was.
   */
  silenceKeyboard?(): () => void
  /** Brings a place to the middle of the view, at its zoom where it has one. */
  show?(place: MapPlace & { zoom?: number | undefined }, motion: MapMotion | null): void
  /**
   * Tilts the view `by` degrees toward the horizon, or back toward flat where
   * negative, or `to` a tilt, `0` being flat, within what the renderer allows.
   * What the frame's 3D button and tilt keys ask.
   */
  tilt?(tilt: { by?: number | undefined; to?: number | undefined }, motion: MapMotion | null): void
  /**
   * How far the view is zoomed, in the renderer's own levels. The frame says
   * it after a zoom, so a reader hears where a step took them.
   */
  zoom?(): number
  /** Zooms one step in, `1`, or out, `-1`, by whatever a step is to this renderer. */
  zoomBy(direction: 1 | -1, motion: MapMotion | null): void
}

/** What a driver drawing layers tells the connector, and asks of it. */
export interface MapLayerEvents {
  /**
   * A reader pressed a points layer's count: which layer, by its spec's
   * `id`, the renderer's id for the count, how many places it holds, where it
   * is, and the zoom it comes apart at. The connector sends
   * `helix-map-cluster` and zooms in to it. Without it, a driver zooms in
   * itself.
   */
  cluster?(
    id: string,
    found: {
      cluster: number
      count: number
      place: MapPlace
      zoom?: number | undefined
    },
  ): void
  /** The page's motion for a trip, for a cluster of points a press zooms in to. */
  motion(): MapMotion | null
  /** A reader pressed a point: which points layer, by its spec's `id`, and which of its points. */
  press(id: string, index: number): void
  /** The renderer has drawn what the view shows and gone still, which is when to ask what is in view. */
  settled?(): void
}

/** A point or a count a renderer drew in view. */
export interface MapInView {
  /** Which of the layer's points, where it is one. */
  at?: number | undefined
  /** The renderer's id for a count, where it is one. */
  cluster?: number | undefined
  /** How many places a count holds. */
  count?: number | undefined
  place: MapPlace
}

/** A place, in degrees. */
export interface MapPlace {
  lat: number
  lng: number
}

/** A stretch of the world by its south-west and north-east corners. */
export interface MapBounds {
  northEast: MapPlace
  southWest: MapPlace
}

/** How far in from each edge of the view, in CSS pixels, or one inset for all four. */
export type MapPadding = number | { bottom: number; left: number; right: number; top: number }

/**
 * A layer as a driver draws it, whatever renderer it drives: its kind, the
 * places it passes through or around, and its color settled to sRGB.
 */
export interface MapLayerSpec {
  /** A raster layer's credit for its tiles, which the frame shows with the map's own. */
  attribution?: string | undefined
  /**
   * An area's caption: its words, the place they stand on and which part of
   * them stands there, `center` or `bottom` for words above the place, and
   * the colors to draw them in, an `ink` that reads on the map and a `halo`
   * of the land round it. Drawn above the place names, and never pressed.
   */
  caption?:
    | { anchor: 'bottom' | 'center'; at: MapPlace; halo: string; ink: string; text: string }
    | undefined
  /**
   * A route's edge, drawn wider under it so it reads as laid over the roads
   * rather than as one of them, where the roads are drawn in the same brand;
   * the ring round each point of a points layer. Absent where there is none
   * to draw.
   */
  casing?: string | undefined
  /** How a terrain layer's elevation tiles store heights in their colors. */
  encoding?: 'mapbox' | 'terrarium' | undefined
  /** How many times its real height a raised terrain layer's ground is raised. */
  exaggeration?: number | undefined
  /** Whether a points layer's points are gathered into their counts where they would meet. */
  cluster?: boolean | undefined
  /** `#hex`, `rgb()` or `rgba()`, which every renderer takes. */
  color: string
  /**
   * Drawn quieter: the part of a route already traveled, which the connector
   * cuts from the rest at the route's `progress`.
   */
  faded?: boolean | undefined
  /** Which of a raster layer's `frames` shows, counting from `0`. */
  frame?: number | undefined
  /** A raster layer's tile URLs, one per frame, each with `{z}`, `{x}`, and `{y}` in it. */
  frames?: readonly string[] | undefined
  /**
   * A raster layer drawn as the ground, such as imagery: under the roads and
   * place names, where other raster layers are over the roads.
   */
  ground?: boolean | undefined
  /** The color of a terrain layer's slopes that face the light. Its `color` is the shadow's. */
  highlight?: string | undefined
  /** Stable for as long as the element is in the frame, for a renderer that keys its layers. */
  id: string
  /** What a points layer writes its counts in. */
  ink?: string | undefined
  kind: 'area' | 'buildings' | 'contours' | 'landcover' | 'points' | 'raster' | 'route' | 'terrain'
  /** What the frame's list calls it. */
  label: string
  /** A raster layer's deepest zoom with tiles, past which a renderer enlarges them. */
  maxZoom?: number | undefined
  /** How opaque a raster layer's tiles are, from `0` to `1`. */
  opacity?: number | undefined
  /**
   * How a route's line is drawn where it is not solid: `dotted` for a leg
   * off the network the rest is routed on, a place set back from its road.
   */
  pattern?: 'dotted' | undefined
  /** Whether a terrain layer raises the ground to its height in 3D. */
  raised?: boolean | undefined
  /** A terrain or contours layer's elevation tile URL, with `{z}`, `{x}`, and `{y}` in it. */
  src?: string | undefined
  /** The unit a contours layer's heights are labeled in. */
  unit?: 'feet' | 'meters' | undefined
  /**
   * In order: along a route, and around an area without repeating the first;
   * a points layer's every point, the same array for as long as its data is
   * the same, so a driver can tell a redraw that moved none of them.
   */
  points: MapPlace[]
}
