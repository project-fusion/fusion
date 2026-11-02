/*
 * A scroll view inside a layer that swipes: while the layer rests short of the
 * whole, a drag on the scroll view is the layer's, so the scroll view does not
 * scroll. Along the other axis, and at the whole, it scrolls as usual.
 */
import { describe, expect, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler'
import { ThemeProvider } from '../theme/theme'
import { SwipeScrollerContext } from './layered'
import { ScrollArea } from './scroll'

const Inside = ({ axis, waits }: { readonly axis: 'x' | 'y'; readonly waits: boolean }) => {
  const gesture = usePanGesture({})
  return (
    <SwipeScrollerContext.Provider
      value={
        {
          axis,
          gesture,
          ref: { current: null },
          scrolled: () => undefined,
          waits,
        } as never
      }
    >
      <ScrollArea>
        <Text>Quarterly report</Text>
      </ScrollArea>
    </SwipeScrollerContext.Provider>
  )
}

const enabled = async (axis: 'x' | 'y', waits: boolean) => {
  const drawn = await render(
    <GestureHandlerRootView>
      <ThemeProvider tokens={{}}>
        <Inside axis={axis} waits={waits} />
      </ThemeProvider>
    </GestureHandlerRootView>,
  )
  return drawn.container.queryAll((one) => one.props.scrollEnabled !== undefined)[0]?.props
    .scrollEnabled
}

describe('a scroll view inside a layer that swipes', () => {
  test('does not scroll while the layer rests short of the whole', async () => {
    expect(await enabled('y', true)).toBe(false)
  })

  test('scrolls once the layer stands whole', async () => {
    expect(await enabled('y', false)).toBe(true)
  })

  test('scrolls where the layer swipes along the other axis', async () => {
    expect(await enabled('x', true)).toBe(true)
  })
})
