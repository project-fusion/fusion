import type { Compiled } from '@fusion.dev/helix-core/machines/compiled'
import { selectionHost } from '@fusion.dev/helix-core/machines/single-selection/host'
import * as selection from '@fusion.dev/helix-core/machines/single-selection/single-selection.generated'
import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { type RefObject, StrictMode, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useMachine } from './use-machine'

const ITEMS = [{ value: 'a' }, { value: 'b' }, { value: 'c' }]

interface Props {
  /** What each activation hears: the value, and the current item the screen showed. */
  readonly heard: string[]
  /** Whether a listener refuses each change. */
  readonly refuses?: boolean
}

/** Three tabs on single selection, as a family would bind them. */
const Tabs = ({ heard, refuses = false }: Props) => {
  const shown = useRef('')
  const machine = useMachine(
    selection,
    { active: 'a', held: [] },
    selectionHost({ activate: (value) => heard.push(`${value} while showing ${shown.current}`) }),
    () => !refuses,
  )
  shown.current = machine.context.active
  return (
    <View>
      {ITEMS.map((item) => (
        <Pressable
          accessibilityRole="tab"
          key={item.value}
          onPress={() => machine.send(selection.EVENT_CHOOSE, { items: ITEMS, value: item.value })}
        >
          <Text>{item.value}</Text>
        </Pressable>
      ))}
      <Text testID="current">{machine.context.active}</Text>
    </View>
  )
}

describe('useMachine', () => {
  test('starts in the state the seed reads as', async () => {
    await render(<Tabs heard={[]} />)
    expect(screen.getByTestId('current').props.children).toBe('a')
  })

  test('draws a move before it runs the move’s effects', async () => {
    const heard: string[] = []
    await render(<Tabs heard={heard} />)
    await fireEvent.press(screen.getByText('b'))
    expect(screen.getByTestId('current').props.children).toBe('b')
    expect(heard).toEqual(['b while showing b'])
  })

  test('takes the refused move where a listener refuses the request', async () => {
    const heard: string[] = []
    await render(<Tabs heard={heard} refuses />)
    await fireEvent.press(screen.getByText('c'))
    expect(screen.getByTestId('current').props.children).toBe('a')
    expect(heard).toEqual([])
  })

  test('keeps its state when strict mode mounts it twice', async () => {
    const heard: string[] = []
    await render(
      <StrictMode>
        <Tabs heard={heard} />
      </StrictMode>,
    )
    await fireEvent.press(screen.getByText('c'))
    expect(screen.getByTestId('current').props.children).toBe('c')
    expect(heard).toEqual(['c while showing c'])
  })
})

/** What the counter holds: a count it draws, and one it does not. */
interface Count {
  readonly shown: number
  readonly ticks: number
}

const SHOW = 0
const TICK = 1

/* A machine of one state, written as `helix family machines` writes one:
   `SHOW` counts what the component draws and `TICK` what it does not, and
   each move asks for `heard`. */
const counter: Compiled<Count, null> = {
  ASKS: [],
  cancel: () => undefined,
  EFFECTS: ['heard'],
  EVENTS: ['SHOW', 'TICK'],
  entering: () => [],
  expire: () => undefined,
  mark: () => [],
  NODES: [],
  STATES: ['on'],
  start: () => 0,
  step: (state, context, event) => ({
    context:
      event === SHOW
        ? { ...context, shown: context.shown + 1 }
        : { ...context, ticks: context.ticks + 1 },
    effects: [[0]],
    state,
  }),
}

interface Counted {
  /** What each effect hears: the counts it was given, and the count the screen showed. */
  readonly heard: string[]
  /** How many times the component has rendered. */
  readonly renders: { count: number }
  /** Where the component puts its machine's `send`. */
  readonly sends: RefObject<((event: number) => void) | null>
}

/** A component that draws `shown` and nothing else of the counter. */
const Counter = ({ heard, renders, sends }: Counted) => {
  renders.count += 1
  const shown = useRef(0)
  const machine = useMachine(
    counter,
    { shown: 0, ticks: 0 },
    {
      notifies: [],
      perform: {
        heard: (context) =>
          heard.push(`${context.shown}/${context.ticks} showing ${shown.current}`),
      },
    },
    () => true,
    ['shown'],
  )
  shown.current = machine.context.shown
  sends.current = (event) => machine.send(event, null)
  return <Text>{machine.context.shown}</Text>
}

describe('useMachine with the fields it draws', () => {
  const drawn = async () => {
    const counted: Counted = { heard: [], renders: { count: 0 }, sends: { current: null } }
    await render(<Counter {...counted} />)
    return { ...counted, send: (event: number) => counted.sends.current?.(event) }
  }

  test('runs a move that changes nothing drawn at once, with no render', async () => {
    const { heard, renders, send } = await drawn()
    const before = renders.count
    await act(() => send(TICK))
    await act(() => send(TICK))
    expect(renders.count - before).toBe(0)
    expect(heard).toEqual(['0/1 showing 0', '0/2 showing 0'])
  })

  test('draws a move that changes a field it draws before its effects run', async () => {
    const { heard, renders, send } = await drawn()
    const before = renders.count
    await act(() => send(SHOW))
    expect(renders.count - before).toBe(1)
    expect(heard).toEqual(['1/0 showing 1'])
  })

  test('runs the effects of a move that draws nothing after those of a move still to be drawn', async () => {
    const { heard, send } = await drawn()
    await act(() => {
      send(SHOW)
      send(TICK)
    })
    expect(heard).toEqual(['1/0 showing 1', '1/1 showing 1'])
  })
})
