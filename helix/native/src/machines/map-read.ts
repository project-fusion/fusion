/**
 * What a phone's map reads of the frame's children: its markers, its live
 * positions, its points layers, and each layer as a renderer draws it, in the
 * colors the theme gives each tone, as the web's connector reads them off
 * each element's settled style.
 *
 * **A layer's color comes from its tone and the theme**, the mapping its
 * table writes: a route and an area in the brand where no tone says
 * otherwise, buildings in the raised surface, a terrain's shadow and
 * highlight in the media colors. A page's `--map-route-color` and its kin do
 * not reach a phone.
 */
import {
  captionAt,
  cssColor,
  cutAlong,
  legible,
  type MapLayerSpec,
  type MapPlace,
  type MapPoints,
  mix,
  parseColor,
  pointsFrom,
} from '@fusion.dev/helix-core/map'
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'

type Element = ReactElement<Readonly<Record<string, unknown>>>

/** Each tag the frame reads, by the kind of thing it is. */
export const MAP_TAGS = {
  area: 'helix-map-area',
  buildings: 'helix-map-buildings',
  contours: 'helix-map-contours',
  landcover: 'helix-map-landcover',
  marker: 'helix-map-marker',
  points: 'helix-map-points',
  position: 'helix-map-position',
  raster: 'helix-map-raster',
  route: 'helix-map-route',
  terrain: 'helix-map-terrain',
} as const

/** A layer's kind, by its tag. */
const KINDS: Readonly<Record<string, MapLayerSpec['kind']>> = {
  'helix-map-area': 'area',
  'helix-map-buildings': 'buildings',
  'helix-map-contours': 'contours',
  'helix-map-landcover': 'landcover',
  'helix-map-points': 'points',
  'helix-map-raster': 'raster',
  'helix-map-route': 'route',
  'helix-map-terrain': 'terrain',
}

/** A layer element's kind, or `undefined` for a child that is no layer. */
export const layerKindOf = (child: ReactNode): MapLayerSpec['kind'] | undefined => {
  const tag = tagOf(child)
  return tag === undefined ? undefined : KINDS[tag]
}

/** A points layer's places, read once for each set of data. */
const POINTS = new WeakMap<object, MapPoints>()

/** A points layer's places from its `data`, by its `name-key`. */
export const pointsOfElement = (child: Element): MapPoints => {
  const data = child.props.data
  const key = typeof data === 'object' && data !== null ? data : undefined
  const had = key ? POINTS.get(key) : undefined
  if (had) {
    return had
  }
  const found = pointsFrom(data, words(child.props.nameKey) || 'name')
  if (key) {
    POINTS.set(key, found)
  }
  return found
}

const tagOf = (child: ReactNode): string | undefined =>
  isValidElement(child)
    ? ((child.type as { readonly tag?: unknown }).tag as string | undefined)
    : undefined

/** The children, fragments opened, in the order they are written. */
export const childrenOf = (children: unknown): readonly Element[] =>
  Children.toArray(children as ReactNode).flatMap((child): Element[] =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? [...childrenOf(child.props.children)]
      : isValidElement(child)
        ? [child as Element]
        : [],
  )

const finite = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : Number(value)
  return value === undefined || value === null || value === '' || !Number.isFinite(number)
    ? undefined
    : number
}

const words = (value: unknown): string => (typeof value === 'string' ? value : '')

/** A line's or an area's places: a list of `{ lat, lng }`, or `lat,lng lat,lng` as the attribute writes them. */
export const placesIn = (value: unknown): MapPlace[] => {
  if (Array.isArray(value)) {
    return value.flatMap((one: { lat?: unknown; lng?: unknown }) => {
      const lat = finite(one?.lat)
      const lng = finite(one?.lng)
      return lat === undefined || lng === undefined ? [] : [{ lat, lng }]
    })
  }
  return words(value)
    .trim()
    .split(/\s+/)
    .flatMap((pair) => {
      const [lat, lng] = pair.split(',').map((one) => finite(one))
      return lat === undefined || lng === undefined ? [] : [{ lat, lng }]
    })
}

/** A marker the page passed in, as the frame stands it and names it. */
export interface MapMarkerRead {
  readonly key: string
  readonly label: string
  readonly place: MapPlace
  readonly value: string
}

/** The markers with a place to stand, each keyed by its name, or by where it is written. */
export const markersOf = (children: readonly Element[]): readonly MapMarkerRead[] =>
  children
    .filter((child) => tagOf(child) === MAP_TAGS.marker)
    .flatMap((child, at): MapMarkerRead[] => {
      const lat = finite(child.props.lat)
      const lng = finite(child.props.lng)
      if (lat === undefined || lng === undefined) {
        return []
      }
      const name = words(child.props.name)
      const label = words(child.props.label)
      return [{ key: name || `marker-${at}`, label, place: { lat, lng }, value: name || label }]
    })

/** Every place the frame holds, which a view with none of its own is framed around. */
export const placesOf = (children: readonly Element[]): readonly MapPlace[] =>
  children.flatMap((child): MapPlace[] => {
    const tag = tagOf(child)
    if (tag === MAP_TAGS.marker || tag === MAP_TAGS.position) {
      const lat = finite(child.props.lat)
      const lng = finite(child.props.lng)
      return lat === undefined || lng === undefined ? [] : [{ lat, lng }]
    }
    if (tag === MAP_TAGS.route || tag === MAP_TAGS.area) {
      return placesIn(child.props.points)
    }
    if (tag === MAP_TAGS.points) {
      return pointsOfElement(child).points
    }
    return []
  })

/** The theme's color for a token, `#hex`, or a gray where the theme has none. */
type Ink = (token: string) => string

/** A tone's color, the brand where there is none. */
const toned = (ink: Ink, tone: string, fallback: string): string => {
  switch (tone) {
    case 'accent':
      return ink('color-accent')
    case 'danger':
      return ink('color-danger')
    case 'info':
      return ink('color-info')
    case 'neutral':
      return ink('color-foreground-muted')
    case 'primary':
      return ink('color-primary')
    case 'success':
      return ink('color-success')
    case 'warning':
      return ink('color-warning')
    default:
      return ink(fallback)
  }
}

/** A points layer's fill, its ring, and its counts' ink, by its tone, as its table writes them. */
const pointsInks = (ink: Ink, tone: string): { color: string; ink: string } => {
  switch (tone) {
    case 'accent':
      return { color: ink('color-accent-surface'), ink: ink('color-foreground-on-accent') }
    case 'danger':
    case 'info':
    case 'success':
      return {
        color: ink(`color-${tone}-surface`),
        ink: ink('color-foreground-on-status'),
      }
    case 'neutral':
      return { color: ink('color-foreground-muted'), ink: ink('color-surface') }
    case 'warning':
      return { color: ink('color-warning-solid'), ink: ink('color-background') }
    default:
      return { color: ink('color-primary-surface'), ink: ink('color-foreground-on-primary') }
  }
}

/** A color moved toward transparent by `share`, as `color-mix()` with transparent writes it. */
const thinned = (color: string, share: number): string => {
  const parsed = parseColor(color)
  return parsed ? cssColor({ ...parsed, alpha: (parsed.alpha ?? 1) * share }) : color
}

/** The frame's layers as a renderer draws them, the hidden ones left out, with each layer's element. */
export const layersOf = (
  children: readonly Element[],
  ink: Ink,
  hidden: ReadonlySet<string>,
): { readonly element: Element; readonly spec: MapLayerSpec }[] =>
  children.flatMap((child, at) => {
    const tag = tagOf(child)
    const kind = tag === undefined ? undefined : KINDS[tag]
    if (kind === undefined) {
      return []
    }
    const id = `${kind}-${at}`
    if (hidden.has(id)) {
      return []
    }
    const tone = words(child.props.tone)
    const label = words(child.props.label) || words(child.props.fallbackLabel)
    const base = { id, kind, label, points: [] as MapPlace[] }
    return specsOf(child, kind, base, tone, ink).map((spec) => ({ element: child, spec }))
  })

const specsOf = (
  child: Element,
  kind: MapLayerSpec['kind'],
  base: Pick<MapLayerSpec, 'id' | 'kind' | 'label' | 'points'>,
  tone: string,
  ink: Ink,
): MapLayerSpec[] => {
  const props = child.props
  switch (kind) {
    case 'route':
      return routeSpecs(child, base, toned(ink, tone, 'color-primary'), ink('color-surface'))
    case 'area':
      return [areaSpec(child, base, toned(ink, tone, 'color-primary'), ink)]
    case 'buildings':
      return [{ ...base, color: toned(ink, tone, 'color-surface-raised') }]
    case 'landcover':
      return [{ ...base, color: ink('color-surface') }]
    case 'points': {
      const inks = pointsInks(ink, tone)
      return [
        {
          ...base,
          casing: ink('color-surface'),
          cluster: props.cluster === true,
          color: inks.color,
          ink: inks.ink,
          points: pointsOfElement(child).points,
        },
      ]
    }
    case 'raster':
      return [rasterSpec(child, base)]
    case 'terrain':
      return [
        {
          ...base,
          color: thinned(ink('color-surface-media'), 0.4),
          encoding: props.encoding === 'mapbox' ? 'mapbox' : 'terrarium',
          highlight: thinned(ink('color-foreground-media'), 0.25),
          maxZoom: finite(props.maxZoom),
          src: words(props.src) || undefined,
        },
      ]
    default:
      /* Contours are the web's: their lines are worked out from elevation tiles in a worker. */
      return []
  }
}

/** How far a caption's ink stands from the land, as the web's connector holds it: AA. */
const CAPTION_CONTRAST = 4.5

/**
 * An area, and its caption where it has one: where it stands, from core's
 * `captionAt`, and colors that read on the map, the area's own color brought
 * toward the ink until it clears AA against the land, haloed in the land, as
 * the web's connector writes them.
 */
const areaSpec = (
  child: Element,
  base: Pick<MapLayerSpec, 'id' | 'kind' | 'label' | 'points'>,
  color: string,
  ink: Ink,
): MapLayerSpec => {
  const points = placesIn(child.props.points)
  const text = words(child.props.caption)
  if (text === '' || points.length === 0) {
    return { ...base, color, points }
  }
  const land = parseColor(ink('color-surface'))
  const fore = parseColor(ink('color-foreground'))
  const own = parseColor(color)
  return {
    ...base,
    caption: {
      ...captionAt(points, child.props.captionPlacement === 'outside' ? 'outside' : 'inside'),
      halo: ink('color-surface'),
      ink: land && fore && own ? legible(own, fore, land, CAPTION_CONTRAST) : color,
      text,
    },
    color,
    points,
  }
}

/** A route, cut at its progress into the quieter part behind and the part ahead, as the web's connector cuts it. */
const routeSpecs = (
  child: Element,
  base: Pick<MapLayerSpec, 'id' | 'kind' | 'label' | 'points'>,
  color: string,
  casing: string,
): MapLayerSpec[] => {
  const line = placesIn(child.props.points)
  const pattern = child.props.stroke === 'dotted' ? ('dotted' as const) : undefined
  const progress = finite(child.props.progress)
  if (progress === undefined || progress <= 0 || line.length < 2) {
    return [{ ...base, casing, color, pattern, points: line }]
  }
  const [behind, ahead] = cutAlong(line, Math.min(progress, 1))
  return [
    { ...base, casing, color, faded: true, id: `${base.id}-behind`, pattern, points: behind },
    ...(ahead.length > 1 ? [{ ...base, casing, color, pattern, points: ahead }] : []),
  ]
}

const rasterSpec = (
  child: Element,
  base: Pick<MapLayerSpec, 'id' | 'kind' | 'label' | 'points'>,
): MapLayerSpec => {
  const props = child.props
  const frames = Array.isArray(props.frames)
    ? (props.frames as unknown[]).filter((one): one is string => typeof one === 'string')
    : words(props.frames).split(/\s+/).filter(Boolean)
  const src = words(props.src)
  return {
    ...base,
    attribution: words(props.attribution) || undefined,
    color: '#000000',
    frame: finite(props.frame) ?? 0,
    frames: frames.length > 0 ? frames : src ? [src] : [],
    ground: props.ground === true,
    maxZoom: finite(props.maxZoom),
    opacity: finite(props.opacity) ?? 0.7,
  }
}

/** A gray, mixed from the theme's ink toward its land, for a token the theme lacks. */
export const inkOf =
  (tokens: Readonly<Record<string, number | string>>): Ink =>
  (token) => {
    const value = tokens[token]
    if (typeof value === 'string' && parseColor(value)) {
      return value
    }
    const ink = parseColor(String(tokens['color-foreground'] ?? '#1a1a1a'))
    const land = parseColor(String(tokens['color-surface'] ?? '#fafafa'))
    return ink && land ? cssColor(mix(ink, land, 0.5)) : '#808080'
  }
