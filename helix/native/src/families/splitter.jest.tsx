/*
 * The generated Splitter, drawn from its real intermediate form: two panes
 * and the divider between them, which a screen reader adjusts and reads as
 * the start pane's share, a drag, a double tap, the keys and a screen
 * reader's steps that move it, the bounds that hold it, a pane that shuts
 * at an edge and with Enter and opens back to where it stood, and the panes
 * stood one above the other. `test:native` writes the component beside
 * this file.
 */
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet, Text } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { HelixTheme } from '../theme/helix-theme'
import { HelixSplitter, type HelixSplitterProps } from './splitter/index.native'

let keys: FakeKeys<unknown>
/** The nodes the keys capability listens on, which a key goes to. */
let listening: unknown[]

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  const fake = fakeKeys<unknown>()
  listening = []
  keys = {
    ...fake,
    listen: (node, heard) => {
      listening.push(node)
      return fake.listen(node, heard)
    },
  }
  setKeys(keys)
})

/** How long the splitter is laid out along its axis, in points. */
const LENGTH = 400

/** The divider, the one view a screen reader adjusts. */
const divider = () => {
  const found = screen.root
    ?.queryAll((node) => typeof node.props.onAccessibilityAction === 'function')
    .find((node) => node.props.accessible === true)
  if (found === undefined) {
    throw new Error('no divider is drawn')
  }
  return found
}

/** What the divider tells a screen reader it stands at. */
const reading = () => divider().props.accessibilityValue as Readonly<Record<string, unknown>>

/** The view that holds the start pane's words, by those words. */
const pane = (words: string) => {
  let node = screen.getByText(words).parent
  while (node !== null && StyleSheet.flatten(node.props.style)?.flexBasis === undefined) {
    node = node.parent
  }
  return StyleSheet.flatten(node?.props.style) as Readonly<Record<string, unknown>>
}

/** The splitter's own view, which it measures itself by. */
const host = () => {
  const found = screen.root?.queryAll((node) => typeof node.props.onLayout === 'function')[0]
  if (found === undefined) {
    throw new Error('no splitter is drawn')
  }
  return found
}

/** Lays the splitter out `LENGTH` points along its axis. */
const lay = () =>
  act(async () => {
    fireEvent(host(), 'layout', {
      nativeEvent: { layout: { height: LENGTH, width: LENGTH, x: 0, y: 0 } },
    })
  })

/** The drag and the double tap the divider's detector holds, the drag first. */
const gestures = (): readonly unknown[] => {
  type Fiber = {
    readonly memoizedProps?: { readonly gesture?: { readonly gestures?: readonly unknown[] } }
    readonly return: Fiber | null
  }
  for (let fiber = divider().unstable_fiber as Fiber | null; fiber !== null; fiber = fiber.return) {
    const found = fiber.memoizedProps?.gesture?.gestures
    if (found !== undefined) {
      return found
    }
  }
  return []
}

/** A drag of the divider `by` points along the axis, letting go there. */
const dragBy = async (by: number, vertical = false) => {
  await lay()
  const moved = (amount: number) =>
    vertical ? { translationX: 0, translationY: amount } : { translationX: amount, translationY: 0 }
  await act(async () => {
    fireGestureHandler(gestures()[0] as never, [
      { state: State.BEGAN, ...moved(0) },
      { state: State.ACTIVE, ...moved(by / 2) },
      { state: State.ACTIVE, ...moved(by) },
      { state: State.END, ...moved(by) },
    ])
  })
}

/** A key pressed on the divider, as a hardware keyboard sends it. */
const key = async (name: string) => {
  await act(() => {
    const held = { alt: false, control: false, shift: false }
    ;[...new Set(listening)].reverse().some((node) => keys.press(node, name, held))
  })
}

/** Each event a handler heard, by its name, with what it carries. */
const heard = (): { events: string[]; props: Partial<HelixSplitterProps> } => {
  const events: string[] = []
  const take = (name: string) => (event: { detail: { value?: string } }) => {
    events.push(`${name} ${event.detail.value ?? ''}`.trim())
  }
  return {
    events,
    props: {
      onBeforeCollapse: take('before-collapse'),
      onBeforeResize: take('before-resize'),
      onCollapse: take('collapse'),
      onInput: () => {
        events.push('input')
      },
      onResized: take('resized'),
    },
  }
}

const Splitter = (props: HelixSplitterProps) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <HelixSplitter end={<Text>Editor</Text>} start={<Text>Files</Text>} {...props} />
    </HelixTheme>
  </GestureHandlerRootView>
)

describe('a splitter', () => {
  test('draws the start pane at its share and names the divider for a screen reader', async () => {
    await render(<Splitter defaultPosition={40} />)
    expect(pane('Files').flexBasis).toBe('40%')
    expect(divider().props.accessibilityRole).toBe('adjustable')
    expect(divider().props.accessibilityLabel).toBe('Resize panes')
    expect(reading()).toEqual({ max: 100, min: 0, now: 40, text: '40%' })
  })

  test('moves with a drag, sending input as it goes, and stands where it lets go', async () => {
    const { events, props } = heard()
    await render(<Splitter defaultPosition={40} {...props} />)
    await dragBy(40)
    expect(reading().now).toBe(50)
    expect(pane('Files').flexBasis).toBe(200)
    expect(events).toEqual(['input', 'input', 'before-resize 50', 'resized 50'])
  })

  test('steps with the arrows along its axis, and Home and End take it to its bounds', async () => {
    const { events, props } = heard()
    await render(<Splitter defaultPosition={40} max={70} min={20} step={5} {...props} />)
    await key('ArrowRight')
    expect(reading().now).toBe(45)
    await key('ArrowDown')
    expect(reading().now).toBe(45)
    await key('Home')
    expect(reading().now).toBe(20)
    await key('End')
    expect(reading()).toEqual({ max: 70, min: 20, now: 70, text: '70%' })
    expect(events.slice(0, 3)).toEqual(['before-resize 45', 'input', 'resized 45'])
  })

  test('moves by a step for a screen reader, and back with a double tap', async () => {
    await render(<Splitter defaultPosition={40} />)
    await act(async () => {
      await fireEvent(divider(), 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      })
    })
    expect(reading().now).toBe(42)
    await act(async () => {
      fireGestureHandler(gestures()[1] as never, [
        { state: State.BEGAN },
        { state: State.ACTIVE },
        { state: State.END },
      ])
    })
    expect(reading().now).toBe(40)
  })

  test('stays where it was where the move is refused', async () => {
    await render(
      <Splitter defaultPosition={40} onBeforeResize={(event) => event.preventDefault()} />,
    )
    await key('ArrowRight')
    expect(reading().now).toBe(40)
  })

  test('shuts the start pane with Enter and opens it back to where it stood', async () => {
    const { events, props } = heard()
    await render(<Splitter defaultPosition={40} {...props} />)
    await key('Enter')
    expect(reading()).toEqual({ max: 100, min: 0, now: 0, text: 'Collapsed' })
    await key('Enter')
    expect(reading().now).toBe(40)
    expect(events).toEqual([
      'before-collapse start',
      'collapse start',
      'before-collapse',
      'collapse',
    ])
  })

  test('shuts the pane a drag carries it to the edge of, down to its collapsed size', async () => {
    const { events, props } = heard()
    await render(<Splitter collapsedSize={8} defaultPosition={50} {...props} />)
    await dragBy(400)
    expect(reading()).toEqual({ max: 100, min: 0, now: 92, text: 'Collapsed' })
    expect(events.slice(-2)).toEqual(['before-collapse end', 'collapse end'])
    await key('Enter')
    expect(reading().now).toBe(50)
  })

  test('starts with a pane shut, and leaves a pane that may not shut open at the edge', async () => {
    await render(<Splitter defaultCollapsed="start" />)
    expect(reading().text).toBe('Collapsed')
    await render(<Splitter collapsible="none" defaultPosition={10} />)
    await key('Home')
    expect(reading().now).toBe(0)
    await key('Enter')
    expect(reading().text).toBe('0%')
  })

  test('holds a length bound against its own length', async () => {
    await render(<Splitter defaultPosition={10} min="100px" />)
    await lay()
    expect(reading().now).toBe(25)
  })

  test('stands its panes one above the other, and moves along that axis', async () => {
    await render(<Splitter defaultPosition={50} orientation="vertical" />)
    expect(StyleSheet.flatten(host().props.style)?.flexDirection).toBe('column')
    await key('ArrowRight')
    expect(reading().now).toBe(50)
    await key('ArrowDown')
    expect(reading().now).toBe(52)
    await dragBy(-48, true)
    expect(reading().now).toBe(40)
  })

  test('keeps the primary pane its length as its own length changes', async () => {
    await render(<Splitter defaultPosition={25} primary="start" />)
    await lay()
    await act(async () => {
      fireEvent(host(), 'layout', {
        nativeEvent: { layout: { height: 200, width: 200, x: 0, y: 0 } },
      })
    })
    expect(reading().now).toBe(50)
  })

  test('follows a written position, with nothing sent', async () => {
    const { events, props } = heard()
    const view = await render(<Splitter position={30} {...props} />)
    expect(reading().now).toBe(30)
    await view.rerender(<Splitter position={60} {...props} />)
    expect(reading().now).toBe(60)
    expect(events).toEqual([])
  })
})
