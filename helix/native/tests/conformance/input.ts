import { type Intent, itemsOf } from '@fusion.dev/helix-testing/conformance'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { nodeOf, pressOf, type Run, type View, wordsOf } from './views'

/*
 * The input the React Native half of the conformance suite performs: a key
 * where focus is, a move of a row's grip, a tap, and a scroll.
 */

/**
 * A key pressed where focus is. One nothing takes, Enter or Space, activates
 * the view with focus.
 */
export const key = async (run: Run, intent: Extract<Intent, { kind: 'key' }>): Promise<void> => {
  const at = run.focus.focused()
  if (at === null) {
    return
  }
  const { alt, shift, toggle } = intent.held ?? {}
  const held = { alt: alt === true, control: toggle === true, shift: shift === true }
  let taken = false
  await act(() => {
    taken = run.keys.press(at, intent.key, held)
  })
  if (!taken && (intent.key === 'Enter' || intent.key === ' ')) {
    const { setup } = run.scenario
    const item = itemsOf(setup).find((one) => nodeOf(run, one.words) === at)
    await fireEvent.press(pressOf(item?.words ?? wordsOf(setup, undefined)))
  }
}

/** Adjusts an item's grip as a screen reader does, with focus on the item. */
export const move = async (
  run: Run,
  intent: Extract<Intent, { kind: 'move' }>,
): Promise<string | undefined> => {
  const words = wordsOf(run.scenario.setup, intent.item)
  const adjusts = (view: View) =>
    ((view.props.accessibilityActions ?? []) as { readonly name: string }[]).some(
      (one) => one.name === 'increment',
    )
  const grip = pressOf(words).queryAll(adjusts)[0]
  if (grip === undefined) {
    return 'The row draws no grip to adjust.'
  }
  run.focus.place(nodeOf(run, words))
  await fireEvent(grip, 'accessibilityAction', {
    nativeEvent: { actionName: intent.by > 0 ? 'increment' : 'decrement' },
  })
  return undefined
}

/**
 * A quick tap, as React Native reports one: the finger down, the press, and
 * the finger up after it. A view that refuses a touch, as a disabled press
 * does, hears none of the three.
 */
export const tap = async (view: View): Promise<void> => {
  const nativeEvent = { locationX: 0, locationY: 0, pageX: 0, pageY: 0, timestamp: 0 }
  await fireEvent(view, 'pressIn', { nativeEvent })
  await fireEvent.press(view, { nativeEvent })
  await fireEvent(view, 'pressOut', { nativeEvent })
}

/**
 * Scrolls the setup's part that scrolls to `x` and `y`, and ends its glide
 * there, as a reader's flick does. **A part that scrolls both ways is a
 * scroll view across inside one down**, and each hears its own axis.
 */
export const scroll = async (
  intent: Extract<Intent, { kind: 'scroll' }>,
): Promise<string | undefined> => {
  const root = screen.root
  const views =
    root === null
      ? []
      : [root, ...root.queryAll(() => true)].filter(
          (node) => typeof node.props.onMomentumScrollEnd === 'function',
        )
  const [outer, inner] = views
  if (outer === undefined) {
    return 'The setup draws no part that scrolls.'
  }
  const paired = inner?.props.nestedScrollEnabled === true
  /* One act for the whole glide, so what the elements do once it renders,
     as an outline marks a section, comes after the glide's end, as the web
     marks it in the frame after its `scrollend`. */
  const glide = async (view: View, x: number, y: number) => {
    const nativeEvent = { contentOffset: { x, y } }
    await act(async () => {
      await fireEvent(view, 'momentumScrollBegin', { nativeEvent })
      await fireEvent.scroll(view, { nativeEvent })
      await fireEvent(view, 'momentumScrollEnd', { nativeEvent })
    })
  }
  await glide(outer, paired ? 0 : intent.x, intent.y)
  if (paired && inner !== undefined) {
    await glide(inner, intent.x, 0)
  }
  return undefined
}
