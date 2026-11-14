/**
 * A map on a phone: the frame draws the map itself through the renderer
 * capability, MapLibre Native where the app carries it and a still picture
 * of its own shapes where it does not, and its controls move the view.
 *
 * **The view is the frame's own**: it opens at `view`, or framed around
 * every place the frame holds once the box is measured, and each control
 * moves it a step, as the web's connector moves a renderer. MapLibre Native
 * tells the frame where a finger took it, so the markers, the position and
 * the points in view keep up through `MapBoard`.
 *
 * **What a screen reader hears comes from the children and core**: the list
 * of layers, each marker's and point's button, and the words each move says
 * once it lands, never the drawing.
 */
import { renderer } from '@fusion.dev/helix-core/capabilities/renderer'
import { composedStyle, type MapView, mapLibreStyle, screenOf } from '@fusion.dev/helix-core/map'
import { createContext, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { loadMapLibre } from '../capabilities/renderer'
import type { MachineUse } from '../ir.generated'
import { useInheritedText } from '../render/around'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { kebab, wordsIn } from './date-picker-read'
import { MapLive, MapStill } from './map-drawing'
import { menuOf, useMapType, useShown } from './map-menu'
import { controlsOf, ROTATE_STEP, TILTED } from './map-moves'
import { childrenOf, inkOf, layersOf, locatedSpec, placedChildren, placesOf } from './map-read'
import { useMapView } from './map-view'
import { langOf } from './picker-field-kind'
import { boundTo, given, tell } from './props'

/** What a place on the map reads of its frame: the view, and the one stop a press holds. */
export interface MapBoard {
  /** The key of the marker or place a press last took, whose name shows. */
  readonly current: string
  /** Where a place falls in the frame's box, or `undefined` before the box is measured or behind the camera. */
  readonly project: (place: { lat: number; lng: number }) => [number, number] | undefined
  /** A marker's or a place's press: it holds the stop, and the frame sends `activate`. */
  readonly press: (key: string, value: string) => void
  readonly view: MapView | undefined
}

/** The frame a marker, a position or a points layer stands in, where it stands in one. */
export const MapBoardContext = createContext<MapBoard | undefined>(undefined)

type Read = (name: string) => unknown

/** The colors a themed map is drawn from, out of the theme's tokens. */
const colorsOf = (ink: (token: string) => string) => ({
  foreground: ink('color-foreground'),
  info: ink('color-info'),
  primary: ink('color-primary'),
  success: ink('color-success'),
  surface: ink('color-surface'),
})

/**
 * The credit OpenFreeMap's tiles ask for, as its TileJSON names it, which the
 * web's connector writes from the renderer. **In the frame's credit strip
 * wherever the page wrote none**, under MapLibre Native's map and under the
 * still picture alike, in the strip's own words' size and color.
 */
const MAP_CREDIT = 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap'

const Credit = () => (
  <Text allowFontScaling={false} style={useInheritedText()}>
    {MAP_CREDIT}
  </Text>
)

/** A press binding: what the press does. */
const pressed = (go: () => void): PartBinding => ({ view: { onPress: go } })

/** Hosts a phone's map frame. */
export const useMap = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const theme = useTheme()
  const ink = useMemo(() => inkOf(theme.tokens), [theme.tokens])
  const children = useMemo(() => childrenOf(props.children), [props.children])
  const [current, setCurrent] = useState('')
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const lib = renderer().available('map') ? loadMapLibre() : null
  const shown = useShown(children)
  const [mapType, chooseType] = useMapType(family, props, use, read)
  const places = useMemo(() => placesOf(children), [children])
  const { camera, measure, moved, moves, said, view } = useMapView({
    family,
    lang,
    places,
    props,
    read,
    use,
  })
  const latest = useRef(props)
  latest.current = props

  const layers = useMemo(() => layersOf(children, ink, shown.hidden), [children, ink, shown.hidden])
  const specs = useMemo(
    () =>
      layers
        .map((one) => locatedSpec(one.spec))
        .filter((spec) => !(spec.kind === 'raster' && spec.ground && mapType === 'standard')),
    [layers, mapType],
  )

  const style = useMemo(() => {
    const base = mapLibreStyle(colorsOf(ink), { globe: false, landmarks: false, language: lang })
    const composed = composedStyle(base, specs)
    return mapType === 'satellite'
      ? {
          ...composed,
          layers: composed.layers.filter(
            (layer) => layer.type !== 'symbol' && layer['source-layer'] !== 'transportation',
          ),
        }
      : composed
  }, [ink, lang, mapType, specs])

  const drawn = () => {
    if (!ready) {
      setReady(true)
      const bound = boundTo(use, 'onMapReady', 'event')
      if (bound !== undefined) {
        tell(family, latest.current, bound, {})
      }
    }
  }
  /* The still picture is whole as soon as it is drawn. */
  const still = lib === null && view !== undefined
  useEffect(() => {
    if (still) {
      drawn()
    }
  })

  const board: MapBoard = {
    current,
    press: (key, value) => {
      setCurrent(key)
      const bound = boundTo(use, 'onActivate', 'event')
      if (bound !== undefined) {
        tell(family, latest.current, bound, { value })
      }
    },
    project: (place) => (view === undefined ? undefined : screenOf(view, place)),
    view,
  }

  const controls = controlsOf(wordsIn(read('controls')))
  const menu = menuOf(children, layers, shown, mapType, read)
  const bearing = view?.bearing ?? 0
  const pitch = view?.pitch ?? 0
  const flag = (one: string) => boundTo(use, one, 'state') ?? kebab(one)
  const named =
    wordsIn(read('aria-label')) || wordsIn(read('label')) || wordsIn(read('fallback-label'))
  const states: Record<string, boolean | string> = {
    ...controls,
    layered: controls.layered && menu.entries.length + menu.types.length > 0,
    named,
    open,
    said,
    tilted: Math.round(pitch) !== 0,
    typed: menu.types.length > 0,
  }
  return {
    marks: [
      ...(open ? ['layers-open'] : []),
      ...(ready ? ['ready'] : []),
      ...(Math.round(bearing) % 360 !== 0 ? ['rotated'] : []),
      ...(Math.round(pitch) !== 0 ? ['tilted'] : []),
    ],
    parts: {
      drawing: {
        drawing: () =>
          view === undefined ? null : lib === null ? (
            <MapStill land={ink('color-surface')} specs={specs} view={view} />
          ) : (
            <MapLive
              camera={camera}
              lib={lib}
              moved={moved}
              opening={view}
              ready={drawn}
              style={style}
            />
          ),
      },
      'face-north': pressed(() => moves.turn({ to: 0 })),
      host: {
        lists: Object.fromEntries(
          Object.entries({ entries: menu.entries, layers: menu.layers, types: menu.types }).map(
            ([name, list]) => [flag(name), list],
          ),
        ),
        states: Object.fromEntries(
          Object.entries(states).map(([name, value]) => [flag(name), value]),
        ),
      },
      'layer-choice': {
        copy: (item: Entry) => ({ onPress: () => shown.toggle(String(item.fields.key)) }),
      },
      'layers-toggle': pressed(() => setOpen((was) => !was)),
      'map-type': {
        copy: (item: Entry) => ({ onPress: () => chooseType(String(item.fields.key)) }),
      },
      needle: {
        wrap: (drawnNeedle: ReactNode) => (
          <View style={{ transform: [{ rotate: `${-bearing}deg` }] }}>{drawnNeedle}</View>
        ),
      },
      'pan-down': pressed(() => moves.pan('down')),
      'pan-end': pressed(() => moves.pan('end')),
      'pan-start': pressed(() => moves.pan('start')),
      'pan-up': pressed(() => moves.pan('up')),
      'rotate-left': pressed(() => moves.turn({ by: -ROTATE_STEP })),
      'rotate-right': pressed(() => moves.turn({ by: ROTATE_STEP })),
      tilt: pressed(() => moves.tilt(Math.round(pitch) > 0 ? 0 : TILTED)),
      viewport: { view: { onLayout: measure } },
      'zoom-in': pressed(() => moves.zoom(1)),
      'zoom-out': pressed(() => moves.zoom(-1)),
    },
    provide: (drawnFrame: ReactNode) => (
      <MapBoardContext.Provider value={board}>{drawnFrame}</MapBoardContext.Provider>
    ),
    regions: {
      ...(props.attribution !== undefined && props.attribution !== null
        ? {}
        : { attribution: <Credit /> }),
      default: placedChildren(children),
    },
  }
}
