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
import {
  composedStyle,
  type MapPlace,
  type MapView,
  mapLibreStyle,
  type ScreenPoint,
  screenOf,
} from '@fusion.dev/helix-core/map'
import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native'
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
import { type MarkerStand, sameStand, standBoxes, useChromeBoxes } from './map-taken'
import { useStillGround } from './map-tiles'
import { useMapView } from './map-view'
import { langOf } from './picker-field-kind'
import { boundTo, given, tell } from './props'

/**
 * What a tap on the map finds of one layer: how far from the tap the
 * nearest thing it draws is, and what pressing it does, or `undefined`
 * where it draws nothing within a finger's reach.
 */
export type MapHit = (
  at: ScreenPoint,
) => { readonly away: number; readonly go: () => void } | undefined

/** What a place on the map reads of its frame: the view, and the one stop a press holds. */
export interface MapBoard {
  /** The key of the marker or place a press last took, whose name shows. */
  readonly current: string
  /** Holds the stop on a key, whose name then shows, or on none with `''`. */
  readonly hold: (key: string) => void
  /** Adds what a tap on the map finds of a layer, and gives back its removal. */
  readonly listen: (hit: MapHit) => () => void
  /** Where a place falls in the frame's box, or `undefined` before the box is measured or behind the camera. */
  readonly project: (place: { lat: number; lng: number }) => [number, number] | undefined
  /** A marker's press: it holds the stop, and the frame sends `activate`. */
  readonly press: (key: string, value: string) => void
  /** Moves the view to a place at a zoom, as a count's press zooms in to it. */
  readonly show: (place: MapPlace, zoom: number) => void
  /** Keeps where a marker stands by its key, which the place names keep clear of, or forgets it with `undefined`. */
  readonly stand: (key: string, stand: MarkerStand | undefined) => void
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
 * still picture alike, in the strip's own words' size and color. **In a
 * corner over the map it is one line**, cut short where it runs out of
 * room, as the web's compact credit is; a screen reader reads it whole.
 */
const MAP_CREDIT = 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap'

const Credit = ({ cornered }: { readonly cornered: boolean }) => (
  <Text
    allowFontScaling={false}
    numberOfLines={cornered ? 1 : undefined}
    style={useInheritedText()}
  >
    {MAP_CREDIT}
  </Text>
)

/** The still picture's id, which a tap on the map lands on where MapLibre Native is not in the app. */
export const MAP_STILL = 'helix-map-still'

/** The viewport's id once the map in it is whole, which a device run's screens flow waits for. */
export const MAP_DRAWN = 'helix-map-drawn'

/**
 * The viewport, measured for the view. **It says once the map is whole**,
 * MapLibre Native's tiles drawn or the still picture, by the id a device
 * run waits for, since a map waiting on its tiles stands as still as a
 * drawn one. It stays its own view so the id reaches the phone's tree.
 */
const viewportOf = (
  ready: boolean,
  measure: (event: LayoutChangeEvent) => void,
  laid: (event: LayoutChangeEvent) => void,
): PartBinding => ({
  view: {
    collapsable: false,
    onLayout: (event: LayoutChangeEvent) => {
      measure(event)
      laid(event)
    },
    testID: ready ? MAP_DRAWN : undefined,
  },
})

/** A tap on the map: the nearest thing a layer draws within reach is pressed, or `missed` runs. */
const tapOf =
  (hits: Iterable<MapHit>, missed: () => void) =>
  (at: ScreenPoint): void => {
    let nearest: ReturnType<MapHit>
    for (const hit of hits) {
      const found = hit(at)
      if (found && (nearest === undefined || found.away < nearest.away)) {
        nearest = found
      }
    }
    if (nearest) {
      nearest.go()
    } else {
      missed()
    }
  }

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
  const hits = useRef(new Set<MapHit>())
  const chrome = useChromeBoxes()
  const [stands, setStands] = useState<ReadonlyMap<string, MarkerStand>>(() => new Map())
  const stand = useCallback((key: string, one: MarkerStand | undefined) => {
    setStands((was) => {
      if (sameStand(was.get(key), one)) {
        return was
      }
      const now = new Map(was)
      if (one === undefined) {
        now.delete(key)
      } else {
        now.set(key, one)
      }
      return now
    })
  }, [])
  /* **What the still picture's names keep clear of** besides the points:
     the markers where they stand at the view, the controls and the credit. */
  const taken = useMemo(
    () => (view === undefined ? [] : [...standBoxes(view, stands.values()), ...chrome.boxes]),
    [view, stands, chrome.boxes],
  )

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
  /* **The still picture's streets, water and land**, from the style's own
     tiles, in the layers and colors of the web's snapshot. */
  const ground = useStillGround(view, style, mapType, ink, lib === null, lang)

  /* The still picture is whole as soon as it is drawn. */
  const still = lib === null && view !== undefined
  useEffect(() => {
    if (still) {
      drawn()
    }
  })

  /* **A tap on the map presses the nearest dot or count a layer draws
     within a finger's reach**, as a click on the web's renderer does, and a
     tap on none puts away the name a press showed. A marker stands over
     the map and takes its own tap. */
  const tapped = tapOf(hits.current, () => setCurrent(''))

  const board: MapBoard = {
    current,
    hold: setCurrent,
    listen: (hit) => {
      hits.current.add(hit)
      return () => {
        hits.current.delete(hit)
      }
    },
    press: (key, value) => {
      setCurrent(key)
      const bound = boundTo(use, 'onActivate', 'event')
      if (bound !== undefined) {
        tell(family, latest.current, bound, { value })
      }
    },
    project: (place) => (view === undefined ? undefined : screenOf(view, place)),
    show: moves.show,
    stand,
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
      attribution: { view: { onLayout: chrome.attribution } },
      controls: { view: { onLayout: chrome.controls } },
      drawing: {
        drawing: () =>
          view === undefined ? null : lib === null ? (
            <Pressable
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              onPress={(event) =>
                tapped([event.nativeEvent.locationX, event.nativeEvent.locationY])
              }
              style={StyleSheet.absoluteFill}
              testID={MAP_STILL}
            >
              <MapStill
                base={ground.base}
                colorOf={ground.colorOf}
                inkOf={ground.inkOf}
                land={ink('color-surface')}
                namesOf={ground.namesOf}
                specs={specs}
                taken={taken}
                texts={ground.texts}
                view={view}
              />
            </Pressable>
          ) : (
            <MapLive
              camera={camera}
              lib={lib}
              moved={moved}
              opening={view}
              pressed={tapped}
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
      viewport: viewportOf(ready, measure, chrome.viewport),
      'zoom-in': pressed(() => moves.zoom(1)),
      'zoom-out': pressed(() => moves.zoom(-1)),
    },
    provide: (drawnFrame: ReactNode) => (
      <MapBoardContext.Provider value={board}>{drawnFrame}</MapBoardContext.Provider>
    ),
    regions: {
      ...(props.attribution !== undefined && props.attribution !== null
        ? {}
        : { attribution: <Credit cornered={wordsIn(read('credit-placement')) !== ''} /> }),
      default: placedChildren(children),
    },
  }
}
