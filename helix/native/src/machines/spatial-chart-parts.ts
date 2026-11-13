/**
 * The parts of a spatial chart on a phone that each family's drawing shares:
 * the camera a drag and Shift with an arrow turn, the picture fitted to the
 * box's type size, the words over the drawing, the reading under a finger,
 * and the clock its readings grow in by.
 */

import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import {
  type BoxView,
  type Camera,
  dragged,
  type Frame,
  NAME_SIZE,
  type PagePoint,
  SPATIAL_VIEW,
  shareOf,
  TICK_SIZE,
  TurnFrame,
  turned,
} from '@fusion.dev/helix-core/spatial'
import { useEffect, useRef, useState } from 'react'
import type { TrackPoint } from '../drivers/track'
import { useMotionPaused } from '../render/motion'
import type { Theme } from '../theme/theme'
import { percent } from './axis-chart'
import type {
  SpatialKind,
  SpatialMarks,
  SpatialPicture,
  SpatialRoom,
  SpatialWord,
} from './spatial-chart'

/** How near a finger has to be to a reading to be asking about it, in points, as the web's tap. */
export const REACH = 24

/** The arrow keys that turn the view while Shift is held, and which way each turns it. */
const TURNS: Readonly<Record<string, { across: number; up: number }>> = {
  ArrowDown: { across: 0, up: -1 },
  ArrowLeft: { across: -1, up: 0 },
  ArrowRight: { across: 1, up: 0 },
  ArrowUp: { across: 0, up: 1 },
}

/** A length of the theme in points, from a `rem` or a `px` length. */
export const lengthOf = (theme: Theme, token: string, fallback: number): number => {
  const written = String(theme.tokens[token] ?? '')
  const value = Number.parseFloat(written)
  if (!Number.isFinite(value)) {
    return fallback
  }
  return written.endsWith('rem') ? value * theme.rem : value
}

/** The camera, the frame it holds through a drag, and the drag and the keys that turn it. */
export const useCamera = (box: { readonly height: number; readonly width: number }) => {
  const [camera, setCamera] = useState<Camera>(SPATIAL_VIEW)
  const [moving, setMoving] = useState(false)
  const [, redraw] = useState(0)
  const frames = useRef(new TurnFrame())
  const turn = {
    by: (from: TrackPoint, to: TrackPoint) => {
      setMoving(true)
      setCamera((was) => dragged(was, (to.x - from.x) * box.width, (to.y - from.y) * box.height))
    },
    end: () => setMoving(false),
  }
  const claim = (key: {
    readonly key: string
    readonly shift: boolean
    readonly alt: boolean
    readonly control: boolean
    readonly meta: boolean
  }) => {
    const step = TURNS[key.key]
    if (!key.shift || step === undefined || key.alt || key.control || key.meta) {
      return false
    }
    setCamera((was) => turned(was, step.across, step.up))
    return true
  }
  /** The frame to draw in, which asks for another draw while the drawing settles. */
  const frameOf = (fits: Frame, middle: PagePoint): Frame => {
    const still = environment().read().reducedMotion
    const { settling, shown } = frames.current.frame(fits, middle, moving, still)
    if (settling) {
      requestAnimationFrame(() => redraw((count) => count + 1))
    }
    return shown
  }
  return { camera, claim, frameOf, moving, turn }
}

/**
 * The picture whose words stand at the box's type size on the screen, as the
 * web's `wordsFitted` measures them: the drawing scales to its box, so a word
 * written in the box's units is sized again on the frame it widened.
 */
export const fitted = <Model>(
  kind: SpatialKind<Model>,
  model: Model,
  camera: Camera,
  room: SpatialRoom,
  lang: string,
): SpatialPicture => {
  let picture = kind.picture(model, camera, 1, lang, room)
  if (kind.fitsWords === true || !(room.width > 0 && room.height > 0)) {
    return picture
  }
  for (let pass = 0; pass < 4; pass += 1) {
    const { height, width } = picture.fits
    const pixel = 1 / Math.min(room.width / width, room.height / height)
    picture = kind.picture(
      model,
      camera,
      Math.min(3, Math.max(0.25, (room.font * pixel) / 0.13)),
      lang,
      room,
    )
  }
  return picture
}

/**
 * How tall a word `size` of the box's units stands on the screen, in points,
 * or `undefined` where it stands at no size: before the box is measured, or
 * a word scaled to nothing. **No word is drawn then**, since Android refuses a
 * font size that is not positive and ends the app.
 */
export const pointsAt = (size: number, frame: Frame, width: number): number | undefined => {
  const points = size * (width / Math.max(frame.width, 1e-6))
  return Number.isFinite(points) && points > 0 ? points : undefined
}

/** A number or a name over the drawing, at its share of the frame. */
export const wordsAt = (view: BoxView, frame: Frame, width: number, name: boolean) => {
  /* As large as the web writes it in the box, in points: its share of the box at the drawing's scale. */
  const points = pointsAt((name ? NAME_SIZE : TICK_SIZE) * view.words, frame, width)
  if (points === undefined) {
    return []
  }
  const size = `${points}px`
  return view.labels
    .filter((one) => one.name === name)
    .map((one, key) => {
      const at = shareOf({ ...view, bounds: frame }, one)
      return {
        key: String(key),
        size,
        text: one.text,
        x: percent(at.x * 100),
        y: percent(at.y * 100),
      }
    })
}

/** The reading under a finger: the one whose place is nearest it on the screen, within `REACH`. */
export const nearestOf =
  (
    places: readonly PagePoint[],
    frame: Frame,
    box: { readonly height: number; readonly width: number },
  ) =>
  (point: TrackPoint): number => {
    let found = -1
    let distance = REACH
    places.forEach((place, at) => {
      const share = shareOf({ bounds: frame } as BoxView, place)
      const away = Math.hypot((share.x - point.x) * box.width, (share.y - point.y) * box.height)
      if (away < distance) {
        distance = away
        found = at
      }
    })
    return found
  }

/** Each word a family writes in its drawing, at its share of the frame, in points as large as the web writes it. */
export const wordsOver = (words: readonly SpatialWord[] | undefined, frame: Frame, width: number) =>
  (words ?? []).flatMap((one, key) => {
    const points = pointsAt(one.size, frame, width)
    if (points === undefined) {
      return []
    }
    const at = shareOf({ bounds: frame } as BoxView, one)
    return {
      color: one.color ?? '',
      key: String(key),
      size: `${points}px`,
      text: one.text,
      toned: one.color !== undefined,
      x: percent(at.x * 100),
      y: percent(at.y * 100),
    }
  })

/**
 * How long a family's readings have grown in, in milliseconds, drawn again
 * each frame until they stand: from the first table with readings, as the
 * web's `grow` grows them the first time the chart is seen. With the
 * reader's reduced motion or the app's motion paused they stand from the
 * start, as `Infinity`.
 */
export const useGrowth = (length: number): number => {
  const paused = useMotionPaused()
  const still = paused || environment().read().reducedMotion
  /* Decided once, as the first table with readings arrives: a start, or `null` for none. */
  const since = useRef<number | null | undefined>(undefined)
  const [now, setNow] = useState(0)
  if (length > 0 && since.current === undefined) {
    since.current = still ? null : Date.now()
  }
  const start = since.current ?? undefined
  useEffect(() => {
    if (start === undefined || still) {
      return
    }
    let frame = 0
    const tick = () => {
      setNow(Date.now())
      if (Date.now() - start < length) {
        frame = requestAnimationFrame(tick)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [length, start, still])
  if (start === undefined || still) {
    return Number.POSITIVE_INFINITY
  }
  return Math.max(0, Math.max(now, start) - start)
}

/**
 * The reading under a point of the plot, as shares of it: the one whose
 * drawing holds the point, front first, where the family hit-tests its
 * readings, and otherwise the one nearest it within `REACH`.
 */
export const pickOf =
  <Model>(
    kind: SpatialKind<Model>,
    model: Model,
    picture: SpatialPicture,
    frame: Frame,
    sizes: {
      readonly box: { readonly height: number; readonly width: number }
      readonly inset: number
      readonly plot: { readonly height: number; readonly width: number }
    },
  ) =>
  (point: TrackPoint): number => {
    const { box, inset, plot } = sizes
    const share = {
      x: (point.x * plot.width - inset) / Math.max(1, box.width),
      y: (point.y * plot.height - inset) / Math.max(1, box.height),
    }
    const on = { x: frame.x + share.x * frame.width, y: frame.y + share.y * frame.height }
    const hit = kind.hit?.(model, picture, on) ?? -1
    return hit >= 0 ? hit : nearestOf(picture.places, frame, box)(share)
  }

/** The room a family's drawing has: the box, its font size, how long its readings have grown, and the element's own hooks. */
export const useRoom = <Model>(
  kind: SpatialKind<Model>,
  model: Model,
  around: {
    readonly box: { readonly height: number; readonly width: number }
    readonly font: number
    readonly hooks: unknown
  },
): SpatialRoom => {
  const grown = useGrowth(kind.grows?.(model) ?? 0)
  const hooks = (
    typeof around.hooks === 'object' && around.hooks !== null ? around.hooks : {}
  ) as Readonly<Record<string, unknown>>
  return { font: around.font, grown, height: around.box.height, hooks, width: around.box.width }
}

/** No words at all, for a chart with no readings. */
export const NO_WORDS = { names: [], points: [], ticks: [], words: [] } as const

/** The box's numbers and names, and a family's own words and values, over the drawing at their shares of the frame. */
export const wordLists = (view: BoxView, marks: SpatialMarks, frame: Frame, width: number) => ({
  names: wordsAt(view, frame, width, true),
  points: wordsOver(marks.values, frame, width),
  ticks: wordsAt(view, frame, width, false),
  words: wordsOver(marks.words, frame, width),
})
