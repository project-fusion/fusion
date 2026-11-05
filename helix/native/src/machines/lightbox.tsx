/**
 * A lightbox on a phone: which item shows and how a reader moves between
 * them, the zoom, the chrome that hides while the reader is still, and what a
 * screen reader hears.
 *
 * **The items are what is passed in**, each a `LightboxItem`. The machine
 * draws them in the viewport, each told whether it is the one shown, its
 * name, its label or its place in the set in the words of `slide-label`, and
 * its role's words, as the web's root writes them on its items.
 *
 * **`active` names the item shown** by its `value`, or by its place counted
 * from 1, as the web's does. A move asks `before-activate`, which a handler
 * may refuse, then sends `activate` with the item left, and the new place is
 * said in the words of `status-label`.
 *
 * **The zoom is the pan and pinch driver's**, the items moved and scaled on
 * the UI thread inside the viewport, and a swipe at the item's own size steps
 * the way the line of text runs. The hardware keys step, go to the ends, zoom,
 * and move about a zoomed item, as the web's.
 */

import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { swipeStep } from '@fusion.dev/helix-core/swipe'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { I18nManager } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Reanimated from 'react-native-reanimated'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { kebab } from './date-picker-read'
import { useIdle } from './lightbox-idle'
import { useLightboxZoom } from './lightbox-zoom'
import { boundTo, given, tell } from './props'
import type { Turned } from './toggle'

/** The tag a lightbox item's component carries. */
const ITEM = 'helix-lightbox-item'

const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

/** An item passed in, with the value `active` names it by. */
interface Item {
  readonly element: ReactElement<Readonly<Record<string, unknown>>>
  readonly key: string
  readonly label: string
}

/** Whether `child` is a lightbox item. */
const isItem = (child: ReactNode): child is ReactElement<Readonly<Record<string, unknown>>> =>
  isValidElement(child) && (child.type as { readonly tag?: unknown }).tag === ITEM

/** The items passed in, each named by its `value`, or by its place counted from 1. */
const itemsOf = (children: unknown): readonly Item[] =>
  Children.toArray(children as ReactNode)
    .filter(isItem)
    .map((element, at) => ({
      element,
      key: wordsIn(element.props.value) || String(at + 1),
      label: wordsIn(element.props.label),
    }))

/** The place of the item `active` names, or of the first where it names none. */
const placeOf = (items: readonly Item[], active: string): number => {
  const at = items.findIndex((item) => item.key === active)
  return at === -1 ? 0 : at
}

/** The item shown, held where the page does not hold it. */
const useActive = (asked: unknown, start: string) => {
  const [own, setOwn] = useState<string | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  const held = own ?? (typeof asked === 'string' ? asked : start)
  return [held, setOwn] as const
}

/** What a step of `by` lands on: round under `loop`, held at the ends otherwise. */
const landing = (from: number, by: number, count: number, loop: boolean): number =>
  loop ? (from + by + count) % count : Math.min(Math.max(from + by, 0), count - 1)

/** A press on a control that does nothing at either end. */
const pressed = (stuck: boolean, go: () => void) => ({
  view: {
    onPress: () => {
      if (!stuck) {
        go()
      }
    },
  },
})

/** What a key does among the items: a step, or a move to an end. */
const keyMove = (key: string, rtl: boolean): number | 'first' | 'last' | undefined => {
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
  const back = rtl ? 'ArrowRight' : 'ArrowLeft'
  if (key === forward || key === 'ArrowDown') {
    return 1
  }
  if (key === back || key === 'ArrowUp') {
    return -1
  }
  return key === 'Home' ? 'first' : key === 'End' ? 'last' : undefined
}

/** The item shown, and the moves that ask for another, as the web's `requestActive`. */
const useMoves = (family: Family, props: Props, use: MachineUse, items: readonly Item[]) => {
  const read = (name: string): unknown => given(family, props, kebab(name))
  const [active, setActive] = useActive(props.active, wordsIn(read('defaultActive')))
  const at = placeOf(items, active)
  const shown = items[at]
  const loop = read('loop') === true
  const now = useRef({ at, items, loop, props, shown })
  now.current = { at, items, loop, props, shown }
  const before = boundTo(use, 'onBeforeActivate', 'event')
  const after = boundTo(use, 'onActivate', 'event')
  /* Through one request, which a handler can refuse. */
  const goTo = useCallback(
    (to: number) => {
      const latest = now.current
      const target = latest.items[to]
      if (target === undefined || target === latest.shown) {
        return
      }
      const previous = latest.shown?.key ?? ''
      if (before !== undefined && !tell(family, latest.props, before, { value: target.key })) {
        return
      }
      setActive(target.key)
      if (after !== undefined) {
        tell(family, latest.props, after, { previous, value: target.key })
      }
    },
    [after, before, family, setActive],
  )
  const step = useCallback(
    (by: number) => {
      const latest = now.current
      const count = latest.items.length
      if (count > 0) {
        goTo(landing(latest.at, by, count, latest.loop))
      }
    },
    [goTo],
  )
  /* A key's move, and whether it was one. */
  const keyed = useCallback(
    (key: string): boolean => {
      const move = keyMove(key, I18nManager.isRTL)
      if (move === 'first' || move === 'last') {
        goTo(move === 'first' ? 0 : now.current.items.length - 1)
      } else if (move !== undefined) {
        step(move)
      }
      return move !== undefined
    },
    [goTo, step],
  )
  return { at, keyed, loop, shown, step }
}

/** Says the place each time it changes and as the viewer opens, as the web's live region does. */
const useSaying = (words: string, at: number, open: boolean) => {
  const said = useRef(words)
  said.current = words
  const speaks = open && words !== ''
  useEffect(() => {
    if (speaks) {
      announce().say(said.current, 'polite')
    }
  }, [at, speaks])
}

/** The hardware keys, heard anywhere in the app while the viewer is open, on the view the viewer gives. */
const useKeys = (open: boolean, heard: (press: KeyPress) => boolean) => {
  const [view, setView] = useState<unknown>(null)
  useEffect(() => {
    if (!open || view === null) {
      return undefined
    }
    return keys().listenAnywhere(view as never, heard)
  }, [heard, open, view])
  return setView
}

/** The web element's methods, on the element's ref. */
const useHandle = (
  ref: unknown,
  toggled: Turned | undefined,
  step: (by: number) => void,
  zoomTo: (scale: number) => void,
) => {
  const turn = useRef(toggled)
  turn.current = toggled
  useImperativeHandle(
    ref as Ref<unknown> | undefined,
    () => ({
      close: () => {
        if (turn.current?.checked === true) {
          turn.current.turn()
        }
      },
      next: () => step(1),
      previous: () => step(-1),
      show: () => {
        if (turn.current?.checked === false) {
          turn.current.turn()
        }
      },
      zoomTo,
    }),
    [step, zoomTo],
  )
}

/** Each item, told whether it shows, its name, and its role's words. */
const slidesOf = (
  items: readonly Item[],
  at: number,
  slideLabel: string,
  roleLabel: string,
  lang: string,
): ReactNode[] =>
  items.map((item, place) =>
    cloneElement(item.element, {
      current: place === at,
      key: item.element.key ?? item.key,
      position:
        item.label ||
        formatMessage(
          slideLabel,
          { count: items.length, index: place + 1, label: item.label },
          lang,
        ),
      roleLabel,
    }),
  )

/** The items, moved and scaled together on the UI thread. */
const zoomed = (drawn: ReactNode, style: ReturnType<typeof useLightboxZoom>['driver']['style']) => (
  <Reanimated.View collapsable={false} style={[{ alignSelf: 'stretch', flexGrow: 1 }, style]}>
    {drawn}
  </Reanimated.View>
)

/** Hosts the lightbox. */
export const useLightbox = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
): Behavior => {
  const read = (name: string): unknown => given(family, props, kebab(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const lang = locale().read()
  const open = toggled?.checked === true
  const items = useMemo(() => itemsOf(props.children), [props.children])
  const count = items.length
  const { at, keyed, loop, shown, step } = useMoves(family, props, use, items)
  const maxZoom = Number(read('maxZoom') ?? 1) || 1
  const place =
    shown === undefined
      ? ''
      : formatMessage(
          wordsIn(read('statusLabel')),
          { count, index: at + 1, label: shown.label },
          lang,
        )
  useSaying(place, at, open)
  const idle = useIdle(Number(read('idleDelay') ?? 0) || 0, open)
  const zoom = useLightboxZoom({
    lang,
    max: maxZoom,
    open,
    said: wordsIn(read('zoomStatusLabel')),
    shown: shown?.key,
    swiped: (dx, vx, width) => {
      const by = swipeStep(dx, vx, width, I18nManager.isRTL)
      if (by !== 0) {
        step(by)
      }
    },
    touched: idle.stir,
  })
  useHandle(props.ref, toggled, step, zoom.driver.zoomTo)
  const { stir } = idle
  const { key: zoomKey, pan } = zoom
  const heard = useCallback(
    (press: KeyPress): boolean => {
      stir()
      if (press.alt || press.control || press.meta) {
        return false
      }
      return zoomKey(press.key) || pan(press.key) || keyed(press.key)
    },
    [keyed, pan, stir, zoomKey],
  )
  const setView = useKeys(open, heard)
  const slideLabel = wordsIn(read('slideLabel'))
  const roleLabel = wordsIn(read('slideRoleLabel'))
  const drawn = useMemo(
    () => slidesOf(items, at, slideLabel, roleLabel, lang),
    [at, items, lang, roleLabel, slideLabel],
  )
  const stepping = count > 1
  const atEnd = !loop && (count === 0 || at >= count - 1)
  const atStart = !loop && (count === 0 || at <= 0)
  const controls = read('controls') === true
  return {
    marks: [
      ...(idle.resting ? ['idle'] : []),
      ...(maxZoom > 1 ? ['zoomable'] : []),
      ...(zoom.scale > 1 ? ['zoomed'] : []),
    ],
    parts: {
      host: {
        states: {
          [flag('arrows')]: controls && stepping,
          [flag('atEnd')]: atEnd,
          [flag('atStart')]: atStart,
          [flag('counted')]: read('counter') === true && stepping,
          [flag('named')]: wordsIn(read('label')) || wordsIn(read('fallbackLabel')),
          [flag('place')]: place,
          [flag('zoomInOff')]: zoom.scale >= maxZoom,
          [flag('zoomOutOff')]: zoom.scale <= 1,
          [flag('zooms')]: controls && maxZoom > 1,
        },
      },
      next: pressed(atEnd, () => step(1)),
      previous: pressed(atStart, () => step(-1)),
      viewport: {
        view: { onLayout: zoom.measure, onTouchStart: stir, ref: setView },
        wrap: (view: ReactNode) => (
          <GestureDetector gesture={zoom.driver.gesture}>{view}</GestureDetector>
        ),
      },
      'zoom-in': pressed(zoom.scale >= maxZoom, zoom.zoomIn),
      'zoom-out': pressed(zoom.scale <= 1, zoom.zoomOut),
    },
    regions: { default: zoomed(drawn, zoom.driver.style) },
  }
}
