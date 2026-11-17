/**
 * The places a phone's map stands on its view: a marker, a live position,
 * and the places in view of a points layer, each placed from core's camera
 * through the frame's `MapBoard` as the view moves, as the web's connector
 * stands them.
 *
 * **Each is a button or an image a screen reader reaches**, from the
 * element and core, never from the drawing: a marker's name, a position's
 * name and the words it says as it moves, and each point and count in view,
 * up to a few dozen, past which the layer says how many places are in view.
 *
 * **A tap on a points layer's dot or count does what a click does on the
 * web's renderer**, whichever of its buttons stand: a dot sends `activate`
 * from the layer, and a count zooms in to where it comes apart.
 */

import {
  clusterRadiusOf,
  type MapDrawnPoint,
  metersAcross,
  pointsDrawn,
} from '@fusion.dev/helix-core/map'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { I18nManager, type LayoutChangeEvent } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { kebab, numberIn, wordsIn } from './date-picker-read'
import { type MapBoard, MapBoardContext, type MapHit } from './map'
import { pointsOfElement } from './map-read'
import { dotAt, standOf } from './map-taken'
import { langOf } from './picker-field-kind'
import { boundTo, given, tell } from './props'

type Read = (name: string) => unknown

/** The most places and counts in view a points layer makes buttons of. */
const MOST_PLACES = 40

/** How far past a dot's or a count's edge a tap still takes it, in points: half a finger. */
const REACH = 10

/** The height of a line the places are read along, in points, as the web's connector walks them. */
const WALK_LINE = 24

/** A place as a marker or a position writes it, or `undefined` where it has none. */
const placeIn = (read: Read) => {
  const lat = numberIn(read('lat'))
  const lng = numberIn(read('lng'))
  return lat === undefined || lng === undefined ? undefined : { lat, lng }
}

/** Hosts a marker on a phone's map. */
export const useMapMarker = (family: Family, props: Props, use: MachineUse): Behavior => {
  const board = useContext(MapBoardContext)
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const label = wordsIn(read('label'))
  const name = wordsIn(read('name'))
  const passed = read('passed') === true
  const passedLabel = wordsIn(read('passed-label'))
  const named = passed
    ? passedLabel.includes('{label}')
      ? formatMessage(passedLabel, { label }, lang)
      : `${label}, ${passedLabel}`
    : label
  const place = placeIn(read)
  const at = place === undefined ? undefined : board?.project(place)
  const key = name || label
  const shown = board !== undefined && board.current !== '' && board.current === key
  const flag = (one: string) => boundTo(use, one, 'state') ?? kebab(one)
  /* **The frame keeps where the marker stands**, so the still picture's
     place names keep clear of it, and forgets it as the marker goes. */
  const stand = board?.stand
  useEffect(() => () => stand?.(key, undefined), [stand, key])
  return {
    marks: [
      ...(at === undefined ? [] : ['placed']),
      ...(passed ? ['passed'] : []),
      /* What the page passed into the `icon` region, a letter or a glyph. */
      ...(props.icon === undefined || props.icon === null ? [] : ['icon']),
      ...(shown ? ['active'] : []),
    ],
    measured:
      at === undefined ? {} : { '_map-marker-x': `${at[0]}px`, '_map-marker-y': `${at[1]}px` },
    parts: {
      host: {
        states: { [flag('named')]: named, [flag('open')]: shown },
        view: {
          onLayout: (event: LayoutChangeEvent) => {
            if (place !== undefined && at !== undefined) {
              stand?.(key, standOf(place, at, event.nativeEvent.layout))
            }
          },
        },
      },
      marker: { view: { onPress: () => board?.press(key, name || label) } },
    },
  }
}

/** How long a position waits between the words it says as it moves, at least, as `announce-every` on the web. */
const SAYS_EVERY = 5000

/** Hosts a live position on a phone's map. */
export const useMapPosition = (family: Family, props: Props, use: MachineUse): Behavior => {
  const board = useContext(MapBoardContext)
  const read: Read = (name) => given(family, props, kebab(name))
  const named = wordsIn(read('label')) || wordsIn(read('fallback-label'))
  const description = wordsIn(read('description'))
  const place = placeIn(read)
  const at = place === undefined ? undefined : board?.project(place)
  const accuracy = numberIn(read('accuracy'))
  const heading = numberIn(read('heading'))
  const view = board?.view
  const [said, setSaid] = useState('')
  const last = useRef(0)
  const where = place === undefined ? '' : `${place.lat},${place.lng}`
  /* **Said as it moves, at most once every few seconds**, its name and what
     the page says of it, so a reader hears a van arrive without hearing
     every step. */
  useEffect(() => {
    if (where === '') {
      return
    }
    const now = Date.now()
    if (now - last.current >= SAYS_EVERY) {
      last.current = now
      setSaid(description ? `${named}, ${description}` : named)
    }
  }, [where, named, description])
  const radius =
    accuracy === undefined || place === undefined || view === undefined
      ? 0
      : metersAcross(accuracy, place.lat, view.zoom)
  const flag = (one: string) => boundTo(use, one, 'state') ?? kebab(one)
  return {
    marks: at === undefined ? [] : ['placed'],
    measured:
      at === undefined
        ? {}
        : {
            '_map-position-heading': `${(heading ?? 0) - (view?.bearing ?? 0)}deg`,
            '_map-position-radius': `${radius}px`,
            '_map-position-x': `${at[0]}px`,
            '_map-position-y': `${at[1]}px`,
          },
    parts: { host: { states: { [flag('named')]: named, [flag('said')]: said } } },
  }
}

/** A place or a count in view, and where it falls. */
interface InView {
  readonly at: [number, number]
  readonly one: MapDrawnPoint
}

/**
 * What a tap at a point finds of a points layer: the nearest of its dots
 * and counts in view whose edge is within a finger's reach.
 */
const hitOf =
  (inView: readonly InView[], zoom: number, press: (one: MapDrawnPoint) => void): MapHit =>
  ([x, y]) => {
    const dot = dotAt(zoom).radius
    let found: { away: number; go: () => void } | undefined
    for (const { at, one } of inView) {
      const edge = one.kind === 'cluster' ? clusterRadiusOf(one.count) : dot
      const away = Math.hypot(at[0] - x, at[1] - y) - edge
      if (away <= REACH && (found === undefined || away < found.away)) {
        found = { away, go: () => press(one) }
      }
    }
    return found
  }

/** Each place and count of a layer the view shows, in reading order, top to bottom and along each line. */
const inViewOf = (board: MapBoard | undefined, drawn: readonly MapDrawnPoint[]): InView[] => {
  const view = board?.view
  if (board === undefined || view === undefined) {
    return []
  }
  return drawn
    .flatMap((one) => {
      const at = board.project(one.place)
      return at === undefined || at[0] < 0 || at[1] < 0 || at[0] > view.width || at[1] > view.height
        ? []
        : [{ at, one }]
    })
    .sort(
      (a, b) =>
        Math.floor(a.at[1] / WALK_LINE) - Math.floor(b.at[1] / WALK_LINE) ||
        (I18nManager.isRTL ? b.at[0] - a.at[0] : a.at[0] - b.at[0]),
    )
}

/** Hosts a points layer's places in view on a phone's map. */
export const useMapPoints = (family: Family, props: Props, use: MachineUse): Behavior => {
  const board = useContext(MapBoardContext)
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const label = wordsIn(read('label')) || wordsIn(read('fallback-label'))
  const found = pointsOfElement({ props } as Parameters<typeof pointsOfElement>[0])
  const cluster = read('cluster') === true
  const view = board?.view
  const zoom = view?.zoom ?? 0
  const drawn = useMemo(
    () => pointsDrawn({ cluster, points: found.points }, zoom),
    [cluster, found.points, zoom],
  )
  const inView = inViewOf(board, drawn)
  const latest = useRef(props)
  latest.current = props
  /* **A place pressed is the page's**, sent from the layer with its id or
     its name; **a count pressed is sent** from the layer with how many it
     holds, where it is and the zoom it comes apart at, as the web's is,
     **and zooms in** to there. */
  const press = (one: MapDrawnPoint) => {
    if (one.kind === 'cluster') {
      const told = boundTo(use, 'onMapCluster', 'event')
      if (told !== undefined) {
        tell(family, latest.current, told, {
          count: one.count,
          place: { lat: one.place.lat, lng: one.place.lng },
          zoom: one.zoom,
        })
      }
      board?.show(one.place, one.zoom)
      return
    }
    board?.hold(`point-${one.index}`)
    const bound = boundTo(use, 'onActivate', 'event')
    if (bound !== undefined) {
      tell(family, latest.current, bound, {
        value: found.values[one.index] ?? String(one.index),
      })
    }
  }
  const pressRef = useRef(press)
  pressRef.current = press
  const hit = hitOf(inView, zoom, (one) => pressRef.current(one))
  const hitRef = useRef(hit)
  hitRef.current = hit
  const listen = board?.listen
  useEffect(() => listen?.((at) => hitRef.current(at)), [listen])
  const reached = inView.length <= MOST_PLACES
  const count = formatMessage(
    wordsIn(read('count-label')),
    {
      count: inView.reduce((sum, { one }) => sum + (one.kind === 'cluster' ? one.count : 1), 0),
    },
    lang,
  )
  const places = reached
    ? inView.map(({ at, one }) => ({
        count: one.kind === 'cluster',
        key: one.kind === 'cluster' ? one.key : String(one.index),
        name:
          one.kind === 'cluster'
            ? formatMessage(wordsIn(read('count-label')), { count: one.count }, lang)
            : found.names[one.index] || String(one.index + 1),
        x: `${at[0]}px`,
        y: `${at[1]}px`,
      }))
    : []
  const flag = (one: string) => boundTo(use, one, 'state') ?? kebab(one)
  return {
    marks: [],
    parts: {
      host: {
        lists: { [flag('places')]: places },
        states: { [flag('named')]: reached ? label : `${label}, ${count}` },
      },
      place: {
        copy: (item: Entry) => {
          const key = String(item.fields.key)
          const one = inView.find(
            ({ one }) => (one.kind === 'cluster' ? one.key : String(one.index)) === key,
          )?.one
          return { onPress: () => (one === undefined ? undefined : pressRef.current(one)) }
        },
      },
    },
  }
}
