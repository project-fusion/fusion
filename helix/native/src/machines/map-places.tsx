/**
 * The places a phone's map stands on its view: a marker, a live position,
 * and the places in view of a points layer, each placed from core's camera
 * through the frame's `MapBoard` as the view moves, as the web's connector
 * stands them.
 *
 * **Each is a button or an image a screen reader reaches**, from the
 * element and core, never from the drawing: a marker's name, a position's
 * name and the words it says as it moves, and each point in view, up to a
 * few dozen, past which the layer says how many places are in view.
 */

import { metersAcross } from '@fusion.dev/helix-core/map'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useContext, useEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { kebab, numberIn, wordsIn } from './date-picker-read'
import { MapBoardContext } from './map'
import { pointsOfElement } from './map-read'
import { langOf } from './picker-field-kind'
import { boundTo, given } from './props'

type Read = (name: string) => unknown

/** The most places in view a points layer makes buttons of. */
const MOST_PLACES = 40

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
      host: { states: { [flag('named')]: named, [flag('open')]: shown } },
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

/** Hosts a points layer's places in view on a phone's map. */
export const useMapPoints = (family: Family, props: Props, use: MachineUse): Behavior => {
  const board = useContext(MapBoardContext)
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const label = wordsIn(read('label')) || wordsIn(read('fallback-label'))
  const found = pointsOfElement({ props } as Parameters<typeof pointsOfElement>[0])
  const view = board?.view
  const inView =
    view === undefined
      ? []
      : found.points.flatMap((place, index) => {
          const at = board?.project(place)
          return at === undefined ||
            at[0] < 0 ||
            at[1] < 0 ||
            at[0] > view.width ||
            at[1] > view.height
            ? []
            : [{ at, index }]
        })
  const reached = inView.length <= MOST_PLACES
  const count = formatMessage(wordsIn(read('count-label')), { count: inView.length }, lang)
  const places = reached
    ? inView.map(({ at, index }) => ({
        count: false,
        key: String(index),
        name: found.names[index] || String(index + 1),
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
          const index = Number(item.fields.key)
          return {
            onPress: () => board?.press(`point-${index}`, found.values[index] ?? String(index)),
          }
        },
      },
    },
  }
}
