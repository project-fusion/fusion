import type { Dragged, DragSetup } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { HostInstance } from 'react-native'
import {
  GestureDetector,
  GestureHandlerRootView,
  type PanGesture,
  PointerType,
  State,
} from 'react-native-gesture-handler'
import {
  createGestureController,
  fireGestureHandler,
} from 'react-native-gesture-handler/jest-utils'
import Animated from 'react-native-reanimated'
import { crossed, nativeGesture, shiftDrag, useDrag } from './gesture'

/** Where a spec keeps the host instance and the pan of the part it drew. */
interface Held {
  gesture?: PanGesture
  node?: HostInstance
}

/** A part drawn with `useDrag` in a `GestureDetector`, which hands its host instance and pan to `held`. */
const Part = ({ held }: { readonly held: Held }) => {
  const drag = useDrag()
  held.gesture = drag.gesture
  return (
    <GestureDetector gesture={drag.gesture}>
      <Animated.View
        ref={(node: HostInstance | null) => {
          if (node) {
            held.node = node
          }
          return drag.ref(node)
        }}
        style={drag.style}
        testID="part"
      />
    </GestureDetector>
  )
}

/**
 * Draws a part and hands back its host instance, its pan, and a way to read
 * the transform its style draws now.
 *
 * **Reanimated's mock reads an animated style once per render**, so
 * `following` draws the part again to read it.
 */
const drawn = async () => {
  const held: Held = {}
  /* A new element each time, since React draws the same element again as it was. */
  const tree = () => (
    <GestureHandlerRootView>
      <Part held={held} />
    </GestureHandlerRootView>
  )
  const view = await render(tree())
  const following = async (): Promise<unknown> => {
    await view.rerender(tree())
    return (screen.getByTestId('part').props.style as { transform: unknown }).transform
  }
  return { following, gesture: held.gesture as PanGesture, node: held.node as HostInstance }
}

/**
 * Lets the moments reach the JavaScript thread. `scheduleOnRN` in worklets'
 * mock queues each call as a microtask.
 */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Lets go of the pointer, as the touch event Gesture Handler sends before
 * the pan ends. Its Jest utilities send no touch events, so the spec hands
 * it to the pan's handler. `3` is Gesture Handler's `TOUCHES_UP`.
 */
const letGo = (gesture: PanGesture): void => {
  gesture.detectorCallbacks.jsEventHandler?.({
    allTouches: [],
    changedTouches: [],
    eventType: 3,
    handlerTag: gesture.handlerTag,
    numberOfTouches: 0,
    pointerType: PointerType.TOUCH,
    state: State.BEGAN,
  })
}

/** A drag down a list whose places begin at 100, 140, and 180. */
const SETUP: DragSetup = { axis: 'y', slop: 4, stops: [100, 140, 180] }

/** Hears a drag of `node`, and hands back what it heard and its stop. */
const hear = (node: unknown, setup: DragSetup = SETUP) => {
  const heard: Dragged[] = []
  const stop = nativeGesture.drag(node, setup, (moved) => heard.push(moved))
  return { heard, stop }
}

/** The moment of each thing heard, with where the pointer was along the axis. */
const moments = (heard: readonly Dragged[]): string[] =>
  heard.map((moved) => `${moved.kind} ${moved.at}`)

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('crossed', () => {
  test('counts a stop crossed moving forward, and each stop one move crosses', () => {
    expect(crossed(96, 120, SETUP.stops)).toBe(1)
    expect(crossed(96, 190, SETUP.stops)).toBe(3)
  })

  test('counts a stop crossed moving back, and each stop one move crosses', () => {
    expect(crossed(150, 120, SETUP.stops)).toBe(1)
    expect(crossed(190, 96, SETUP.stops)).toBe(3)
  })

  test('passes a stop only once the pointer is past it', () => {
    expect(crossed(96, 100, SETUP.stops)).toBe(0)
    expect(crossed(100, 101, SETUP.stops)).toBe(1)
    expect(crossed(101, 100, SETUP.stops)).toBe(1)
    expect(crossed(100, 99, SETUP.stops)).toBe(0)
  })

  test('counts nothing for a pointer that stays still or moves between two stops', () => {
    expect(crossed(100, 100, SETUP.stops)).toBe(0)
    expect(crossed(110, 130, SETUP.stops)).toBe(0)
    expect(crossed(130, 110, SETUP.stops)).toBe(0)
  })

  test('counts the first stop and the last at the ends of the line, and nothing beyond them', () => {
    expect(crossed(0, 100, SETUP.stops)).toBe(0)
    expect(crossed(0, 101, SETUP.stops)).toBe(1)
    expect(crossed(101, 0, SETUP.stops)).toBe(1)
    expect(crossed(180, 400, SETUP.stops)).toBe(1)
    expect(crossed(400, 180, SETUP.stops)).toBe(1)
    expect(crossed(181, 400, SETUP.stops)).toBe(0)
  })

  test('counts nothing where there are no stops', () => {
    expect(crossed(0, 400, [])).toBe(0)
  })
})

describe('nativeGesture', () => {
  test('tells down, lift, a pass for each stop crossed, and drop', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node)
    fireGestureHandler(gesture, [
      { absoluteY: 90, state: State.BEGAN },
      { absoluteY: 96, state: State.ACTIVE },
      { absoluteY: 120 },
      { absoluteY: 190 },
      { absoluteY: 190, state: State.END },
    ])
    await settle()
    expect(moments(heard)).toEqual([
      'down 90',
      'lift 96',
      'pass 120',
      'pass 190',
      'pass 190',
      'drop 190',
    ])
    expect(heard[0]).toEqual({ at: 90, kind: 'down', pointer: 1, x: 0, y: 90 })
    stop()
  })

  test('tells a pass for each stop crossed moving back', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node)
    fireGestureHandler(gesture, [
      { absoluteY: 150, state: State.BEGAN },
      { absoluteY: 145, state: State.ACTIVE },
      { absoluteY: 90 },
      { absoluteY: 90, state: State.END },
    ])
    await settle()
    expect(moments(heard)).toEqual(['down 150', 'lift 145', 'pass 90', 'pass 90', 'drop 90'])
    stop()
  })

  test('tells at the lift each stop crossed since the pointer went down', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node)
    const pan = createGestureController(gesture)
    pan.begin({ absoluteY: 98 })
    pan.activate({ absoluteY: 102 })
    await settle()
    expect(moments(heard)).toEqual(['down 98', 'lift 102', 'pass 102'])
    stop()
  })

  test('reads the position along the axis the setup names', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node, { axis: 'x', slop: 4, stops: [50] })
    fireGestureHandler(gesture, [
      { absoluteX: 40, absoluteY: 300, state: State.BEGAN },
      { absoluteX: 46, absoluteY: 300, state: State.ACTIVE },
      { absoluteX: 60, absoluteY: 300 },
      { absoluteX: 60, absoluteY: 300, state: State.END },
    ])
    await settle()
    expect(moments(heard)).toEqual(['down 40', 'lift 46', 'pass 60', 'drop 60'])
    expect(heard[3]).toEqual({ at: 60, kind: 'drop', pointer: 1, x: 60, y: 300 })
    stop()
  })

  test('lifts at the slop the setup gives, as the pan’s minimum distance', async () => {
    const { gesture, node } = await drawn()
    const { stop } = hear(node, { ...SETUP, slop: 12 })
    expect(gesture.config.minDist).toEqual(expect.objectContaining({ value: 12 }))
    stop()
  })

  test('tells drop for a press that lets go before it travels the slop', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node)
    const pan = createGestureController(gesture)
    pan.begin({ absoluteY: 90 })
    letGo(gesture)
    pan.fail({ absoluteY: 92 })
    await settle()
    expect(moments(heard)).toEqual(['down 90', 'drop 92'])
    stop()
  })

  test('tells cancel when the system takes the pointer, lifted or not', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node)
    const pan = createGestureController(gesture)
    pan.begin({ absoluteY: 90 })
    pan.cancel({ absoluteY: 92 })
    pan.begin({ absoluteY: 90 })
    pan.activate({ absoluteY: 96 })
    pan.cancel({ absoluteY: 96 })
    await settle()
    expect(moments(heard)).toEqual(['down 90', 'cancel 92', 'down 90', 'lift 96', 'cancel 96'])
    stop()
  })

  test('counts each press as its own pointer', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node)
    const pan = createGestureController(gesture)
    pan.begin({ absoluteY: 90 })
    pan.cancel({ absoluteY: 90 })
    pan.begin({ absoluteY: 90 })
    pan.cancel({ absoluteY: 90 })
    await settle()
    expect(heard.map((moved) => moved.pointer)).toEqual([1, 1, 2, 2])
    stop()
  })

  test('follows the pointer along the axis from where it went down, and goes back once the drop is told', async () => {
    const { following, gesture, node } = await drawn()
    const { stop } = hear(node)
    const pan = createGestureController(gesture)
    pan.begin({ absoluteY: 90 })
    pan.activate({ absoluteY: 96 })
    pan.update({ absoluteY: 120 })
    expect(await following()).toEqual([{ translateX: 0 }, { translateY: 30 }])
    pan.end({ absoluteY: 120 })
    await settle()
    expect(await following()).toEqual([{ translateX: 0 }, { translateY: 0 }])
    stop()
  })

  test('follows as far past the pointer as the box scrolled under it, and drops that with the drag', async () => {
    const { following, gesture, node } = await drawn()
    const { stop } = hear(node)
    const pan = createGestureController(gesture)
    pan.begin({ absoluteY: 90 })
    pan.activate({ absoluteY: 96 })
    pan.update({ absoluteY: 120 })
    shiftDrag(node, 12)
    expect(await following()).toEqual([{ translateX: 0 }, { translateY: 42 }])
    pan.end({ absoluteY: 120 })
    await settle()
    expect(await following()).toEqual([{ translateX: 0 }, { translateY: 0 }])
    stop()
  })

  test('tells cancel when stopped during a press, where the pointer last was, and nothing after', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node)
    const pan = createGestureController(gesture)
    pan.begin({ absoluteY: 90 })
    pan.activate({ absoluteY: 96 })
    pan.update({ absoluteY: 120 })
    await settle()
    stop()
    pan.end({ absoluteY: 130 })
    await settle()
    expect(moments(heard)).toEqual(['down 90', 'lift 96', 'pass 120', 'cancel 120'])
  })

  test('hears nothing once stopped, and turns the pan off', async () => {
    const { gesture, node } = await drawn()
    const { heard, stop } = hear(node)
    stop()
    fireGestureHandler(gesture, [{ absoluteY: 90, state: State.BEGAN }])
    await settle()
    expect(heard).toEqual([])
    expect(gesture.config.enabled).toEqual(expect.objectContaining({ value: false }))
  })

  test('carries a press on into a later drag of the part, which passes the later stops', async () => {
    const { gesture, node } = await drawn()
    const earlier = hear(node)
    const pan = createGestureController(gesture)
    pan.begin({ absoluteY: 90 })
    pan.activate({ absoluteY: 96 })
    pan.update({ absoluteY: 120 })
    await settle()
    /* The places moved 30 up under the pointer, as a scroll moves them. */
    const later = hear(node, { ...SETUP, stops: [70, 110, 150] })
    pan.update({ absoluteY: 145 })
    pan.update({ absoluteY: 155 })
    pan.end({ absoluteY: 155 })
    await settle()
    expect(moments(earlier.heard)).toEqual(['down 90', 'lift 96', 'pass 120'])
    expect(moments(later.heard)).toEqual(['pass 155', 'drop 155'])
    expect(later.heard[0]?.pointer).toBe(earlier.heard[0]?.pointer)
    earlier.stop()
    later.stop()
  })

  test('keeps a later drag when a stop kept from an earlier one runs', async () => {
    const { gesture, node } = await drawn()
    const earlier = hear(node)
    const later = hear(node)
    earlier.stop()
    fireGestureHandler(gesture, [
      { absoluteY: 90, state: State.BEGAN },
      { absoluteY: 90, state: State.END },
    ])
    await settle()
    expect(earlier.heard).toEqual([])
    expect(later.heard.map((moved) => moved.kind)).toEqual(['down', 'lift', 'drop'])
    later.stop()
  })
})

describe('a node never drawn with useDrag', () => {
  test('hears nothing, and its stop does nothing', () => {
    for (const node of [{}, null, 'part']) {
      const { heard, stop } = hear(node)
      stop()
      expect(heard).toEqual([])
    }
  })
})
