/**
 * A phone's map's view: the box it is drawn in, where it opens once the box
 * is measured, each control's move through MapLibre Native's camera where
 * it draws, where a finger took the map, and the words each move says.
 */
import type { MapAim, MapPlace, MapView } from '@fusion.dev/helix-core/map'
import { useRef, useState } from 'react'
import { I18nManager, type LayoutChangeEvent } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { CameraRef, ViewStateChangeEvent } from '../render/maplibre-types'
import { useReducedMotion } from '../render/motion'
import type { Family } from '../style/form'
import { numberIn, wordsIn } from './date-picker-read'
import {
  type Moved,
  openingAim,
  type PanWay,
  panned,
  saidOf,
  tilted,
  turned,
  zoomed,
} from './map-moves'
import { boundTo, tell } from './props'

/** How long a move the reader asked for takes, in milliseconds, as the web's `step` pace. */
const STEP_PACE = 200

/** Words for the live region; the same words twice differ by a space no reader hears. */
const useSaid = () => {
  const [said, setSaid] = useState('')
  const say = (words: string) =>
    setSaid((was) => (words !== '' && words === was ? `${words} ` : words))
  return [said, say] as const
}

/** What the view needs of the frame. */
interface Asked {
  readonly family: Family
  readonly lang: string
  readonly places: readonly MapPlace[]
  readonly props: Props
  readonly read: (name: string) => unknown
  readonly use: MachineUse
}

/** The view, the moves that change it, and what they say. */
export const useMapView = ({ family, lang, places, props, read, use }: Asked) => {
  const reduced = useReducedMotion()
  const [box, setBox] = useState({ height: 0, width: 0 })
  const [aim, setAim] = useState<MapAim | undefined>(undefined)
  const [said, say] = useSaid()
  const camera = useRef<CameraRef>(null)
  const latest = useRef(props)
  latest.current = props
  /* **Where it opens, once the box is measured**: nothing that depends on
     the width is drawn before then. */
  const measured = box.width > 0 && box.height > 0
  const opening =
    aim ?? (measured ? openingAim(wordsIn(read('view')), places, box.width, box.height) : undefined)
  const view: MapView | undefined =
    opening && measured ? { ...opening, height: box.height, width: box.width } : undefined

  /**
   * Tells the page what a control asked, as the web's frame does whether or
   * not anything moves, then moves the view to `next` where there is a view,
   * through the camera where MapLibre draws, and says what the move did.
   */
  const go = (
    next: MapAim | undefined,
    moved: Moved,
    name: string,
    detail: Record<string, unknown>,
  ) => {
    const bound = boundTo(use, name, 'event')
    if (bound !== undefined) {
      tell(family, latest.current, bound, detail)
    }
    if (next === undefined) {
      return
    }
    setAim(next)
    camera.current?.easeTo({
      bearing: next.bearing ?? 0,
      center: [next.center.lng, next.center.lat],
      duration: reduced ? 0 : STEP_PACE,
      pitch: next.pitch ?? 0,
      zoom: next.zoom,
    })
    say(saidOf(moved, next, read, lang))
  }
  const panStep = numberIn(read('pan-step')) ?? 0.25
  const moves = {
    pan: (to: PanWay) =>
      go(
        opening && panned(opening, to, panStep, box, I18nManager.isRTL),
        { kind: 'pan', to },
        'onMapPan',
        { by: panStep, to },
      ),
    tilt: (to: number) => go(opening && tilted(opening, to), { kind: 'tilt' }, 'onMapTilt', { to }),
    turn: (asked: { by?: number; to?: number }) =>
      go(opening && turned(opening, asked), { kind: 'turn' }, 'onMapRotate', asked),
    zoom: (by: 1 | -1) => go(opening && zoomed(opening, by), { kind: 'zoom' }, 'onMapZoom', { by }),
  }

  /** Where a finger took MapLibre's map, which the frame and its places follow. */
  const moved = (state: ViewStateChangeEvent, settled: boolean) => {
    if (state.userInteraction || settled) {
      setAim({
        bearing: state.bearing,
        center: { lat: state.center[1], lng: state.center[0] },
        pitch: state.pitch,
        zoom: state.zoom,
      })
    }
  }
  const measure = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout
    setBox((was) => (was.width === width && was.height === height ? was : { height, width }))
  }
  return { camera, measure, moved, moves, said, view }
}
