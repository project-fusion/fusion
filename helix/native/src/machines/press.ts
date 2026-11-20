import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'
import { pressHost } from '@fusion.dev/helix-core/machines/press/host'
import type { PressContext, PressInput } from '@fusion.dev/helix-core/machines/press/machine'
import * as press from '@fusion.dev/helix-core/machines/press/press.generated'
import { useCallback, useLayoutEffect, useRef } from 'react'
import type { GestureResponderEvent } from 'react-native'
import { heardTouch, useFocusVisible } from '../capabilities/focus-visible'
import type { MachineUse } from '../ir.generated'
import { type AnchorPress, useAnchorPress } from '../render/anchored'
import type { Behavior, Props } from '../render/behavior'
import { useLayerStops } from '../render/layered'
import { useToolbarStops } from '../render/toolbar'
import type { Family } from '../style/form'
import { named } from '../style/tree'
import { longPressOf } from './long-press'
import { useAnchorHooks } from './press-anchor'
import { boundTo, given, senderOf, tell } from './props'
import { useMachine } from './use-machine'

/** What an event carries where it carries nothing of its own. */
const NOTHING: PressInput = {
  count: 0,
  key: '',
  over: false,
  pointer: '',
  primary: false,
  x: 0,
  y: 0,
}

/** What a press tells beside what pressed the part, and what follows once its event stands. */
export interface Told {
  /** What the press's event carries beside `pointerType`, such as the value of the tab pressed. */
  readonly detail?: Readonly<Record<string, unknown>>
  /**
   * Runs before the press's event is sent, as a menu item's choice turns
   * before its `select` goes out, whether or not the event then stands.
   */
  readonly first?: () => void
  /**
   * Whether the press sends no event of its own this time, as a toggle on
   * its own turns without the `select` that asks a group to choose it.
   */
  readonly quiet?: boolean
  /**
   * Runs once the press's event is sent, told whether it stands, as a menu
   * sends `change` once its row's `select` has gone out.
   */
  readonly sent?: (stands: boolean) => void
  /**
   * Runs once the press's event stands, or at once for a press that sends
   * none, as a tab's choice goes to its set once nothing refused its
   * `select`. **It is told the key that pressed the part**: `Enter` or `' '`
   * from a keyboard, and `''` from a finger or a screen reader, as a Space
   * on a menu's choice row keeps the menu open.
   */
  readonly stood?: (key: string) => void
  /**
   * What a long press on the part does where its node says `held`: opens
   * the element's toggle, as a speed dial's trigger opens its actions.
   */
  readonly held?: () => void
}

/** What the press reads of its part beside the element's props. */
export interface PressPart {
  /**
   * What the element's own layer gives a press it draws in the layer's
   * anchor, which reads no context its own element provides, as a speed
   * dial's own trigger.
   */
  readonly anchor?: AnchorPress
  /** Whether the press hears Enter and Space pressed on its part, through the keys capability. */
  readonly keys?: boolean
  /**
   * What a set lays over the part, which the press reads in place of the
   * props its binding names, as the part's own attributes read it.
   */
  readonly states?: Readonly<Record<string, boolean | string>>
}

/** The machine's states in which nothing holds the part down. */
const UP = press.STATE_PART__SPACEUP__POINTERUP

/**
 * What a part does with a key pressed on it: presses with it, takes it and
 * does nothing, as the key its form does not name, or leaves it to the
 * platform, as a key nearer the key took, any key but Enter and Space, and
 * any key while the part is disabled.
 */
const heardAs = (
  pressed: { readonly claimed?: boolean; readonly key: string },
  disabled: boolean,
  only: string | undefined,
): 'leave' | 'press' | 'take' => {
  if (pressed.claimed || disabled || (pressed.key !== 'Enter' && pressed.key !== ' ')) {
    return 'leave'
  }
  return only !== undefined && pressed.key !== only ? 'take' : 'press'
}

/** A key the machine reads, as it reads `KeyboardEvent.key`. */
const keyed = (key: string): PressInput => ({ ...NOTHING, key })

/**
 * Sends the machine a key that presses the part: Enter as it goes down, and
 * Space down and up at once, unless it repeats, since the keys capability
 * hears no key come up.
 */
const pressBy = (
  send: (event: number, input: PressInput) => void,
  pressed: { readonly key: string; readonly repeat: boolean },
): void => {
  if (pressed.key === 'Enter') {
    send(press.EVENT_KEY_DOWN, keyed('Enter'))
  } else if (!pressed.repeat) {
    send(press.EVENT_KEY_DOWN, keyed(' '))
    send(press.EVENT_KEY_UP, keyed(' '))
  }
}

/** After a press's event: `sent`, and where it stands, `stood` told the key, then the anchor. */
const followed = (
  told: Told,
  anchor: AnchorPress | undefined,
  stands: boolean,
  key: string,
): void => {
  told.sent?.(stands)
  if (!stands) {
    return
  }
  told.stood?.(key)
  if (anchor?.early !== true) {
    anchor?.pressed()
  }
}

/**
 * Hosts press on one part, as the expansion binds it: the part, the event a
 * press sends, and the props behind `disabled` and `pending`.
 *
 * **React Native says a release is over the part by pressing it.** It calls
 * `onPress` only where the finger lifted over the part, and `onPressOut`
 * either before it or, for a tap shorter than its 130 ms least press, after
 * it. So an `onPress` while a finger is down is that finger's release over
 * the part, and a press-out that comes first waits a turn of the clock for
 * `onPress` to say where it was. An `onPress` with no finger down is a click
 * nothing started, as a screen reader's double tap is, which the machine
 * names `virtual`.
 *
 * **Enter and Space pressed on the part reach the machine as keys**, where
 * `at.keys` says the part hears them, so a press from a keyboard is named
 * `keyboard`, as on the web. **A part whose form names its `keys` hears that
 * key alone**: Space alone presses a checkbox or a switch, as it presses a
 * native checkbox on the web, and Enter is taken and does nothing, so the
 * platform does not press the view with it. **A press on such a part takes
 * keyboard focus**, through the focus capability the roving focus machine
 * moves focus with, as a click on a checkbox's label focuses its `<input>` on
 * the web. A press from the keys finds focus there already, and a disabled
 * part takes no press. **A part that hears its own keys
 * is a control of the toolbar around it**, which it joins, and the keys it
 * leaves go to the toolbar. **The keys
 * capability hears a key go down and
 * never come up**, so Space presses the part as it goes down, where the web
 * presses as it comes up, and a held Space that repeats presses nothing
 * more. A disabled part leaves the keys to the platform.
 *
 * **There is no click to refuse on React Native**, so the machine's `click`
 * request is always accepted.
 *
 * **A finger held still on the part for half a second is a long press**, as
 * the machine times it, where anything claims one: the part's own, where its
 * node says `held`, or a claim made on its view, as `long-press.ts` ranks
 * them. A finger that drifts more than ten points first is an ordinary press,
 * and the release after a long press presses nothing, as on the web.
 */
export const usePress = (
  family: Family,
  props: Props,
  use: MachineUse,
  told: Told = {},
  at: PressPart = {},
): Behavior => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const sends = told.quiet === true ? undefined : boundTo(use, 'sends', 'event')
  const only = boundTo(use, 'keys', 'key')
  const read = (name: string | undefined): unknown =>
    name === undefined ? undefined : (at.states?.[name] ?? given(family, props, name))
  const disabled = read(boundTo(use, 'disabled', 'prop')) === true
  /* A disabled part that keeps its stop stays an arrow stop of the toolbar
     around it, as on the web. */
  const keeping = named(family.tree ?? [], part)?.attributes?.['focusable-when-disabled']
  const keeps =
    keeping === true ||
    (typeof keeping === 'object' &&
      keeping !== null &&
      'bind' in keeping &&
      typeof keeping.bind === 'string' &&
      read(keeping.bind) === true)
  const pending = read(boundTo(use, 'pending', 'prop')) === true
  /* The part's own long press, where its node says `held`, as a flag or
     bound to a prop. */
  const holding = named(family.tree ?? [], part)?.attributes?.held
  const heldOwn =
    told.held !== undefined &&
    (holding === true ||
      (typeof holding === 'object' &&
        holding !== null &&
        'bind' in holding &&
        typeof holding.bind === 'string' &&
        read(holding.bind) === true))
  /* The layer whose anchor the part is drawn in, which hears the press once
     its event stands, as a popover's trigger opens it. */
  const anchor = useAnchorPress() ?? at.anchor
  const anchored = useRef(anchor)
  anchored.current = anchor
  /* What takes a long press now, read as the press starts and as it is held. */
  const taker = useRef<() => (() => void) | undefined>(() => undefined)
  const seed: PressContext = {
    disabled,
    held: false,
    holds: false,
    key: false,
    pending,
    pointer: '',
    pointerType: '',
    x: 0,
    y: 0,
  }
  /* The view the part hears its keys on, which a press focuses where the
     part names its key. */
  const heardOn = useRef<unknown>(null)
  /* The key that pressed the part last, `''` where a finger or a screen
     reader did. */
  const byKey = useRef('')
  const machine = useMachine(
    press,
    seed,
    pressHost({
      act: () => undefined,
      hold: () => taker.current()?.(),
      press: (pointerType) => {
        if (only !== undefined && pointerType !== 'keyboard' && heardOn.current !== null) {
          focus().focus(heardOn.current, false)
        }
        const sender = senderOf(family, given(family, props, 'value'))
        told.first?.()
        const anchor = anchored.current
        if (anchor?.early === true) {
          anchor.pressed()
        }
        const stands =
          sends === undefined || tell(family, props, sends, { ...told.detail, pointerType }, sender)
        followed(told, anchor, stands, pointerType === 'keyboard' ? byKey.current : '')
      },
    }),
    () => true,
  )
  const { revise, send } = machine
  useLayoutEffect(() => {
    revise((context) => ({ ...context, disabled, pending }))
  }, [disabled, pending, revise])
  /* Whether a finger is down on the part, from `onPressIn` until its release
     is sent, and the release waiting a turn for `onPress`. */
  const down = useRef(false)
  const release = useRef<(() => void) | null>(null)
  const lift = (over: boolean) => {
    down.current = false
    send(press.EVENT_POINTER_UP, { ...NOTHING, over, pointer: 'touch' })
  }

  /* What the listener reads at each key: whether the part is disabled now. */
  const off = useRef(disabled)
  off.current = disabled
  const kept = useRef(keeps)
  kept.current = keeps
  const listening = useRef<Stop | undefined>(undefined)
  const toolbar = useToolbarStops()
  const self = useRef({}).current
  const hear = useCallback(
    (node: unknown) => {
      listening.current?.()
      listening.current = undefined
      toolbar?.leave(self)
      heardOn.current = node
      if (node === null) {
        return
      }
      toolbar?.join(self, { disabled: () => off.current && !kept.current, node: () => node })
      listening.current = keys().listen(node, (pressed) => {
        /* The arrow keys that open the layer around, where it takes them. */
        if (anchored.current?.arrow?.(pressed) === true) {
          return true
        }
        const heard = heardAs(pressed, off.current, only)
        if (heard === 'leave') {
          return toolbar?.key(self, pressed) ?? false
        }
        if (heard === 'press') {
          byKey.current = pressed.key
          pressBy(send, pressed)
        }
        return true
      })
    },
    [only, self, send, toolbar],
  )

  /* The part's view, which a ring reads keyboard focus on, and which the
     layer around joins as one of the stops its focus moves among. */
  const shown = useRef<unknown>(null)
  taker.current = () => longPressOf(shown.current, heldOwn ? told.held : undefined)
  const keyed = at.keys === true
  const scope = useLayerStops()
  const seen = useCallback(
    (node: unknown) => {
      shown.current = node
      scope?.leave(self)
      if (node !== null) {
        scope?.join(self, { disabled: () => off.current && !kept.current, node: () => node })
      }
      if (keyed) {
        hear(node)
      }
    },
    [hear, keyed, scope, self],
  )
  const ringed = useFocusVisible(() => shown.current)
  useAnchorHooks(anchored, shown, ringed)

  const view = {
    onBlur: () => send(press.EVENT_BLUR, NOTHING),
    onPress: () => {
      byKey.current = ''
      const waiting = release.current
      release.current = null
      waiting?.()
      if (down.current) {
        lift(true)
      } else {
        send(press.EVENT_CLICK, NOTHING)
      }
    },
    onPressIn: (event: GestureResponderEvent) => {
      byKey.current = ''
      heardTouch()
      const { pageX, pageY } = event.nativeEvent
      down.current = true
      const holds = taker.current() !== undefined
      revise((context) => (context.holds === holds ? context : { ...context, holds }))
      send(press.EVENT_POINTER_DOWN, {
        ...NOTHING,
        pointer: 'touch',
        primary: true,
        x: pageX,
        y: pageY,
      })
    },
    onPressOut: () => {
      if (!down.current) {
        return
      }
      release.current = timers().timeout(0, () => {
        release.current = null
        lift(false)
      })
    },
    /* Where the finger is as it moves, which a long press reads to tell a
       finger held still from one that drifts away. */
    onTouchMove: (event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent
      send(press.EVENT_POINTER_MOVE, { ...NOTHING, pointer: 'touch', x: pageX, y: pageY })
    },
    ref: seen,
  }
  /* **Held down is `:active`**, so a rule written for the web's press look
     draws while a finger holds the part, as the pointer's does there. A
     part's `pressed` is a group's to say, as a Button Group presses its
     buttons. **Keyboard focus after a key is `:focus-visible`.** */
  const held = machine.state !== UP
  return {
    marks: machine.marks,
    parts: {
      [part]: {
        ...(anchor?.hint === undefined ? {} : { hint: anchor.hint }),
        states: {
          active: held,
          focusVisible: ringed,
          /* Whether the layer it opens stands open, as a popover's trigger says. */
          ...(anchor?.expanded === undefined ? {} : { expanded: anchor.expanded }),
        },
        view,
      },
    },
  }
}
