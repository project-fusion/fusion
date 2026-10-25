import { announce } from '../../capabilities/announce/index.js'
import { focus } from '../../capabilities/focus/index.js'
import { gesture } from '../../capabilities/gesture/index.js'
import { haptics } from '../../capabilities/haptics/index.js'
import { keys } from '../../capabilities/keys/index.js'
import { motion } from '../../capabilities/motion/index.js'
import { scroll } from '../../capabilities/scroll/index.js'
import { timers } from '../../capabilities/timers/index.js'
import type {
  Dragged,
  DragSetup,
  Haptic,
  KeyPress,
  Stop,
} from '../../capabilities/types.generated.js'
import { formatMessage } from '../../words/message.js'
import type { Host, Performed } from '../runner.js'
import { SLOP } from './context.js'
import { frameOf, type Glide, type LetGo, landingOf } from './glide.js'
import { drawn, type ReorderContext, type ReorderInput, type ReorderSpan } from './machine.js'
import type { ReorderParts, ReorderWords } from './parts.js'
import * as compiled from './reorder.generated.js'
import { stopsOf } from './stops.js'

export type { ReorderParts, ReorderScroller, ReorderSet, ReorderWords } from './parts.js'

/** The effects a host performs for a reorder. */
export type ReorderEffect = Performed<typeof compiled>

/** What a reorder's effects do, and the drag a family hears on each item. */
export interface ReorderHost<N> extends Host<ReorderContext, ReorderEffect, ReorderInput> {
  /**
   * Hears a pointer drag the item with `key` on `node` through the gesture
   * capability, until stopped, and sends each moment on as an event: `PRESS`
   * as a pointer goes down, `DRAG` as it lifts the item and as it passes
   * another item's middle, and `RELEASE` or `CANCEL` as it lets go or the
   * system takes it. `node` is the part the platform's drag is heard on: the
   * grip on the web, and the item drawn with the gesture driver on a native
   * host, where the item follows the pointer.
   *
   * **A family hears each item for as long as items may move**, from before a
   * pointer goes down, since a drag hears only a pointer it heard go down. No
   * effect of the machine starts or stops it. A pass is told at the other
   * items' middles as they are drawn when this is called, and at lines through
   * the scroller's edge zones, so a family hears an item again once the items'
   * places change. The gesture capability carries a press on into a later
   * drag of the same part, so a family hears the held item again during the
   * press, and the press goes on and passes the new stops.
   *
   * **One press at a time reaches the machine**: the first to go down, until
   * it lets go, the system takes it, or the move that holds it lets go of it.
   * The host measures where an item is let go from that press, so a second
   * pointer sends nothing. The host numbers each press from 1, and every event
   * about it carries the number as `pointer`, which the machine checks.
   */
  readonly hear: (key: string, node: N) => Stop
}

/**
 * A pointer down on an item: the number the host gave it, where it went down
 * along the axis, and the last moment told of it.
 */
interface Press {
  readonly at: number
  /** The number every event about it carries as `pointer`, counting from 1. */
  readonly id: number
  readonly key: string
  last: Dragged
  /** Where it let the item go, measured as it ended, before the page could draw a move. */
  letGo: LetGo | null
  /** How far the scroller was scrolled along the axis as the pointer went down. */
  readonly scrolled: number
}

/** The touch each of the words is also given as, on a device that plays one. */
const TOUCHES: Readonly<Record<keyof ReorderWords, Haptic>> = {
  canceled: 'cancel',
  dropped: 'drop',
  moved: 'pass',
  pickedUp: 'lift',
}

/** Where a moment of `one` puts the pointer, as the events about the press carry it. */
const pointed = (one: Press, moment: Dragged): Partial<ReorderInput> => ({
  at: moment.at,
  pointer: one.id,
  x: moment.x,
  y: moment.y,
})

/**
 * What a reorder's effects do, on any platform.
 *
 * - `untrack` lets go of the press the move held, which it finds by the
 *   number the context keeps: no moment of it reaches the machine after.
 *   It ends the frame the drag waits for, and keeps where the press let the
 *   item go for the glide that follows.
 * - `listen` hears the keys anywhere in the window that shows the dragged
 *   item, through the keys capability, and sends Escape on as `CANCEL` for
 *   the press, where its pointer last was. It takes the key, so a dialog the
 *   set is in stays open. `unlisten` stops.
 * - `lift` and `pass` play their touch through the haptics capability. The
 *   family draws the item lifted, and the others making room, from the state
 *   and the context the runner gives it.
 * - `frame` waits for the next frame through the timers capability, then
 *   sends `TICK` with the context's token, the pointer where its drag last
 *   told it, and the scroller's edges. Where nothing scrolls, it waits for
 *   none. `scroll` scrolls the scroller by `speed` through the scroll
 *   capability, then places the item again by the pointer, since the page
 *   moved under it.
 * - `picked-up`, `moved`, `dropped`, and `canceled` say the family's words
 *   through the announce capability, politely, as a status region does on the
 *   web, and play the touch each stands for: `lift`, `pass`, `drop`, and
 *   `cancel`.
 * - `refocus` moves focus to the moved item's grip where nothing has it, as
 *   moving an item on the web sends focus to the body.
 * - `land` and `back` glide the item through the motion capability, from
 *   where the pointer let it go, to its new place or to its own, and send
 *   `LANDED` or `GLIDED` once it arrives. `land` measures the glide from
 *   where the items stood as the pointer let go, which counts the scroll
 *   under the pointer: a native item follows both.
 *
 * **The words tell the reader, so a stop leaves them out**, with their
 * touches. The machine's cancel says nothing either.
 *
 * **The host keeps the press it heard, where the item was let go and the
 * items stood then, the frame it waits for, and the keys it hears**, so a
 * family makes one for each runner and gives it parts that read what the
 * family draws now.
 */
export const reorderHost = <N>(parts: ReorderParts<N>): ReorderHost<N> => {
  /* How many presses the host has heard, which numbers the next. */
  let count = 0
  /* The press whose moments reach the machine: the pointer an item's drag
     heard go down first, until it lets go, the system takes it, or the move
     that holds it lets go of it. */
  let press: Press | null = null
  /* The last press that let go or that the system took, until `untrack`
     takes where it let the item go. A press the machine never held is
     never untracked, and the next to end replaces it. */
  let ended: Press | null = null
  /* Where the press the move held let the item go, until a glide starts
     from there. */
  let letGo: LetGo | null = null
  /* The frame the drag waits for, until it comes or the drag ends. */
  let waiting: Stop | null = null
  /* The keys heard anywhere, while a pointer drags. */
  let hearing: Stop | null = null

  /** The other items' extents, in the order drawn. */
  const othersOf = (key: string, keys: readonly string[]): (ReorderSpan | undefined)[] =>
    keys.filter((one) => one !== key).map((one) => parts.span(one))

  /** What an event about the item with `key` carries: the set as drawn now, and `fields`. */
  const about = (key: string, fields: Partial<ReorderInput> = {}): ReorderInput => {
    const set = parts.set(key)
    return {
      at: Number.NaN,
      end: 0,
      keyName: '',
      pointer: 0,
      start: 0,
      token: 0,
      x: 0,
      y: 0,
      ...set,
      key,
      spans: othersOf(key, set.keys),
      ...fields,
    }
  }

  /** How far the scroller is scrolled along the axis the item with `key` moves on: 0 where none scrolls. */
  const scrolledOf = (key: string): number => {
    const box = parts.scroller()
    const at = box === null ? { x: 0, y: 0 } : scroll().offset(box.node)
    return parts.set(key).axis === 'block' ? at.y : at.x
  }

  /** How far the item `one` holds stands from its place at `at`: the pointer's travel, and the scroll under it. */
  const carried = (one: Press, at: number): number =>
    at - one.at + scrolledOf(one.key) - one.scrolled

  /** Where the item with `key` is let go, `by` from its place, and where the items stand now. */
  const letting = (key: string, by: number | null): LetGo => ({
    by,
    held: parts.span(key),
    others: othersOf(key, parts.set(key).keys),
  })

  /** The press of `pointer` on the item with `key`, where it is the one whose moments reach the machine. */
  const pressOf = (key: string, pointer: number): Press | null =>
    press?.key === key && press.last.pointer === pointer ? press : null

  /** The press the move holds, by the number and the item the context keeps, where the host still has it. */
  const holder = (context: ReorderContext): Press | null =>
    [press, ended].find((one) => one?.id === context.pointer && one.key === context.key) ?? null

  /** Ends `one` as its pointer lets go or the system takes it, and sends the event it stands for. */
  const end = (one: Press, moment: Dragged): void => {
    one.letGo = letting(one.key, carried(one, moment.at))
    ended = one
    press = null
    const event = moment.kind === 'drop' ? compiled.EVENT_RELEASE : compiled.EVENT_CANCEL
    parts.send(event, about(one.key, pointed(one, moment)))
  }

  /** Sends a moment of the drag on the item with `key` to the runner, as the event it stands for. */
  const heard = (key: string, moment: Dragged): void => {
    if (moment.kind === 'down') {
      if (press === null) {
        count += 1
        press = {
          at: moment.at,
          id: count,
          key,
          last: moment,
          letGo: null,
          scrolled: scrolledOf(key),
        }
        parts.send(compiled.EVENT_PRESS, about(key, pointed(press, moment)))
      }
      return
    }
    const one = pressOf(key, moment.pointer)
    if (one === null) {
      return
    }
    one.last = moment
    if (moment.kind === 'lift' || moment.kind === 'pass') {
      parts.send(compiled.EVENT_DRAG, about(key, pointed(one, moment)))
    } else {
      end(one, moment)
    }
  }

  /** Sends Escape on as `CANCEL` for the press the move holds, and answers whether it took the key. */
  const escaped = (context: ReorderContext, pressed: KeyPress): boolean => {
    const one = press?.id === context.pointer ? press : null
    if (one === null || pressed.key !== 'Escape' || pressed.claimed) {
      return false
    }
    parts.send(compiled.EVENT_CANCEL, about(one.key, pointed(one, one.last)))
    return true
  }

  /** Says one of the words about the item the move is about, at `place`, and plays its touch. */
  const say = (word: keyof ReorderWords, context: ReorderContext, place: number): void => {
    const message = parts.words()[word]
    if (message !== '') {
      const values = {
        count: parts.set(context.key).keys.length,
        name: parts.name(context.key),
        position: place + 1,
      }
      announce().say(formatMessage(message, values, parts.locale()), 'polite')
    }
    haptics().play(TOUCHES[word])
  }

  /** Glides the item with `key` along `way`, and calls `done` once it arrives: at once, where it is not drawn. */
  const glide = (key: string, way: Glide, done: () => void): void => {
    const node = parts.item(key)
    if (node === undefined) {
      done()
      return
    }
    const { axis } = parts.set(key)
    if (way.from !== null) {
      motion().place(node, frameOf(axis, way.from))
    }
    motion().glide(node, frameOf(axis, way.to), parts.transition(), done)
  }

  /** Where the item was let go, which only the glide that follows starts from. */
  const taken = (): LetGo | null => {
    const was = letGo
    letGo = null
    return was
  }

  /** Ends the frame the drag waits for, where it waits for one. */
  const settle = (): void => {
    waiting?.()
    waiting = null
  }

  /** Stops hearing the keys anywhere, where the host hears them. */
  const hush = (): void => {
    hearing?.()
    hearing = null
  }

  return {
    hear: (key, node) => {
      const { axis, keys } = parts.set(key)
      const stops = stopsOf(othersOf(key, keys), parts.scroller())
      const setup: DragSetup = { axis: axis === 'block' ? 'y' : 'x', slop: SLOP, stops }
      return gesture().drag(node, setup, (moment) => heard(key, moment))
    },
    notifies: ['canceled', 'dropped', 'moved', 'picked-up'],
    perform: {
      back: (context) => {
        const glided = about(context.key, { token: context.token })
        const way = { from: taken()?.by ?? null, to: 0 }
        glide(context.key, way, () => parts.send(compiled.EVENT_GLIDED, glided))
      },
      canceled: (context) => {
        say('canceled', context, context.from)
      },
      dropped: (context) => {
        say('dropped', context, context.to)
      },
      frame: (context) => {
        settle()
        if (parts.scroller() === null) {
          return
        }
        waiting = timers().frame(() => {
          waiting = null
          const box = parts.scroller()
          const at = press?.last.at ?? Number.NaN
          const edges = { end: box?.end ?? 0, start: box?.start ?? 0 }
          parts.send(
            compiled.EVENT_TICK,
            about(context.key, { at, ...edges, token: context.token }),
          )
        })
      },
      land: (context) => {
        const { axis, rtl } = parts.set(context.key)
        const was = taken() ?? letting(context.key, null)
        const reversed = axis === 'inline' && rtl
        const now = drawn(context, about(context.key))
        const way = landingOf(was, context.from, context.to, reversed, now)
        glide(context.key, way, () => parts.send(compiled.EVENT_LANDED, about(context.key)))
      },
      lift: () => {
        haptics().play('lift')
      },
      listen: (context) => {
        hush()
        const node = parts.item(context.key) ?? parts.grip(context.key)
        if (node !== undefined) {
          hearing = keys().listenAnywhere(node, (pressed) => escaped(context, pressed))
        }
      },
      moved: (context) => {
        say('moved', context, context.to)
      },
      pass: () => {
        haptics().play('pass')
      },
      'picked-up': (context) => {
        say('pickedUp', context, context.to)
      },
      refocus: (context) => {
        const grip = parts.grip(context.key)
        if (grip !== undefined && focus().focused() === null) {
          focus().focus(grip, false)
        }
      },
      scroll: (context) => {
        const box = parts.scroller()
        if (box === null || context.speed === 0) {
          return
        }
        const block = parts.set(context.key).axis === 'block'
        scroll().by(box.node, block ? 0 : context.speed, block ? context.speed : 0)
        if (press !== null) {
          parts.send(compiled.EVENT_DRAG, about(context.key, pointed(press, press.last)))
        }
      },
      unlisten: () => {
        hush()
      },
      untrack: (context) => {
        settle()
        const one = holder(context)
        if (one === null) {
          return
        }
        letGo = one.letGo ?? letting(one.key, carried(one, one.last.at))
        if (one === press) {
          press = null
        } else {
          ended = null
        }
      },
    },
  }
}
