import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { motion } from '@fusion.dev/helix-core/capabilities/motion'
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Stop, Transition } from '@fusion.dev/helix-core/capabilities/types'
import { frameOf } from '@fusion.dev/helix-core/machines/reorder/glide'
import {
  type ReorderHost,
  type ReorderParts,
  type ReorderWords,
  reorderHost,
} from '@fusion.dev/helix-core/machines/reorder/host'
import type { ReorderInput, ReorderSpan } from '@fusion.dev/helix-core/machines/reorder/machine'
import * as reorder from '@fusion.dev/helix-core/machines/reorder/reorder.generated'
import type { ReorderAxis } from '@fusion.dev/helix-core/reorder'
import type { HostInstance } from 'react-native'
import { observeScrolled, scrollViewAbove } from '../capabilities/scroll'
import { shiftDrag } from '../drivers/gesture'
import type { Props } from '../render/behavior'
import { direction } from '../render/styles'
import type { Family } from '../style/form'
import type { Member } from './collection'
import { given } from './props'

/*
 * What a set that moves its items holds beside its machine: the views each
 * item draws, the drag it hears on each, and the core host whose parts read
 * them. The set's hook is in `reorder.ts` and each item's in
 * `reorder-item.tsx`: the three are one binder split at the 400 lines a file
 * may have.
 */

/** The views an item draws for a move, each `null` until it is drawn. */
export interface ReorderViews {
  /** The view a pointer drags, which follows the pointer: the one drawn with the gesture driver. */
  readonly drag: () => HostInstance | null
  /** The grip, which takes focus back after a move from the keys. */
  readonly grip: () => HostInstance | null
  /** The view that glides: on to its new place, back to its own, or aside to make room. */
  readonly item: () => HostInstance | null
  /** The view the layout places and nothing moves, whose box is the item's place. */
  readonly slot: () => HostInstance | null
}

/** What the set's host reads, as its latest render has it. */
export interface Latest {
  /** Whether items may move: the set's `reorderable`. */
  readonly enabled: boolean
  /** The key of each item, in the order drawn. */
  readonly keys: readonly string[]
  /** The items, in the same order. */
  readonly members: readonly Member[]
  readonly props: Props
  /** How a glide runs. */
  readonly transition: Transition
  /** The set's value, as its selection holds it, which an event's `target` carries. */
  readonly value: string
  readonly words: ReorderWords
}

/** Sends an event to the set's machine. */
export type Send = (event: number, input: ReorderInput) => void

/** What the set holds for its items' moves, made once for its life. */
export interface Moves {
  /** Stops hearing every item and every scroll, and lets the page scroll, as the set unmounts. */
  readonly dispose: () => void
  /** Holds the views the item with `key` draws, until stopped. */
  readonly hold: (key: string, views: ReorderViews) => Stop
  readonly host: ReorderHost<HostInstance>
  /**
   * Hears each item's drag again from where the items are drawn now, or
   * once the pointer down lets go.
   */
  readonly hearAll: () => void
  /** Hears each item's drag again at the next frame, as an item is laid out or the page scrolls. */
  readonly moved: () => void
  /** The views the item with `key` draws, once it has drawn them. */
  readonly views: (key: string) => ReorderViews | undefined
}

/**
 * The axis the items run along. The form names none yet, and every family
 * that binds reorder runs its items down the page.
 */
export const AXIS: ReorderAxis = 'block'

/** The key an item moves by: its value, or its words where it has none, as the web list reads a row. */
export const keyOf = (item: { readonly value: string; readonly words: string }): string =>
  item.value || item.words

/** The set as every event carries it. */
export const setOf = (latest: Latest) => ({
  all: latest.keys,
  axis: AXIS,
  enabled: latest.enabled,
  keys: latest.keys,
  rtl: direction() === 'rtl',
})

/** What an event about the item with `key` carries where no pointer sent it. */
export const inputOf = (
  latest: Latest,
  key: string,
  fields: Partial<ReorderInput> = {},
): ReorderInput => ({
  ...setOf(latest),
  at: Number.NaN,
  end: 0,
  key,
  keyName: '',
  pointer: 0,
  spans: [],
  start: 0,
  token: 0,
  x: 0,
  y: 0,
  ...fields,
})

/** A view's extent along the axis, in screen coordinates, or `undefined` before it is laid out. */
export const spanOf = (node: HostInstance | null | undefined): ReorderSpan | undefined => {
  const box = node ? measure().box(node) : null
  if (box === null) {
    return undefined
  }
  return AXIS === 'block'
    ? { end: box.y + box.height, start: box.y }
    : { end: box.x + box.width, start: box.x }
}

/** The words a screen reader hears, from the set's props the form names. */
export const wordsOf = (family: Family, props: Props): ReorderWords => {
  const named = family.api?.collection?.reorder
  const said = (name: string | undefined): string => {
    const value = given(family, props, name)
    return typeof value === 'string' ? value : ''
  }
  return {
    canceled: said(named?.canceled),
    dropped: said(named?.dropped),
    moved: said(named?.moved),
    pickedUp: said(named?.picked),
  }
}

/** The name of the item with `key`: its words, or its key where it has none. */
const nameOf = (latest: Latest, key: string): string =>
  latest.members[latest.keys.indexOf(key)]?.words || key

/** Whether the set lets the item with `key` move: items may move, and it is not disabled. */
export const movable = (latest: Latest, key: string): boolean => {
  const member = latest.members[latest.keys.indexOf(key)]
  return latest.enabled && member !== undefined && !member.disabled
}

/**
 * Makes what the set holds for its items' moves: the core host, with parts
 * that read `latest` and the views each item holds, and the drag it hears on
 * each item.
 *
 * **The set hears every item**, once they are drawn and again whenever their
 * places may have changed: the order or the items change, one is laid out
 * again, or the page scrolls. A drag tells a pass at the places the items
 * stood as it was heard, so items heard before a scroll would be heard at
 * places they have left. Each hearing measures every item once, and at most
 * one runs a frame.
 *
 * **While a press is down, only its item is heard again**, so the pointer
 * passes the others where an edge scroll has moved them. The gesture driver
 * carries the press on into the later drag, and the hearing it replaces
 * stops once the press lets go. The other items wait for that, since
 * hearing an item again from the start lets go of a pointer it heard.
 *
 * **A press holds the page still** through the scroll capability, as
 * `touch-action: none` on a grip does on the web, until it lets go.
 *
 * **A dragged item follows the scroll as well as the pointer.** Each frame
 * of an edge scroll tells the gesture driver how far the page has scrolled
 * since the press, which the core host counts in where the item is let go.
 *
 * **A dropped item stays where the pointer let it go.** The gesture driver
 * puts the item back at its place as it tells the drop, and the core host
 * glides it on from where it was let go only once React has drawn the move,
 * a turn later, so the set places it there in the driver's turn.
 */
export const movesOf = (latest: { readonly current: Latest }, send: { current: Send }): Moves => {
  const held = new Map<string, ReorderViews>()
  const hearing = new Map<string, Stop>()
  /* The scroll view the items are drawn in, looked for again at each hearing. */
  let scroller: HostInstance | null = null
  let watching: Stop | null = null
  let waiting: Stop | null = null
  /* A pointer is down on an item, from its press until it lets go, and the
     item's key. */
  let pressing = false
  let pressed = ''
  /* The hearings of the pressed item that a hearing during the press
     replaced, stopped once it lets go. */
  const outlived: Stop[] = []
  /* A hearing the press put off. */
  let stale = false
  let still: Stop | null = null
  /* Where the pointer went down along the axis, how far the page was
     scrolled then, and whether the machine lifted the item it pressed. */
  let pressAt = 0
  let from = 0
  let lifted = false
  /* Each item's extent, measured once while every item is heard. */
  let measured: ReadonlyMap<string, ReorderSpan | undefined> | null = null

  const offset = (): number => {
    const at = scroller === null ? { x: 0, y: 0 } : scroll().offset(scroller)
    return AXIS === 'block' ? at.y : at.x
  }

  const moved = (): void => {
    waiting ??= timers().frame(() => {
      waiting = null
      hearAll()
    })
  }

  const watch = (): void => {
    const slot = [...held.values()].map((one) => one.slot()).find((node) => node !== null)
    const found = slot ? scrollViewAbove(slot) : null
    if (found !== scroller) {
      watching?.()
      watching = found === null ? null : observeScrolled(found, moved)
      scroller = found
    }
  }

  const quiet = (): void => {
    for (const stop of hearing.values()) {
      stop()
    }
    hearing.clear()
  }

  const hearOne = (key: string): void => {
    const node = held.get(key)?.drag() ?? null
    if (node !== null && movable(latest.current, key)) {
      hearing.set(key, host.hear(key, node))
    }
  }

  const hearAll = (): void => {
    waiting?.()
    waiting = null
    stale = pressing
    if (!pressing) {
      quiet()
      watch()
    }
    const { keys } = latest.current
    measured = new Map(keys.map((key) => [key, spanOf(held.get(key)?.slot())]))
    const was = pressing ? hearing.get(pressed) : undefined
    if (was !== undefined) {
      outlived.push(was)
      hearing.delete(pressed)
    }
    for (const key of pressing ? [pressed] : keys) {
      hearOne(key)
    }
    measured = null
  }

  /** Notes a press down, and lets go of it, around the events that start and end it. */
  const noted = (event: number, input: ReorderInput): void => {
    if (event === reorder.EVENT_PRESS) {
      pressing = true
      pressed = input.key
      pressAt = input.at
      from = offset()
      lifted = false
      const node = held.get(input.key)?.drag() ?? null
      still = node === null ? null : scroll().lock(node)
    } else if (event === reorder.EVENT_RELEASE || event === reorder.EVENT_CANCEL) {
      dropped(input)
      letGo()
    }
  }

  /* Places a lifted item where the pointer let it go, as far as the core
     host measures its glide from, in the turn the gesture driver puts it
     back at its place. */
  const dropped = (input: ReorderInput): void => {
    const node = lifted ? (held.get(input.key)?.item() ?? null) : null
    lifted = false
    if (node !== null) {
      motion().place(node, frameOf(AXIS, input.at - pressAt + offset() - from))
    }
  }

  const letGo = (): void => {
    pressing = false
    still?.()
    still = null
    for (const stop of outlived.splice(0)) {
      stop()
    }
    if (stale) {
      moved()
    }
  }

  const parts: ReorderParts<HostInstance> = {
    grip: (key) => held.get(key)?.grip() ?? undefined,
    item: (key) => held.get(key)?.item() ?? undefined,
    locale: () => locale().read(),
    name: (key) => nameOf(latest.current, key),
    scroller: () => {
      const box = scroller === null ? null : measure().box(scroller)
      if (scroller === null || box === null) {
        return null
      }
      const block = AXIS === 'block'
      return block
        ? { end: box.y + box.height, node: scroller, start: box.y }
        : { end: box.x + box.width, node: scroller, start: box.x }
    },
    send: (event, input) => {
      noted(event, input)
      send.current(event, input)
    },
    set: () => setOf(latest.current),
    span: (key) => (measured?.has(key) ? measured.get(key) : spanOf(held.get(key)?.slot())),
    transition: () => latest.current.transition,
    words: () => latest.current.words,
  }
  const core = reorderHost(parts)
  const host: ReorderHost<HostInstance> = {
    ...core,
    perform: {
      ...core.perform,
      lift: (context, argument, input) => {
        lifted = true
        core.perform.lift(context, argument, input)
      },
      scroll: (context, argument, input) => {
        core.perform.scroll(context, argument, input)
        const node = held.get(context.key)?.drag() ?? null
        if (node !== null) {
          shiftDrag(node, offset() - from)
        }
      },
      /* **A drag that stops is heard again from the start.** Its hearing is
         stopped and the items are heard anew, so the gesture driver lets go
         of the pan and puts the item back. */
      untrack: (context, argument, input) => {
        core.perform.untrack(context, argument, input)
        hearing.get(context.key)?.()
        hearing.delete(context.key)
        moved()
        letGo()
      },
    },
  }

  return {
    /* A press it lets go of leaves no hearing to put off. */
    dispose: () => {
      stale = false
      quiet()
      waiting?.()
      waiting = null
      watching?.()
      watching = null
      scroller = null
      letGo()
    },
    hearAll,
    hold: (key, views) => {
      held.set(key, views)
      moved()
      return () => {
        if (held.get(key) === views) {
          held.delete(key)
          hearing.get(key)?.()
          hearing.delete(key)
        }
      }
    },
    host,
    moved,
    views: (key) => held.get(key),
  }
}

/** Puts the item a pointer dropped at rest, once the page draws it at its new place. */
export const rest = (moves: Moves, key: string): void => {
  const node = moves.views(key)?.item() ?? null
  if (node !== null) {
    motion().place(node, { x: 0, y: 0 })
  }
}
