import { environment, setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { HostInstance } from 'react-native'
import * as Reanimated from 'react-native-reanimated'
import Animated, { ReduceMotion } from 'react-native-reanimated'
import { nativeMotion, useMotion } from './motion'

/** Where a spec keeps the host instance of the part it drew. */
interface Held {
  node?: HostInstance
}

/** A part drawn with `useMotion`, which hands its host instance to `held`. */
const Part = ({ held }: { readonly held: Held }) => {
  const motion = useMotion()
  return (
    <Animated.View
      ref={(node: HostInstance | null) => {
        if (node) {
          held.node = node
        }
        return motion.ref(node)
      }}
      style={motion.style}
      testID="part"
    />
  )
}

/**
 * Draws a part and hands back its host instance, and a way to draw it again.
 *
 * **Reanimated's mock reads an animated style once per render**, so a spec
 * draws the part again to see the style its values give now.
 */
const drawn = async () => {
  const held: Held = {}
  const view = await render(<Part held={held} />)
  const style = async (): Promise<Record<string, unknown>> => {
    await view.rerender(<Part held={held} />)
    return screen.getByTestId('part').props.style as Record<string, unknown>
  }
  return { node: held.node as HostInstance, style, view }
}

/**
 * Lets the animation callbacks reach the JavaScript thread. Reanimated's mock
 * settles an animation at once, and `scheduleOnRN` in worklets' mock queues
 * the call as a microtask.
 */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const STANDARD = { duration: 200, easing: 'standard' } as const

const before = environment()

afterEach(() => {
  setEnvironment(before)
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeMotion.place', () => {
  test('draws a part at the frame at once', async () => {
    const timing = jest.spyOn(Reanimated, 'withTiming')
    const { node, style } = await drawn()
    nativeMotion.place(node, { opacity: 0.5, x: 12, y: -4 })
    expect(await style()).toEqual({
      opacity: 0.5,
      transform: [{ translateX: 12 }, { translateY: -4 }],
    })
    expect(timing).not.toHaveBeenCalled()
  })

  test('leaves the opacity to the part’s style until a motion sets one', async () => {
    const { node, style } = await drawn()
    expect(await style()).not.toHaveProperty('opacity')
    nativeMotion.place(node, { x: 4 })
    expect(await style()).not.toHaveProperty('opacity')
    nativeMotion.place(node, { opacity: 0 })
    expect(await style()).toMatchObject({ opacity: 0 })
  })

  test('leaves the size to the layout until a motion sets one', async () => {
    const { node, style } = await drawn()
    expect(await style()).not.toHaveProperty('height')
    nativeMotion.place(node, { height: 80 })
    expect(await style()).toMatchObject({ height: 80 })
    expect(await style()).not.toHaveProperty('width')
  })
})

describe('nativeMotion.glide', () => {
  test('glides each field with withTiming, and calls done once every field arrives', async () => {
    const timing = jest.spyOn(Reanimated, 'withTiming')
    const { node, style } = await drawn()
    const done = jest.fn()
    nativeMotion.glide(node, { opacity: 0, x: 40 }, STANDARD, done)
    expect(timing).toHaveBeenCalledTimes(2)
    expect(timing).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ duration: 200, reduceMotion: ReduceMotion.Never }),
      expect.any(Function),
    )
    expect(done).not.toHaveBeenCalled()
    await settle()
    expect(done).toHaveBeenCalledTimes(1)
    expect(await style()).toMatchObject({
      opacity: 0,
      transform: [{ translateX: 40 }, { translateY: 0 }],
    })
  })

  test('glides a spring with withSpring, damped to overshoot as the spring token does', async () => {
    const spring = jest.spyOn(Reanimated, 'withSpring')
    const timing = jest.spyOn(Reanimated, 'withTiming')
    const { node } = await drawn()
    const done = jest.fn()
    nativeMotion.glide(node, { y: 24 }, { duration: 320, easing: 'spring' }, done)
    expect(spring).toHaveBeenCalledWith(
      24,
      { dampingRatio: 0.71, duration: 320, reduceMotion: ReduceMotion.Never },
      expect.any(Function),
    )
    expect(timing).not.toHaveBeenCalled()
    await settle()
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('does not call back a glide stopped before it arrives', async () => {
    const { node } = await drawn()
    const done = jest.fn()
    const stop = nativeMotion.glide(node, { x: 40 }, STANDARD, done)
    stop()
    await settle()
    expect(done).not.toHaveBeenCalled()
  })

  test('does not call back a glide that a place ended', async () => {
    const { node, style } = await drawn()
    const done = jest.fn()
    nativeMotion.glide(node, { x: 40 }, STANDARD, done)
    nativeMotion.place(node, { x: 8 })
    await settle()
    expect(done).not.toHaveBeenCalled()
    expect(await style()).toMatchObject({ transform: [{ translateX: 8 }, { translateY: 0 }] })
  })

  test('leaves a stopped glide where it is drawn, stopping each field it moves', async () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const { node } = await drawn()
    const stop = nativeMotion.glide(node, { opacity: 0, x: 40 }, STANDARD, jest.fn())
    stop()
    expect(cancel).toHaveBeenCalledTimes(2)
    stop()
    expect(cancel).toHaveBeenCalledTimes(2)
  })

  test('stops each field of a glide that the glide or place replacing it does not set', async () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const { node } = await drawn()
    nativeMotion.glide(node, { opacity: 0, x: 40 }, STANDARD, jest.fn())
    nativeMotion.glide(node, { x: 0 }, STANDARD, jest.fn())
    expect(cancel).toHaveBeenCalledTimes(1)
    nativeMotion.place(node, { y: 12 })
    expect(cancel).toHaveBeenCalledTimes(2)
  })

  test('calls back only the later of two glides', async () => {
    const { node } = await drawn()
    const first = jest.fn()
    const second = jest.fn()
    nativeMotion.glide(node, { x: 40 }, STANDARD, first)
    nativeMotion.glide(node, { x: 0 }, STANDARD, second)
    await settle()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  test('starts an unset size from the size the part is drawn at, and reads it once', async () => {
    const { node } = await drawn()
    const rectangle = jest.fn(() => ({ height: 40, width: 120, x: 0, y: 0 }))
    Object.assign(node, { getBoundingClientRect: rectangle })
    nativeMotion.glide(node, { width: 200 }, STANDARD, jest.fn())
    nativeMotion.glide(node, { width: 120 }, STANDARD, jest.fn())
    expect(rectangle).toHaveBeenCalledTimes(1)
  })

  test('places at once and calls done at once where the reader asks for reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const timing = jest.spyOn(Reanimated, 'withTiming')
    const { node, style } = await drawn()
    const done = jest.fn()
    nativeMotion.glide(node, { opacity: 0 }, STANDARD, done)
    expect(done).toHaveBeenCalledTimes(1)
    expect(timing).not.toHaveBeenCalled()
    expect(await style()).toMatchObject({ opacity: 0 })
  })

  test('places at once a transition of no length', async () => {
    const timing = jest.spyOn(Reanimated, 'withTiming')
    const { node } = await drawn()
    const done = jest.fn()
    nativeMotion.glide(node, { x: 40 }, { duration: 0, easing: 'standard' }, done)
    expect(done).toHaveBeenCalledTimes(1)
    expect(timing).not.toHaveBeenCalled()
  })
})

describe('a node nativeMotion has not registered', () => {
  test('does not move, and a glide of it calls done at once', () => {
    const timing = jest.spyOn(Reanimated, 'withTiming')
    const done = jest.fn()
    for (const node of [{}, null, 'part']) {
      nativeMotion.place(node, { x: 40 })
      nativeMotion.glide(node, { x: 40 }, STANDARD, done)
    }
    expect(done).toHaveBeenCalledTimes(3)
    expect(timing).not.toHaveBeenCalled()
  })

  test('includes a part that has unmounted', async () => {
    const timing = jest.spyOn(Reanimated, 'withTiming')
    const { node, view } = await drawn()
    await view.unmount()
    const done = jest.fn()
    nativeMotion.glide(node, { x: 40 }, STANDARD, done)
    expect(done).toHaveBeenCalledTimes(1)
    expect(timing).not.toHaveBeenCalled()
  })
})
