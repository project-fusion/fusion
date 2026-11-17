/**
 * What a phone's map draws under its markers: MapLibre Native's map, where
 * the app carries it, in the themed style with the frame's layers in it, or
 * a still picture of the frame's own shapes on the land's color, where it
 * does not, as Expo Go does not.
 *
 * **The still picture is the web's snapshot, and the frame's shapes on it.**
 * It draws the land, then the streets, water, parks and buildings from the
 * style's own vector tiles in the layers and colors the web's first paint
 * draws them in (`map-tiles.ts`), then each area, route and points layer
 * from core's projection at the view the controls move, in the colors and
 * widths MapLibre draws them in, a points layer that clusters as MapLibre's
 * counts, then the names of the tiles' cities, towns, villages and
 * neighborhoods where they do not overlap (`map-names.tsx`), then the areas'
 * captions. Road names, shields, landmarks, imagery, shading, raised
 * buildings, and the frame's own land cover are MapLibre's alone.
 */
import {
  clusterRadiusOf,
  countAbbreviated,
  type MapDrawnPoint,
  type MapLayerSpec,
  type MapView,
  type PlaceName,
  type PlaceNameBox,
  pointsDrawn,
  type ScreenPoint,
  screenOf,
  snapshotWidth,
} from '@fusion.dev/helix-core/map'
import { memo, type ReactNode, type Ref, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import type { CameraRef, MapLibreModule, ViewStateChangeEvent } from '../render/maplibre-types'
import { svg } from '../render/vector'
import { nameShapes } from './map-names'
import type { StillBase } from './map-tiles'

/** The most places of one layer the still picture draws in view, past which it draws every so many. */
const MOST_DOTS = 5000

/** A route's width and its edge's at a zoom, as the style's `interpolate` widens them from 4 to 14. */
const widthAt = (zoom: number, low: number, high: number): number =>
  low + ((high - low) * Math.min(Math.max(zoom - 4, 0), 10)) / 10

/** A line or a ring through places on the screen, as one path, pieces joined once (Hermes). */
const pathOf = (view: MapView, spec: MapLayerSpec, closed: boolean): string => {
  const pieces: string[] = []
  for (const place of spec.points) {
    const at = screenOf(view, place)
    if (at !== undefined) {
      pieces.push(`${pieces.length === 0 ? 'M' : 'L'}${at[0].toFixed(1)} ${at[1].toFixed(1)}`)
    }
  }
  if (closed && pieces.length > 2) {
    pieces.push('Z')
  }
  return pieces.length > 1 ? pieces.join('') : ''
}

/** Where one place or count falls in view, or `undefined` where it is out of it by more than `radius`. */
export const inViewOf = (
  view: MapView,
  one: MapDrawnPoint,
  radius: number,
): ScreenPoint | undefined => {
  const point = screenOf(view, one.place)
  return point === undefined ||
    point[0] < -radius ||
    point[1] < -radius ||
    point[0] > view.width + radius ||
    point[1] > view.height + radius
    ? undefined
    : point
}

/** How wide a place apart is drawn at a zoom, and its edge, as the points layer's `interpolate` widens them from 8 to 15. */
export const dotAt = (zoom: number): { edge: number; radius: number } => {
  const share = Math.min(Math.max(zoom - 8, 0), 7) / 7
  return { edge: 1 + 0.5 * share, radius: 3 + 3 * share }
}

/** A points layer's places apart in view as one path of small circles. */
const dotsOf = (view: MapView, drawn: readonly MapDrawnPoint[], radius: number): string => {
  const apart = drawn.filter((one) => one.kind === 'point')
  const step = Math.max(1, Math.ceil(apart.length / MOST_DOTS))
  const pieces: string[] = []
  for (let at = 0; at < apart.length; at += step) {
    const one = apart[at]
    const point = one === undefined ? undefined : inViewOf(view, one, radius)
    if (point === undefined) {
      continue
    }
    const [x, y] = point
    pieces.push(
      `M${(x - radius).toFixed(1)} ${y.toFixed(1)}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
    )
  }
  return pieces.join('')
}

/** What the still picture draws: the land, the tiles' layers, then each of the frame's in the order MapLibre stacks them. */
interface StillProps {
  readonly base: readonly StillBase[]
  /** A tiles' layer's color: the land moved toward its token. */
  readonly colorOf: (layer: StillBase['layer']) => string
  /** A place name's color by how far its layer moves the land toward the ink. */
  readonly inkOf: (amount: number) => string
  readonly land: string
  /** The tiles' place names that fit the view, clear of the boxes given. */
  readonly namesOf: (taken: readonly PlaceNameBox[]) => readonly PlaceName[]
  readonly specs: readonly MapLayerSpec[]
  readonly view: MapView
}

type SvgModule = ReturnType<typeof svg>

/** An area: its wash, and its edge. */
const areaShapes = (module: SvgModule, view: MapView, spec: MapLayerSpec): ReactNode[] => {
  const { Path } = module
  const d = pathOf(view, spec, true)
  return d === ''
    ? []
    : [
        <Path
          d={d}
          fill={spec.color}
          fillOpacity={0.16}
          key={spec.id}
          stroke={spec.color}
          strokeLinejoin="round"
          strokeWidth={1.5}
        />,
      ]
}

/**
 * An area's caption, in the style's own face at the caption layer's size,
 * haloed in the land, centered on its spot or standing above it.
 */
const captionShapes = ({ Text }: SvgModule, view: MapView, spec: MapLayerSpec): ReactNode[] => {
  const caption = spec.caption
  const at = caption === undefined ? undefined : screenOf(view, caption.at)
  if (caption === undefined || at === undefined) {
    return []
  }
  const y = caption.anchor === 'bottom' ? at[1] - 14 * 0.3 : at[1] + 14 * 0.35
  const words = (stroke: boolean) => (
    <Text
      fill={caption.ink}
      fontSize={14}
      fontWeight="600"
      key={`${spec.id}-caption${stroke ? '-halo' : ''}`}
      stroke={stroke ? caption.halo : 'none'}
      strokeLinejoin="round"
      strokeWidth={stroke ? 4 : 0}
      textAnchor="middle"
      x={at[0]}
      y={y}
    >
      {caption.text}
    </Text>
  )
  return [words(true), words(false)]
}

/** A route: its edge under it where it has one, and the line, dotted or solid, quieter where traveled. */
const routeShapes = ({ Path }: SvgModule, view: MapView, spec: MapLayerSpec): ReactNode[] => {
  const d = pathOf(view, spec, false)
  if (d === '') {
    return []
  }
  const opacity = spec.faded ? 0.4 : 1
  const dots = spec.pattern === 'dotted'
  const width = widthAt(view.zoom, 2.5, 5)
  const line = (
    <Path
      d={d}
      fill="none"
      key={spec.id}
      stroke={spec.color}
      {...(dots ? { strokeDasharray: [0, width * 2] } : {})}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={opacity}
      strokeWidth={width}
    />
  )
  if (!spec.casing || dots) {
    return [line]
  }
  return [
    <Path
      d={d}
      fill="none"
      key={`${spec.id}-casing`}
      stroke={spec.casing}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={opacity}
      strokeWidth={widthAt(view.zoom, 5.5, 9)}
    />,
    line,
  ]
}

/**
 * A points layer at the view's zoom, as its style layers draw it: each count
 * a disc in a halo of its own color, sized by the step of how many it holds,
 * with its figures in the count's ink; and the places apart as dots in the
 * layer's color, ringed in the land.
 */
const pointsShapes = (module: SvgModule, view: MapView, spec: MapLayerSpec): ReactNode[] => {
  const { Circle, Path, Text } = module
  const drawn = pointsDrawn(spec, view.zoom)
  const { edge, radius } = dotAt(view.zoom)
  const d = dotsOf(view, drawn, radius)
  const counts = drawn.flatMap((one) => {
    if (one.kind !== 'cluster') {
      return []
    }
    const size = clusterRadiusOf(one.count)
    const at = inViewOf(view, one, size + 6)
    return at === undefined
      ? []
      : [
          <Circle
            cx={at[0]}
            cy={at[1]}
            fill={spec.color}
            fillOpacity={0.22}
            key={`${spec.id}-${one.key}-halo`}
            r={size + 6}
          />,
          <Circle
            cx={at[0]}
            cy={at[1]}
            fill={spec.color}
            key={`${spec.id}-${one.key}`}
            r={size}
            stroke={spec.casing ?? spec.color}
            strokeWidth={2}
          />,
          <Text
            fill={spec.ink ?? '#ffffff'}
            fontSize={12}
            key={`${spec.id}-${one.key}-count`}
            textAnchor="middle"
            x={at[0]}
            y={at[1] + 12 * 0.35}
          >
            {countAbbreviated(one.count)}
          </Text>,
        ]
  })
  return [
    ...(d === ''
      ? []
      : [
          <Path
            d={d}
            fill={spec.color}
            key={spec.id}
            stroke={spec.casing ?? spec.color}
            strokeWidth={edge}
          />,
        ]),
    ...counts,
  ]
}

/**
 * The box round each count the points layers draw in view, its halo
 * included, which a place name keeps clear of: a name across a count
 * hides its figures.
 */
const countBoxes = (view: MapView, specs: readonly MapLayerSpec[]): PlaceNameBox[] =>
  specs.flatMap((spec) =>
    spec.kind !== 'points'
      ? []
      : pointsDrawn(spec, view.zoom).flatMap((one): PlaceNameBox[] => {
          if (one.kind !== 'cluster') {
            return []
          }
          const reach = clusterRadiusOf(one.count) + 6
          const at = inViewOf(view, one, reach)
          return at === undefined
            ? []
            : [[at[0] - reach, at[1] - reach, at[0] + reach, at[1] + reach]]
        }),
  )

/** The tiles' layers, each one path in its color: a fill, or a line as wide as the style draws it at the zoom. */
const baseShapes = (
  { Path }: SvgModule,
  view: MapView,
  base: readonly StillBase[],
  colorOf: StillProps['colorOf'],
): ReactNode[] =>
  base.map(({ layer, path }) =>
    layer.kind === 'fill' ? (
      /* Nonzero, since tiles overlap, as the web's snapshot fills them. */
      <Path d={path} fill={colorOf(layer)} key={`base-${layer.id}`} />
    ) : (
      <Path
        d={path}
        fill="none"
        key={`base-${layer.id}`}
        stroke={colorOf(layer)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={snapshotWidth(layer, view.zoom)}
      />
    ),
  )

/** What each kind of layer draws in the still picture: the tiles' kinds draw nothing. */
const SHAPES: Partial<
  Record<
    MapLayerSpec['kind'],
    (module: SvgModule, view: MapView, spec: MapLayerSpec) => ReactNode[]
  >
> = { area: areaShapes, points: pointsShapes, route: routeShapes }

/** The still picture, drawn again only when the view or the layers change. */
export const MapStill = memo(({ base, colorOf, inkOf, land, namesOf, specs, view }: StillProps) => {
  const module = svg()
  const { Rect, Svg } = module
  const ground = useMemo(
    () => baseShapes(module, view, base, colorOf),
    [module, view, base, colorOf],
  )
  const shapes = useMemo(
    () => [
      ...specs.flatMap((spec) => SHAPES[spec.kind]?.(module, view, spec) ?? []),
      ...nameShapes(module, namesOf(countBoxes(view, specs)), land, inkOf),
      ...specs.flatMap((spec) => captionShapes(module, view, spec)),
    ],
    [module, specs, view, namesOf, land, inkOf],
  )
  return (
    <Svg height={view.height} style={StyleSheet.absoluteFill} width={view.width}>
      <Rect fill={land} height={view.height} width={view.width} x={0} y={0} />
      {ground}
      {shapes}
    </Svg>
  )
})

/** What MapLibre Native's map is given. */
interface LiveProps {
  readonly camera: Ref<CameraRef>
  readonly lib: MapLibreModule
  /** Where it opens; later moves go through the camera. */
  readonly opening: MapView
  readonly moved: (state: ViewStateChangeEvent, settled: boolean) => void
  /** A tap on the map, where it landed in the box. */
  readonly pressed: (at: ScreenPoint) => void
  readonly ready: () => void
  readonly style: object
}

/**
 * MapLibre Native's map, its own ornaments off, since the frame draws its
 * controls and its credit, and its own tilt by two fingers on, as the web's
 * renderer has it.
 */
export const MapLive = ({ camera, lib, moved, opening, pressed, ready, style }: LiveProps) => (
  <lib.Map
    attribution={false}
    compass={false}
    logo={false}
    mapStyle={style}
    onDidFinishRenderingMapFully={ready}
    onPress={(event) => pressed([event.nativeEvent.point[0], event.nativeEvent.point[1]])}
    onRegionDidChange={(event) => moved(event.nativeEvent, true)}
    onRegionIsChanging={(event) => moved(event.nativeEvent, false)}
    scaleBar={false}
    style={StyleSheet.absoluteFill}
  >
    <lib.Camera
      initialViewState={{
        bearing: opening.bearing ?? 0,
        center: [opening.center.lng, opening.center.lat],
        pitch: opening.pitch ?? 0,
        zoom: opening.zoom,
      }}
      maxZoom={20}
      minZoom={0}
      ref={camera}
    />
  </lib.Map>
)
