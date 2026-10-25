/*
 * The generated Scroll Area, drawn from its real intermediate form: a box
 * that scrolls, a region while it has a name, in a state for each edge with
 * more past it, sending `scroll` as it moves and `scrollend` once it comes to
 * rest, and drawing its painted fades in the surface color, or in the fade
 * color it is given.
 * `test:native` writes the component beside this file.
 */
import { scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { nativeScroll } from '../capabilities/scroll'
import { wrapWidth } from '../render/scroll'
import { ScaledText } from '../render/text'
import { HelixTheme } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf } from './drawn'
import { HelixScrollArea } from './scroll-area/index.native'

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

const original = { scroll: scroll(), timers: timers() }
let clock: FakeTimers

/* The scroll capability `HelixRoot` installs, which the element observes. */
beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
  setScroll(nativeScroll)
})

afterEach(() => {
  setTimers(original.timers)
  setScroll(original.scroll)
})

/** The scroll view the viewport draws: the one that hears its glides. */
const scroller = (): Drawn | undefined =>
  screen.root?.queryAll((node) => typeof node.props.onMomentumScrollEnd === 'function')[0]

/** The scroll view's frame and content lengths, as a phone reports them after layout. */
const laidOut = async (frame: number, content: number) => {
  const view = scroller()
  if (view === undefined) {
    throw new Error('no scroll view')
  }
  await fireEvent(view as never, 'layout', {
    nativeEvent: { layout: { height: frame, width: 100, x: 0, y: 0 } },
  })
  await fireEvent(view as never, 'contentSizeChange', 100, content)
}

/** Scrolls the viewport down to `y`. */
const scrollTo = async (y: number) => {
  const view = scroller()
  const nativeEvent = { contentOffset: { x: 0, y } }
  await fireEvent.scroll(view as never, { nativeEvent })
}

/** The states the host was last drawn under, read from the painted fades it draws. */
const fades = (): Drawn[] =>
  nodes(screen.toJSON()).filter(
    (node) => styleOf(node).position === 'absolute' && styleOf(node).opacity !== undefined,
  )

describe('the generated Scroll Area', () => {
  test('is a scroll view down that shows the platform indicators', async () => {
    await render(
      themed(
        <HelixScrollArea>
          <Text>Words</Text>
        </HelixScrollArea>,
      ),
    )
    const view = scroller()
    expect(view?.props.showsVerticalScrollIndicator).toBe(true)
    expect(screen.getByText('Words')).toBeTruthy()
  })

  test('stacks its content down when it scrolls both ways, where a scroll view across lays it in a row', async () => {
    await render(
      themed(
        <HelixScrollArea>
          <Text>First</Text>
          <Text>Second</Text>
        </HelixScrollArea>,
      ),
    )
    const across = screen.root?.queryAll((node) => node.props.horizontal === true) ?? []
    expect(across.length).toBeGreaterThan(0)
    for (const view of across) {
      expect(view.props.contentContainerStyle).toMatchObject({ flexDirection: 'column' })
    }
  })

  test('scrolls along one axis alone under orientation', async () => {
    const view = await render(
      themed(<HelixScrollArea orientation="vertical">Words</HelixScrollArea>),
    )
    const views = () =>
      screen.root?.queryAll((node) => typeof node.props.onMomentumScrollEnd === 'function') ?? []
    expect(views().map((one) => one.props.horizontal === true)).toEqual([false])
    await view.rerender(themed(<HelixScrollArea orientation="horizontal">Words</HelixScrollArea>))
    expect(views().map((one) => one.props.horizontal === true)).toEqual([true])
  })

  test('is a region named by its label, and nothing a reader hears without one', async () => {
    const view = await render(themed(<HelixScrollArea label="Changes">Words</HelixScrollArea>))
    const named = nodes(screen.toJSON()).find((node) => node.props.accessibilityLabel === 'Changes')
    expect(named?.props.role).toBe('region')
    await view.rerender(themed(<HelixScrollArea>Words</HelixScrollArea>))
    expect(nodes(screen.toJSON()).some((node) => node.props.role === 'region')).toBe(false)
  })

  test('sends scroll as it moves and scrollend once it comes to rest', async () => {
    const heard: string[] = []
    await render(
      themed(
        <HelixScrollArea
          onScroll={() => heard.push('scroll')}
          onScrollEnd={() => heard.push('scrollend')}
        >
          <Text>Words</Text>
        </HelixScrollArea>,
      ),
    )
    await laidOut(100, 400)
    await scrollTo(50)
    expect(heard).toEqual(['scroll'])
    await act(async () => clock.advance(100))
    expect(heard).toEqual(['scroll', 'scrollend'])
  })

  test('draws the painted fades at the edges with more past them, under a fade color', async () => {
    await render(
      themed(
        <HelixScrollArea hooks={{ fadeColor: '#ff0000' }}>
          <Text>Words</Text>
        </HelixScrollArea>,
      ),
    )
    await laidOut(100, 400)
    const shown = () => fades().filter((node) => styleOf(node).opacity === 1).length
    expect(shown()).toBe(1)
    await scrollTo(150)
    expect(shown()).toBe(2)
    await scrollTo(300)
    expect(shown()).toBe(1)
  })

  test('paints its fades in the surface color with no fade color, where the web masks the content', async () => {
    await render(
      themed(
        <HelixScrollArea>
          <Text>Words</Text>
        </HelixScrollArea>,
      ),
    )
    await laidOut(100, 400)
    const painted = fades().filter((node) => styleOf(node).backgroundImage !== undefined)
    expect(painted.length).toBeGreaterThan(0)
    expect(fades().filter((node) => styleOf(node).opacity === 1).length).toBe(1)
  })

  test('grows to the height max-block-size names, and no further', async () => {
    await render(
      themed(
        <HelixScrollArea maxBlockSize="md">
          <Text>Words</Text>
        </HelixScrollArea>,
      ),
    )
    const capped = nodes(screen.toJSON()).map((node) => styleOf(node).maxHeight)
    expect(capped).toContain(192)
  })

  test('wraps its words at its own width when it scrolls both ways', async () => {
    await render(
      themed(
        <HelixScrollArea>
          <ScaledText>A note longer than the area is wide</ScaledText>
        </HelixScrollArea>,
      ),
    )
    await laidOut(100, 400)
    const words = screen.getByText('A note longer than the area is wide')
    expect(styleOf(words as never).maxWidth).toBe(100)
  })

  test('wraps its words at its width less the padding at each side of its content', () => {
    expect(wrapWidth(200, {})).toBe(200)
    expect(wrapWidth(200, { paddingHorizontal: 12 })).toBe(176)
    expect(wrapWidth(200, { padding: 10, paddingEnd: 4 })).toBe(186)
    expect(wrapWidth(200, { paddingStart: 8 })).toBe(192)
    expect(wrapWidth(undefined, { padding: 10 })).toBeUndefined()
  })
})
