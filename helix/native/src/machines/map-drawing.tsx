/**
 * What a phone's map draws under its markers: MapLibre Native's map, where
 * the app carries it, in the themed style with the frame's layers in it, or
 * a still picture of the frame's own shapes on the land's color, where it
 * does not, as Expo Go does not.
 *
 * **The still picture holds no streets.** It draws each area, route and
 * points layer from core's projection at the view the controls move, in the
 * colors and widths MapLibre draws them in, so the frame's own shapes stand
 * where they would on the real map. Imagery, shading, land cover and
 * buildings are tiles, which it leaves out.
 */
import { type MapLayerSpec, type MapView, screenOf } from '@fusion.dev/helix-core/map'
import { memo, type ReactNode, type Ref, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import type { CameraRef, MapLibreModule, ViewStateChangeEvent } from '../render/maplibre-types'
import { svg } from '../render/vector'

/** The most points the still picture draws of one layer, past which it draws every so many. */
const MOST_DOTS = 800

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

/** A points layer's dots in view as one path of small circles. */
const dotsOf = (view: MapView, spec: MapLayerSpec, radius: number): string => {
  const step = Math.max(1, Math.ceil(spec.points.length / MOST_DOTS))
  const pieces: string[] = []
  for (let at = 0; at < spec.points.length; at += step) {
    const place = spec.points[at]
    const point = place === undefined ? undefined : screenOf(view, place)
    if (
      point === undefined ||
      point[0] < -radius ||
      point[1] < -radius ||
      point[0] > view.width + radius ||
      point[1] > view.height + radius
    ) {
      continue
    }
    const [x, y] = point
    pieces.push(
      `M${(x - radius).toFixed(1)} ${y.toFixed(1)}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
    )
  }
  return pieces.join('')
}

/** What the still picture draws: the land, then each layer in the order MapLibre stacks them. */
interface StillProps {
  readonly land: string
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

/** A points layer's dots in view, as wide as the style draws them at the zoom. */
const pointsShapes = ({ Path }: SvgModule, view: MapView, spec: MapLayerSpec): ReactNode[] => {
  const radius = Math.min(6, Math.max(3, 3 + ((view.zoom - 8) * 3) / 7))
  const d = dotsOf(view, spec, radius)
  return d === ''
    ? []
    : [
        <Path
          d={d}
          fill={spec.color}
          key={spec.id}
          stroke={spec.casing ?? spec.color}
          strokeWidth={1.5}
        />,
      ]
}

/** What each kind of layer draws in the still picture: the tiles' kinds draw nothing. */
const SHAPES: Partial<
  Record<
    MapLayerSpec['kind'],
    (module: SvgModule, view: MapView, spec: MapLayerSpec) => ReactNode[]
  >
> = { area: areaShapes, points: pointsShapes, route: routeShapes }

/** The still picture, drawn again only when the view or the layers change. */
export const MapStill = memo(({ land, specs, view }: StillProps) => {
  const module = svg()
  const { Rect, Svg } = module
  const shapes = useMemo(
    () => [
      ...specs.flatMap((spec) => SHAPES[spec.kind]?.(module, view, spec) ?? []),
      ...specs.flatMap((spec) => captionShapes(module, view, spec)),
    ],
    [module, specs, view],
  )
  return (
    <Svg height={view.height} style={StyleSheet.absoluteFill} width={view.width}>
      <Rect fill={land} height={view.height} width={view.width} x={0} y={0} />
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
  readonly ready: () => void
  readonly style: object
}

/**
 * MapLibre Native's map, its own ornaments off, since the frame draws its
 * controls and its credit, and its own tilt by two fingers on, as the web's
 * renderer has it.
 */
export const MapLive = ({ camera, lib, moved, opening, ready, style }: LiveProps) => (
  <lib.Map
    attribution={false}
    compass={false}
    logo={false}
    mapStyle={style}
    onDidFinishRenderingMapFully={ready}
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
