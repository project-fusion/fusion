/**
 * The machine a carousel runs on a phone: the index and how it moves, the panes
 * and the stops core counts, its rotation, and where its chrome stands.
 *
 * **The track pages by `usePaging`**, and a swipe's rest asks for the index
 * through the same request as a press of Next. A refusal puts the track back.
 *
 * **Its chrome stands absolutely, since a phone's grid has no cells that
 * overlap**, and the dots and the arrows share a cell on the web. Each group is
 * measured, and the host is padded by what each edge holds, which is how tall a
 * shared row is on the web.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'
import {
  acrossOf,
  fittedAcross,
  paneLength,
  positionsOf,
  stepStop,
  stopFor,
  stopsOf,
} from '@fusion.dev/helix-core/carousel'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  Children,
  isValidElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { I18nManager, type LayoutChangeEvent } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import { motionPaused, onMotionChange, useReducedMotion } from '../render/motion'
import type { Family } from '../style/form'
import type { Style } from '../style/resolved'
import { useTheme } from '../theme/theme'
import { useResolve } from './indicator'
import { type Paging, usePaging } from './paging'
import { boundTo, given, tell } from './props'

/** Which side of the slides a group of chrome stands on. */
type Side = 'bottom' | 'end' | 'overlay' | 'start' | 'top'

/** A box as it was laid out. */
interface Size {
  readonly height: number
  readonly width: number
}

const NONE: Size = { height: 0, width: 0 }

const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

/** A time as the web's `interval` takes it: milliseconds, or a CSS time. */
const millisecondsOf = (value: unknown): number => {
  const written = /^([\d.]+)(ms|s)?$/i.exec(String(value).trim())
  const read = written === null ? Number.NaN : Number(written[1])
  if (!Number.isFinite(read)) {
    return 5000
  }
  return written?.[2]?.toLowerCase() === 's' ? read * 1000 : read
}

/** A length a `style` sets on the host, in points, or nothing. */
const pointsIn = (value: unknown, rem: number): number | undefined => {
  if (typeof value === 'number') {
    return value
  }
  const written = /^([\d.]+)(px|rem)?$/.exec(String(value ?? '').trim())
  if (written === null) {
    return undefined
  }
  return Number(written[1]) * (written[2] === 'rem' ? rem : 1)
}

/** The first number of a style's keys. */
const numberOf = (style: Style, ...names: readonly string[]): number => {
  for (const name of names) {
    const value = style[name]
    if (typeof value === 'number') {
      return value
    }
  }
  return 0
}

/** The slides passed in: every child that goes in no region of its own. */
const slidesOf = (children: unknown): readonly ReactNode[] =>
  Children.toArray(children as ReactNode).filter(
    (child) =>
      !isValidElement(child) || (child.props as { readonly slot?: unknown }).slot === undefined,
  )

/**
 * Where the rotation control stands among the arrows. The web's overlay moves it
 * after them by `order`, and a phone stands it there in the tree.
 */
const rotationPlaces = (flag: (name: string) => string, autoplay: boolean, overlaid: boolean) => ({
  [flag('rotationFirst')]: autoplay && !overlaid,
  [flag('rotationLast')]: autoplay && overlaid,
})

/** Where a group of chrome stands in the host, given what each edge is padded by. */
const insetOf = (
  side: Side,
  over: 'controls' | 'indicators',
  top: number,
  bottom: number,
): Readonly<Record<string, number>> => {
  switch (side) {
    /* As tall as the row it shares, as a grid item stretches, so a shorter group centers in it. */
    case 'top':
      return { minHeight: top, top: 0 }
    case 'bottom':
      return { bottom: 0, minHeight: bottom }
    case 'overlay':
      return over === 'controls'
        ? { bottom, end: 0, start: 0, top, zIndex: 1 }
        : { bottom, zIndex: 1 }
    default:
      return { bottom, [side]: 0, top }
  }
}

/** What the host is padded by, for what each edge holds. */
const paddingsOf = (
  groups: readonly (readonly [side: Side, size: Size])[],
): {
  readonly bottom: number
  readonly end: number
  readonly start: number
  readonly top: number
} => {
  const longest = (edge: Side, read: (size: Size) => number): number =>
    Math.max(0, ...groups.filter(([side]) => side === edge).map(([, size]) => read(size)))
  return {
    bottom: longest('bottom', (size) => size.height),
    end: longest('end', (size) => size.width),
    start: longest('start', (size) => size.width),
    top: longest('top', (size) => size.height),
  }
}

/** A box's size as its layout reports it, keeping the last where it has not moved. */
const useLaid = (): readonly [Size, (event: LayoutChangeEvent) => void] => {
  const [size, setSize] = useState(NONE)
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout
    setSize((was) => (was.height === height && was.width === width ? was : { height, width }))
  }, [])
  return [size, onLayout]
}

/** The index: what `index` last said, what a move last set, or where it starts. */
const useIndex = (asked: unknown, start: number) => {
  const [own, setOwn] = useState<number | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(typeof asked === 'number' ? asked : undefined)
  }
  const held = own ?? (typeof asked === 'number' ? asked : start)
  return [Number.isFinite(held) ? held : 0, setOwn] as const
}

/**
 * The rotation: whether it runs, and what stops and starts it. **A reader's stop
 * stays**, where a pause lifts as the page lets its motion run again.
 */
const useRotation = (autoplay: boolean, interval: number, step: () => void, slides: number) => {
  const reduced = useReducedMotion()
  const [rotating, setRotating] = useState(autoplay && !reduced && !motionPaused())
  const stopped = useRef(false)
  const stepping = useRef(step)
  stepping.current = step
  useEffect(() => {
    if (!rotating || slides < 2) {
      return undefined
    }
    let wait = timers().timeout(interval, function again() {
      stepping.current()
      wait = timers().timeout(interval, again)
    })
    return () => wait()
  }, [interval, rotating, slides])
  useEffect(
    () =>
      onMotionChange((paused) => {
        if (paused) {
          setRotating(false)
        } else if (autoplay && !stopped.current) {
          setRotating(true)
        }
      }),
    [autoplay],
  )
  const pause = useCallback(() => {
    if (!stopped.current) {
      setRotating(false)
    }
  }, [])
  const toggle = useCallback(() => {
    setRotating((was) => {
      stopped.current = was
      return !was
    })
  }, [])
  return { pause, rotating, toggle }
}

/** What the arrows and the dots hear from a hardware keyboard, as a move to a place. */
const stepOfKey = (key: string, vertical: boolean): -1 | 0 | 1 => {
  if (vertical) {
    return key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
  }
  const forward = I18nManager.isRTL ? 'ArrowLeft' : 'ArrowRight'
  const back = I18nManager.isRTL ? 'ArrowRight' : 'ArrowLeft'
  return key === forward ? 1 : key === back ? -1 : 0
}

/** Where a key on a dot lands, or nothing for a key that moves nothing. */
const landingOf = (
  key: string,
  vertical: boolean,
  last: number,
  move: (step: -1 | 1) => number,
): number | undefined => {
  if (key === 'Home') {
    return 0
  }
  if (key === 'End') {
    return last
  }
  const step = stepOfKey(key, vertical)
  return step === 0 ? undefined : move(step)
}

/**
 * The ref each dot takes, the same one for a place across renders, since a ref a
 * binding is given runs with no cleanup. A key it hears asks `heard` where it
 * lands, and focus follows there.
 */
const useDotKeys = (heard: (key: string) => number | undefined) => {
  const nodes = useRef(new Map<number, unknown>())
  const stops = useRef(new Map<number, Stop>())
  const refs = useRef(new Map<number, (view: unknown) => void>())
  const latest = useRef(heard)
  latest.current = heard
  return useCallback((at: number) => {
    const held = refs.current.get(at)
    if (held !== undefined) {
      return held
    }
    const made = (view: unknown): void => {
      stops.current.get(at)?.()
      stops.current.delete(at)
      nodes.current.delete(at)
      if (view === null) {
        return
      }
      nodes.current.set(at, view)
      const stop = keys().listen(view as never, (pressed) => {
        const landed = latest.current(pressed.key)
        if (landed === undefined) {
          return false
        }
        const node = nodes.current.get(landed)
        if (node !== undefined) {
          focus().focus(node as never, false)
        }
        return true
      })
      stops.current.set(at, stop)
    }
    refs.current.set(at, made)
    return made
  }, [])
}

/** The track's lengths and how many panes go across it. */
const useTrack = (
  family: Family,
  props: Props,
  perView: unknown,
  vertical: boolean,
  slides: number,
) => {
  const { rem } = useTheme()
  const { resolve } = useResolve(family, props)
  const [frame, onLayout] = useLaid()
  const { style } = resolve('track')
  const gap = numberOf(style, 'columnGap', 'gap')
  const bleed = vertical
    ? numberOf(style, 'paddingVertical', 'paddingTop')
    : numberOf(style, 'paddingHorizontal', 'paddingStart')
  const room = (vertical ? frame.height : frame.width) - 2 * bleed
  const hooks = props.style as Readonly<Record<string, unknown>> | undefined
  const least = pointsIn(hooks?.['--carousel-slide-min'], rem)
  const fits = perView === 'auto' && !vertical
  const across = fits
    ? least === undefined
      ? 1
      : fittedAcross(room, gap, least)
    : acrossOf(typeof perView === 'string' ? Number(perView) : perView)
  /* A fitted track holding fewer than it fits shares itself among them. */
  const sharedBy = fits ? Math.max(1, Math.min(across, slides)) : across
  const pane = room > 0 ? paneLength(room, gap, sharedBy) : undefined
  return { across, measured: room > 0 || !fits, onLayout, pane }
}

/** The track follows a place, whoever moved it, and at once where it has only been laid out. */
const useFollowing = (paging: Paging, place: number): void => {
  const followed = useRef<{ offsets: string; place: number } | undefined>(undefined)
  const laidOut = paging.offsets.join()
  useEffect(() => {
    if (paging.offsets.length === 0) {
      return
    }
    const was = followed.current
    followed.current = { offsets: laidOut, place }
    if (was?.place !== place || was.offsets !== laidOut) {
      paging.go(place, was === undefined || was.place === place)
    }
  }, [laidOut, paging, place])
}

/** Whether each arrow has nowhere to go: only at an end, and without `loop`. */
const endsOf = (loop: boolean, count: number, index: number, positions: number) => ({
  atEnd: !loop && count > 1 && index >= positions - 1,
  atStart: !loop && count > 1 && index <= 0,
})

/** What an arrow's view takes: a press that moves unless it has nowhere to go. */
const arrow = (stuck: boolean, go: () => void) => ({
  view: {
    onPress: () => {
      if (!stuck) {
        go()
      }
    },
  },
})

/** A pane's length, once the track has been measured. */
const paneStyle = (pane: number | undefined, vertical: boolean) => {
  if (pane === undefined) {
    return {}
  }
  return { style: vertical ? { height: pane } : { width: pane } }
}

/** Which side a group of chrome stands on: what it asks, or the side a track's axis gives it. */
const sideOf = (asked: unknown, vertical: boolean): Side => {
  if (typeof asked === 'string') {
    return asked as Side
  }
  return vertical ? 'end' : 'bottom'
}

/**
 * Where the chrome stands, and what the host is padded by. A row hidden by its
 * rule reports no layout, so it holds no room.
 */
const useChrome = (props: Props, vertical: boolean, controlsDrawn: boolean, dotted: boolean) => {
  const controlsSide = sideOf(props.controlsPlacement, vertical)
  const indicatorsSide = sideOf(props.indicatorPlacement, vertical)
  const [controlsSize, controlsLaid] = useLaid()
  const [dotsSize, dotsLaid] = useLaid()
  const pads = paddingsOf([
    [controlsSide, controlsDrawn ? controlsSize : NONE],
    [indicatorsSide, dotted ? dotsSize : NONE],
  ])
  return {
    controls: {
      view: {
        onLayout: controlsLaid,
        pointerEvents: controlsSide === 'overlay' ? 'box-none' : 'auto',
        style: insetOf(controlsSide, 'controls', pads.top, pads.bottom),
      },
    },
    indicators: {
      view: {
        onLayout: dotsLaid,
        style: insetOf(indicatorsSide, 'indicators', pads.top, pads.bottom),
      },
    },
    overlaid: controlsSide === 'overlay',
    padding: {
      paddingBottom: pads.bottom,
      paddingEnd: pads.end,
      paddingStart: pads.start,
      paddingTop: pads.top,
    },
  }
}

/** Hosts the carousel. */
export const useCarousel = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? name
  const lang = locale().read()
  const vertical = read('orientation') === 'vertical'
  const slides = useMemo(() => slidesOf(props.children), [props.children])
  const count = slides.length
  const track = useTrack(family, props, read('perView'), vertical, count)
  const positions = positionsOf(count, track.across)
  const perMove = Number(read('slidesPerMove') ?? 1)
  const stops = useMemo(() => stopsOf(positions, perMove), [perMove, positions])
  const [held, setIndex] = useIndex(props.index, Number(read('defaultIndex') ?? 0))
  const index = count > 0 ? Math.min(held, positions - 1) : held
  const loop = read('loop') === true
  const said = useRef(false)
  const label = wordsIn(read('label'))
  const named = label || wordsIn(read('fallbackLabel'))
  const slideLabel = wordsIn(read('slideLabel'))
  const nameOf = useCallback(
    (at: number) => formatMessage(slideLabel, { count, index: at + 1 }, lang),
    [count, lang, slideLabel],
  )

  const now = useRef({ count, index, loop, positions, props, stops })
  now.current = { count, index, loop, positions, props, stops }
  const before = boundTo(use, 'onBeforeActivate', 'event')
  const after = boundTo(use, 'onActivate', 'event')

  /* Through one request, which a handler can refuse, as the web's `goTo`. */
  const request = useCallback(
    (next: number): boolean => {
      const value = String(next)
      const latest = now.current.props
      if (before !== undefined && !tell(family, latest, before, { value })) {
        return false
      }
      said.current = true
      setIndex(next)
      if (after !== undefined) {
        tell(family, latest, after, { value })
      }
      return true
    },
    [after, before, family, setIndex],
  )
  const goTo = useCallback(
    (asked: number) => {
      const latest = now.current
      if (latest.count === 0) {
        return
      }
      const places = latest.positions
      const next = latest.loop
        ? (asked + places) % places
        : Math.min(Math.max(asked, 0), places - 1)
      if (next !== latest.index) {
        request(next)
      }
    },
    [request],
  )
  const move = useCallback((step: -1 | 1) => {
    const latest = now.current
    return stepStop(latest.stops, latest.index, step, latest.loop)
  }, [])

  const autoplay = read('autoplay') === true
  const rotation = useRotation(
    autoplay,
    millisecondsOf(read('interval')),
    () => {
      const latest = now.current
      goTo(latest.index >= latest.positions - 1 ? 0 : move(1))
    },
    count,
  )

  /* The dot a swipe stands nearest, until it comes to rest. */
  const [showing, setShowing] = useState<number | undefined>(undefined)
  const pick = useCallback(
    (every: readonly number[]) =>
      stops.map((stop) => every[stop]).filter((one): one is number => one !== undefined),
    [stops],
  )
  const goBack = useRef<() => void>(() => undefined)
  const paging = usePaging({
    axis: vertical ? 'y' : 'x',
    onMove: setShowing,
    onRest: (place) => {
      setShowing(undefined)
      const next = now.current.stops[place]
      if (next !== undefined && next !== now.current.index && !request(next)) {
        goBack.current()
      }
    },
    pick,
  })
  const place = stopFor(stops, index)
  goBack.current = () => paging.go(place)

  useFollowing(paging, place)

  /* What a move lands on is said, and nothing while the carousel rotates. */
  useEffect(() => {
    if (said.current && !rotation.rotating) {
      announce().say(nameOf(index), 'polite')
    }
    said.current = false
  }, [index, nameOf, rotation.rotating])

  useImperativeHandle(
    props.ref as Ref<unknown> | undefined,
    () => ({
      goTo,
      get index() {
        return now.current.index
      },
      set index(next: number) {
        setIndex(next)
      },
      get positions() {
        return now.current.positions
      },
    }),
    [goTo, setIndex],
  )

  const controls = read('controls')
  const arrows = controls !== 'none'
  const { atEnd, atStart } = endsOf(loop, count, index, positions)
  const dotted = count > 1 && track.measured
  const rotating = rotation.rotating
  const chrome = useChrome(props, vertical, controls === 'always' || autoplay, dotted)
  const panes = useMemo(
    () =>
      slides.map((slide, at) => ({
        key: isValidElement(slide) && slide.key !== null ? String(slide.key) : String(at),
        label: nameOf(at),
        slide,
      })),
    [nameOf, slides],
  )
  const shown = stopFor(stops, showing === undefined ? index : (stops[showing] ?? index))
  const indicatorLabel = wordsIn(read('indicatorLabel'))
  const dots = useMemo(
    () =>
      stops.map((stop, at) => ({
        current: at === shown,
        key: String(stop),
        label: formatMessage(indicatorLabel, { index: at + 1 }, lang),
        stop,
      })),
    [indicatorLabel, lang, shown, stops],
  )
  const pane = track.pane
  const dotRef = useDotKeys((asked) => {
    const latest = now.current
    const to = landingOf(asked, vertical, latest.positions - 1, move)
    if (to === undefined) {
      return undefined
    }
    goTo(to)
    return stopFor(latest.stops, to)
  })
  const copyOfDot = useCallback(
    (item: Entry) => ({
      focusable: item.index === stopFor(now.current.stops, now.current.index),
      onPress: () => goTo(Number(item.fields.stop)),
      ref: dotRef(item.index),
    }),
    [dotRef, goTo],
  )
  return {
    marks: [],
    parts: {
      controls: chrome.controls,
      dots: { lists: { [flag('stops')]: dots } },
      host: {
        lists: { [flag('panes')]: panes, [flag('stops')]: dots },
        states: {
          [flag('arrows')]: arrows,
          [flag('atEnd')]: atEnd,
          [flag('atStart')]: atStart,
          [flag('dotsName')]: formatMessage(
            wordsIn(read('indicatorsLabel')),
            { label: named },
            lang,
          ),
          [flag('dotted')]: dotted,
          [flag('named')]: named,
          [flag('rotationIcon')]: rotating ? 'stop' : 'play',
          [flag('rotationName')]: wordsIn(read(rotating ? 'stopLabel' : 'startLabel')),
          ...rotationPlaces(flag, autoplay, chrome.overlaid),
        },
        view: {
          accessibilityLabel: [named, wordsIn(read('roleLabel'))].filter(Boolean).join(', '),
          onTouchStart: rotation.pause,
          style: chrome.padding,
        },
      },
      indicator: { copy: copyOfDot },
      indicators: chrome.indicators,
      next: arrow(atEnd, () => goTo(move(1))),
      previous: arrow(atStart, () => goTo(move(-1))),
      rotation: { view: { onPress: rotation.toggle } },
      slide: { copy: () => paneStyle(pane, vertical) },
      track: { view: { ...paging.view, onLayout: track.onLayout } },
    },
  }
}
