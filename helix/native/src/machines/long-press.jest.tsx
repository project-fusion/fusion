/*
 * A long press: a finger held still on a part for half a second, which core's
 * press machine times on the timers capability, and the claim that takes it,
 * the part's own where its node says `held`, then a trigger's own claim, then
 * a tooltip's hint.
 */
import { setTimers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Pressable, Text } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Family } from '../style/form'
import { claimLongPress, longPressOf } from './long-press'
import { usePress } from './press'

/** A trigger whose node says whether it is `held`. */
const formOf = (held: unknown): Family =>
  ({
    api: { events: [{ name: 'press' }], props: [], states: [] },
    name: 'dial',
    rules: [],
    tag: 'helix-dial',
    tree: [{ attributes: { held }, kind: 'pressable', name: 'trigger' }],
    version: '2.0',
  }) as unknown as Family

const USE: MachineUse = {
  bind: { part: { part: 'trigger' }, sends: { event: 'press' } },
  machine: 'press',
}

/** Where a spec keeps the trigger's view. */
const drawn: { node?: unknown } = {}

/** The trigger, drawn with what press gives it, opening as its own long press says. */
const Trigger = (props: {
  readonly held?: unknown
  readonly onPress?: () => void
  readonly opens?: () => void
}) => {
  const view = usePress(formOf(props.held ?? false), props, USE, {
    ...(props.opens === undefined ? {} : { held: props.opens }),
  }).parts.trigger?.view
  return (
    <Pressable
      accessibilityRole="button"
      {...view}
      ref={(node) => {
        drawn.node = node
        ;(view?.ref as ((node: unknown) => void) | undefined)?.(node)
      }}
    >
      <Text>Add</Text>
    </Pressable>
  )
}

const AT = { nativeEvent: { pageX: 100, pageY: 100 } }

let timers = fakeTimers()

beforeEach(() => {
  timers = fakeTimers()
  setTimers(timers)
})

/** Holds a finger on the trigger for `ms`, drifting `by` points, then lifts it over the trigger. */
const hold = async (ms: number, by = 0) => {
  const trigger = screen.getByRole('button')
  await fireEvent(trigger, 'pressIn', AT)
  if (by > 0) {
    await fireEvent(trigger, 'touchMove', { nativeEvent: { pageX: 100 + by, pageY: 100 } })
  }
  await act(() => timers.advance(ms))
  await fireEvent(trigger, 'pressOut', AT)
  await fireEvent.press(trigger)
}

describe('a long press', () => {
  test('opens what a held trigger holds, and its release presses nothing', async () => {
    const onPress = jest.fn()
    const opens = jest.fn()
    await render(<Trigger held onPress={onPress} opens={opens} />)
    await hold(500)
    expect(opens).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()
  })

  test('leaves a quick press the trigger’s own', async () => {
    const onPress = jest.fn()
    const opens = jest.fn()
    await render(<Trigger held onPress={onPress} opens={opens} />)
    await hold(200)
    expect(opens).not.toHaveBeenCalled()
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('is an ordinary press once the finger drifts more than ten points', async () => {
    const onPress = jest.fn()
    const opens = jest.fn()
    await render(<Trigger held onPress={onPress} opens={opens} />)
    await hold(600, 14)
    expect(opens).not.toHaveBeenCalled()
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('is no long press on a trigger nothing claims, however long it is held', async () => {
    const onPress = jest.fn()
    await render(<Trigger onPress={onPress} />)
    await hold(800)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('shows a hint where the trigger has no long press of its own', async () => {
    const onPress = jest.fn()
    const hint = jest.fn()
    await render(<Trigger onPress={onPress} />)
    const stop = claimLongPress(drawn.node, 'hint', hint)
    await hold(500)
    expect(hint).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()
    stop()
  })

  test('goes to the trigger’s own long press over a hint, as the plan decides', async () => {
    const hint = jest.fn()
    const opens = jest.fn()
    await render(<Trigger held opens={opens} />)
    const stop = claimLongPress(drawn.node, 'hint', hint)
    await hold(500)
    expect(opens).toHaveBeenCalledTimes(1)
    expect(hint).not.toHaveBeenCalled()
    stop()
  })
})

describe('longPressOf', () => {
  test('ranks a claim of its own over a hint, and the last claim of a rank first', () => {
    const view = {}
    const hint = () => undefined
    const menu = () => undefined
    const dial = () => undefined
    const stops = [
      claimLongPress(view, 'hint', hint),
      claimLongPress(view, 'own', menu),
      claimLongPress(view, 'own', dial),
    ]
    expect(longPressOf(view)).toBe(dial)
    stops[2]?.()
    expect(longPressOf(view)).toBe(menu)
    stops[1]?.()
    expect(longPressOf(view)).toBe(hint)
    stops[0]?.()
    expect(longPressOf(view)).toBeUndefined()
    expect(longPressOf(null)).toBeUndefined()
  })
})
