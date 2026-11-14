import type { Gesture } from '@fusion.dev/helix-core/capabilities/gesture'
import type { Axis, Dragged, DragKind } from '@fusion.dev/helix-core/capabilities/types'
import { type RefCallback, useCallback, useMemo, useState } from 'react'
import type { HostInstance } from 'react-native'
import {
  type PanGesture,
  type PanGestureConfig,
  type PanGestureEvent,
  usePanGesture,
} from 'react-native-gesture-handler'
import { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

/**
 * How many of `stops` a pointer crosses moving along the axis from
 * `previous` to `next`, in either direction.
 *
 * **A stop is passed once the pointer is past it**, as core's `trackDrag`
 * counts it, so a pointer resting on a stop has not passed it. Each change
 * of side is one crossing.
 */
export const crossed = (previous: number, next: number, stops: readonly number[]): number => {
  'worklet'
  const low = Math.min(previous, next)
  const high = Math.max(previous, next)
  let count = 0
  for (const stop of stops) {
    if (stop >= low && stop < high) {
      count += 1
    }
  }
  return count
}

/** Tells the JavaScript thread a moment of the drag, with the pointer's position. */
type Tell = (kind: DragKind, at: number, x: number, y: number, pointer: number) => void

/** What the pan's worklets read and write on the UI thread. */
interface Worklet {
  readonly axis: SharedValue<Axis>
  /** Where the pointer was along the axis at the last frame, which the next crossing is counted from. */
  readonly last: SharedValue<number>
  /** Whether a drag hears the part. The pan is enabled only while one does. */
  readonly listening: SharedValue<boolean>
  /** Where the pointer went down along the axis, which the part follows from. */
  readonly origin: SharedValue<number>
  /**
   * Counts each press. Gesture Handler gives a pan no pointer id, so the count
   * tells one press from the next, as a pointer id does on the web.
   */
  readonly press: SharedValue<number>
  /** Whether the pointer of the press went up, which tells a drop from a cancel. */
  readonly released: SharedValue<boolean>
  /** How far past the pointer the part follows along the axis, as `shiftDrag` tells it. */
  readonly shift: SharedValue<number>
  readonly slop: SharedValue<number>
  readonly stops: SharedValue<number[]>
  /** How far the part follows the pointer along the axis. */
  readonly translate: SharedValue<number>
}

/** One part's setup, and the drag that hears it. */
interface Entry {
  heard: ((moved: Dragged) => void) | null
  /** The last moment told of the press down now, or `null` where none is. */
  pressed: Dragged | null
  readonly worklet: Worklet
}

/** The parts drawn with `useDrag`, by host instance. */
const entries = new WeakMap<object, Entry>()

const NOTHING = (): void => undefined

/**
 * The pointer's position along the axis. Gesture Handler measures `absoluteX`
 * and `absoluteY` from the root view, which fills the screen.
 */
const along = (axis: Axis, event: PanGestureEvent): number => {
  'worklet'
  return axis === 'x' ? event.absoluteX : event.absoluteY
}

const report = (state: Worklet, tell: Tell, kind: DragKind, event: PanGestureEvent): void => {
  'worklet'
  scheduleOnRN(
    tell,
    kind,
    along(state.axis.value, event),
    event.absoluteX,
    event.absoluteY,
    state.press.value,
  )
}

/**
 * Moves the part with the pointer, and tells a pass for each stop crossed
 * since the last frame. At the lift, that is each stop crossed since the
 * pointer went down, so the passes add up to where the pointer is.
 */
const step = (state: Worklet, tell: Tell, event: PanGestureEvent): void => {
  'worklet'
  const at = along(state.axis.value, event)
  state.translate.value = at - state.origin.value
  const passes = crossed(state.last.value, at, state.stops.value)
  state.last.value = at
  for (let pass = 0; pass < passes; pass += 1) {
    report(state, tell, 'pass', event)
  }
}

/**
 * The pan's setup and its worklets. Each runs on the UI thread and sends only
 * the moments a machine answers to the JavaScript thread.
 *
 * **The lift is Gesture Handler's activation**, with `minDistance` bound to
 * the slop. Its iOS and Android handlers activate a pan once
 * `dx * dx + dy * dy` reaches `minDist * minDist` from where the pointer went
 * down, which is core's `Math.hypot(dx, dy) >= slop`. A press that travels
 * less stays a touch that a scroll view or a button can still take.
 *
 * **Gesture Handler reports a pan that ends before it activates as
 * canceled**, whether its pointer went up or the system took it. The touch
 * that goes up tells the two apart: both platforms send it before the pan's
 * end, so a press that never lifted drops, as on the web.
 */
const panOf = (state: Worklet, tell: Tell): PanGestureConfig => ({
  enabled: state.listening,
  minDistance: state.slop,
  onActivate: (event) => {
    'worklet'
    report(state, tell, 'lift', event)
    step(state, tell, event)
  },
  onBegin: (event) => {
    'worklet'
    const at = along(state.axis.value, event)
    state.press.value += 1
    state.released.value = false
    state.origin.value = at
    state.last.value = at
    report(state, tell, 'down', event)
  },
  onFinalize: (event) => {
    'worklet'
    report(state, tell, event.canceled && !state.released.value ? 'cancel' : 'drop', event)
  },
  onTouchesUp: (event) => {
    'worklet'
    if (event.numberOfTouches === 0) {
      state.released.value = true
    }
  },
  onUpdate: (event) => {
    'worklet'
    step(state, tell, event)
  },
})

/** Puts the part back at its place. */
const rest = (state: Worklet): void => {
  state.shift.value = 0
  state.translate.value = 0
}

/**
 * Tells `heard` a moment the pan reported, where it belongs to the press the
 * drag heard go down. A moment still on its way from a press a stop ended
 * is dropped. A drop or a cancel sends the part back to its place first.
 */
const tellTo = (entry: Entry, moved: Dragged): void => {
  const ends = moved.kind === 'cancel' || moved.kind === 'drop'
  if (ends) {
    rest(entry.worklet)
  }
  const heard = entry.heard
  if (!heard || (moved.kind !== 'down' && entry.pressed?.pointer !== moved.pointer)) {
    return
  }
  /* The press is over before the moment is told, so a listener that stops
     the drag then has nothing left to cancel. */
  entry.pressed = ends ? null : moved
  heard(moved)
}

/** The style that moves the part along the axis by `translate` and `shift`. */
const useFollowStyle = (state: Worklet) =>
  useAnimatedStyle(() => {
    const by = state.translate.value + state.shift.value
    return {
      transform: [
        { translateX: state.axis.value === 'x' ? by : 0 },
        { translateY: state.axis.value === 'y' ? by : 0 },
      ],
    }
  })

/** What `useDrag` gives a part to draw with. */
export interface Dragging {
  /** The pan gesture. Pass it as the `gesture` of the `GestureDetector` around the part. */
  readonly gesture: PanGesture
  /**
   * Registers the host instance under the part's pan, so `nativeGesture`
   * finds it. Pass it as the `ref` of the `Animated.View` that takes `style`.
   */
  readonly ref: RefCallback<HostInstance>
  /** The animated style that moves the part along the axis while it is lifted. */
  readonly style: ReturnType<typeof useFollowStyle>
}

/**
 * Makes a part's pan and binds the drag's setup into it through shared
 * values. A part that `nativeGesture` drags calls it in render.
 *
 * **The part stays where it was dropped until the JavaScript thread hears
 * the drop**, and goes back to its place in the same turn. A machine that
 * places the part where it was dropped, to glide it on from there, lands in
 * the same frame, since Reanimated sends the writes of one turn together.
 */
export const useDrag = (): Dragging => {
  const axis = useSharedValue<Axis>('y')
  const last = useSharedValue(0)
  const listening = useSharedValue(false)
  const origin = useSharedValue(0)
  const press = useSharedValue(0)
  const released = useSharedValue(false)
  const shift = useSharedValue(0)
  const slop = useSharedValue(0)
  const stops = useSharedValue<number[]>([])
  const translate = useSharedValue(0)
  const [entry] = useState<Entry>(() => ({
    heard: null,
    pressed: null,
    worklet: { axis, last, listening, origin, press, released, shift, slop, stops, translate },
  }))
  const tell = useCallback<Tell>(
    (kind, at, x, y, pointer) => tellTo(entry, { at, kind, pointer, x, y }),
    [entry],
  )
  const gesture = usePanGesture(useMemo(() => panOf(entry.worklet, tell), [entry, tell]))
  const style = useFollowStyle(entry.worklet)
  const ref = useCallback(
    (node: HostInstance | null) => {
      if (!node) {
        return undefined
      }
      entries.set(node, entry)
      return () => {
        if (entries.get(node) === entry) {
          entries.delete(node)
        }
      }
    },
    [entry],
  )
  return { gesture, ref, style }
}

/**
 * Hears a drag of a part drawn with `useDrag`, by the rules of core's
 * `trackDrag`. `drag` writes the setup into the part's shared values,
 * enables its pan, and keeps `heard`, until stopped. The pan tells `down` as
 * it begins, `lift` once it travels the slop, `pass` for each stop the pointer
 * crosses along the axis, `drop` as the pointer goes up, and `cancel` as the
 * system takes it.
 *
 * **A stop during a press tells `cancel`**, where the pointer last was, and
 * nothing after.
 *
 * **A part hears one drag at a time**, since it has one pan. A later `drag`
 * of the same part replaces the setup and the `heard` of the one before.
 *
 * **A press carries on into a later drag of its part.** The later `heard`
 * hears the rest of the press, and the pan counts passes at the later stops
 * from where the pointer is. A family whose items move under a held press,
 * as a box scrolls them, hears the part again with stops where they now
 * stand, and keeps the press. A drag that begins after a stop begins with
 * no press.
 *
 * **A node never drawn with `useDrag` hears nothing**, and its stop does
 * nothing.
 */
export const nativeGesture: Gesture<unknown> = {
  drag: (node, setup, heard) => {
    const entry = typeof node === 'object' && node !== null ? entries.get(node) : undefined
    if (!entry) {
      return NOTHING
    }
    /* Its own function, so a stop kept from an earlier drag cannot stop a
       later one that passed the same `heard`. */
    const one = (moved: Dragged): void => heard(moved)
    entry.heard = one
    entry.worklet.axis.value = setup.axis
    entry.worklet.slop.value = setup.slop
    entry.worklet.stops.value = [...setup.stops]
    entry.worklet.listening.value = true
    return () => {
      if (entry.heard !== one) {
        return
      }
      const pressed = entry.pressed
      entry.heard = null
      entry.pressed = null
      entry.worklet.listening.value = false
      rest(entry.worklet)
      if (pressed) {
        one({ ...pressed, kind: 'cancel' })
      }
    }
  },
}

/**
 * Moves the part a drag follows `by` further along the axis than the pointer
 * has traveled, until the drag ends.
 *
 * **A part in a box that scrolls under a still pointer drifts with the
 * content**, since the pointer it follows has not moved. A family that
 * scrolls the box during a drag passes how far the box has scrolled since
 * the press, and the part stays under the pointer. A node never drawn with
 * `useDrag` is left alone.
 */
export const shiftDrag = (node: unknown, by: number): void => {
  const entry = typeof node === 'object' && node !== null ? entries.get(node) : undefined
  if (entry) {
    entry.worklet.shift.value = by
  }
}
