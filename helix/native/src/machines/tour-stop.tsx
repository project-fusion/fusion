/**
 * One stop of a tour, `tour-stop` on each: its place in the tour around it,
 * the words it says, and its three controls, as the web's tour writes its
 * place on each stop.
 *
 * - **It shows while it is the stop the tour is on**: `current`, `first`,
 *   and `last` hold as the tour stands, over the props the page wrote, and
 *   `shown` holds while it is current and not a `wait` stop, which its
 *   layer opens on.
 * - **Its words are the tour's where the tour has them**: Back, Next, Done
 *   on the last stop, and Skip, then the stop's own, then their registered
 *   words. Its place is the tour's `progress-label` with its index and the
 *   count, drawn while the tour has `progress`.
 * - **Its panel is named by the words passed into `heading`**, then by the
 *   first heading in its content, then by `label`, then by its place, and
 *   says its name, its content, and its place as it shows, after the tour's
 *   name on the first stop shown after the tour opens.
 * - **A press on a control sends `asks`** with `what` it asks, then the tour
 *   answers it. A close request on its layer skips the tour, and a press
 *   outside it and its target ends the tour under `outside-press="close"`.
 *   Right and Left from a hardware keyboard on its panel go on and back,
 *   turned on a right-to-left page.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { joinSaid, tourControlWord, tourWords } from '@fusion.dev/helix-core/derivations'
import {
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { direction } from '../render/styles'
import type { Family } from '../style/form'
import type { Around } from './binder'
import { boundTo, given, told } from './props'
import { placeOf } from './tour'
import { type StopMember, TourContext, type TourRun } from './tour-run'

/** A heading's level, as `as` names it on a Helix Text. */
const HEADING = /^h[1-6]$/

/** The first heading's words among several pieces of content, or none. */
const firstAmong = (pieces: readonly unknown[], depth: number): string => {
  for (const one of pieces) {
    const found = headingWords(one, depth + 1)
    if (found !== '') {
      return found
    }
  }
  return ''
}

/**
 * The words of the first heading in some content, as the web names a stop by
 * the first heading inside it: a Helix Text `as` a heading, wherever it is
 * passed in, in its element's children or a region, as a card's header.
 */
export const headingWords = (content: unknown, depth = 0): string => {
  if (depth > 8) {
    return ''
  }
  if (Array.isArray(content)) {
    return firstAmong(content, depth)
  }
  if (!isValidElement(content)) {
    return ''
  }
  const props = content.props as Readonly<Record<string, unknown>>
  return typeof props.as === 'string' && HEADING.test(props.as)
    ? tourWords(props.children)
    : firstAmong(Object.values(props), depth)
}

/** A count from a prop, or `fallback`. */
const countOf = (value: unknown, fallback: number): number => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : fallback
}

/** How many frames a stop waits for its panel to be drawn, to hear its keys. */
const FRAMES = 30

/** What a stop's props and its layer say now, as the tour reads them. */
type Latest = { readonly current: { readonly around: Around; readonly props: Props } }

/** What a stop tells the tour of itself, read from its latest props. */
const memberOf = (family: Family, use: MachineUse, latest: Latest): StopMember => {
  const read = (name: string) => given(family, latest.current.props, boundTo(use, name, 'prop'))
  return {
    effect: () => read('effect'),
    layer: () => latest.current.around.layering,
    target: () => String(read('target') ?? ''),
    type: () => {
      const type = read('type')
      return typeof type === 'string' && type !== '' ? type : undefined
    },
  }
}

/** Where a stop stands in its tour: shown, first, or last, and its place among how many. */
interface Placed {
  readonly count: number
  readonly current: boolean
  readonly first: boolean
  readonly last: boolean
  readonly order: number
  readonly tour: Props
}

/**
 * Where a stop stands in the tour around it, or as its own props say where
 * it stands in no tour.
 */
const placedIn = (
  run: TourRun | undefined,
  key: object,
  own: (name: string) => unknown,
): Placed => {
  const standing = run?.standing()
  if (run === undefined || standing === undefined) {
    return {
      count: 0,
      current: own('current') === true,
      first: own('first') === true,
      last: own('last') === true,
      order: -1,
      tour: {},
    }
  }
  const order = run.members().findIndex(([one]) => one === key)
  return {
    count: standing.count,
    current: standing.open && order === standing.at && standing.preparing !== key,
    first: order === 0,
    last: order === standing.count - 1,
    order,
    tour: standing.props,
  }
}

/**
 * The words a stop's panel is named by, and what it says as it shows: the
 * tour's name on the first stop shown after the tour opens, the panel's
 * name, its words, and its place.
 */
const saidBy = (
  props: Props,
  label: string,
  place: string,
  greeted: string,
): { readonly name: string; readonly said: string } => {
  const heading = tourWords(props.heading)
  const found = heading === '' ? headingWords(props.children) : heading
  const name = found || label || place
  const described = tourWords(props.description) || tourWords(props.children).replace(found, '')
  return { name, said: joinSaid([greeted, name === place ? '' : name, described.trim(), place]) }
}

/** The step along the line a key takes: Right on, Left back, turned on a right-to-left page. */
const stepOf = (press: KeyPress): -1 | 1 | undefined => {
  if (press.alt || press.control || press.meta) {
    return undefined
  }
  const along = direction() === 'rtl' ? -1 : 1
  if (press.key === 'ArrowRight') {
    return along
  }
  return press.key === 'ArrowLeft' ? (-along as -1 | 1) : undefined
}

/**
 * Hears Right and Left on a stop's panel while it shows, once its layer has
 * drawn it, and moves the tour along the line.
 */
const useStopKeys = (run: TourRun | undefined, shown: boolean, latest: Latest): void => {
  useEffect(() => {
    if (!shown || run === undefined) {
      return undefined
    }
    let stop: (() => void) | undefined
    let frame = 0
    const hear = (left: number) => {
      const view = latest.current.around.layering.view?.()
      if (view !== null && view !== undefined) {
        stop = keys().listen(view, (press) => {
          const step = stepOf(press)
          return step !== undefined && run.arrow(step)
        })
      } else if (left > 0) {
        frame = requestAnimationFrame(() => hear(left - 1))
      }
    }
    hear(FRAMES)
    return () => {
      cancelAnimationFrame(frame)
      stop?.()
    }
  }, [latest, run, shown])
}

/**
 * Hosts one stop of the tour around it: the states it gives its parts, and
 * the presses of its controls.
 */
export const useTourStop = (
  family: Family,
  props: Props,
  use: MachineUse,
  around: Around,
): Behavior => {
  const run = useContext(TourContext)
  const key = useRef({}).current
  const latest = useRef({ around, props })
  latest.current = { around, props }
  const member = memberOf(family, use, latest)
  /* Joined as it first draws, so a stop drawn after another reads it, and
     the tour told once it has drawn. */
  run?.join(key, member)
  useLayoutEffect(() => run?.changed(), [run])
  useLayoutEffect(() => () => run?.leave(key), [key, run])
  useSyncExternalStore(
    (changed) => run?.listen(changed) ?? (() => {}),
    () => run?.version() ?? 0,
  )
  const own = (name: string) => given(family, props, boundTo(use, name, 'prop'))
  const { count, current, first, last, order, tour } = placedIn(run, key, own)
  const shown = current && member.type() !== 'wait'
  const place = placeOf(tour, order, count)
  const word = (name: 'backLabel' | 'doneLabel' | 'nextLabel' | 'skipLabel') =>
    tourControlWord(tour, props, name)
  const greeted = run?.standing().greets === key ? String(tour.label ?? '') : ''
  const { name, said } = saidBy(props, String(own('label') ?? ''), place, greeted)
  /* A close request skips the tour, and a press outside may end it. */
  around.layering.dismiss = (by) => run?.dismiss(by) ?? false
  const ask = (what: 'back' | 'next' | 'skip') => {
    const asks = boundTo(use, 'asks', 'event')
    const heard =
      asks === undefined ? undefined : told(family, latest.current.props, asks, { what })
    run?.ask(what, heard)
  }
  useStopKeys(run, shown, latest)
  const named = (name: string, fallback: string) => boundTo(use, name, 'state') ?? fallback
  const written = (name: string) => String(boundTo(use, name, 'prop') ?? name)
  const words = named('words', 'words')
  const presses = (what: 'back' | 'next' | 'skip') => ({
    view: { onPress: () => ask(what) },
  })
  return {
    marks: [],
    parts: {
      host: {
        states: {
          [written('current')]: current,
          [written('first')]: first,
          [written('last')]: last,
          [named('counted', 'counted')]: tour.progress === true && place !== '',
          [named('name', 'name')]: name,
          [named('place', 'place')]: place,
          [named('reach', 'reach')]: countOf(tour.spotlightPadding, 8),
          [named('said', 'said')]: said,
          [named('shown', 'shown')]: shown,
          [`back-${words}`]: word('backLabel'),
          [`next-${words}`]: last ? word('doneLabel') : word('nextLabel'),
          [`skip-${words}`]: word('skipLabel'),
        } as Record<string, boolean | string>,
      },
      [boundTo(use, 'back', 'part') ?? 'back']: presses('back'),
      [boundTo(use, 'next', 'part') ?? 'next']: presses('next'),
      [boundTo(use, 'skip', 'part') ?? 'skip']: presses('skip'),
    },
  }
}
