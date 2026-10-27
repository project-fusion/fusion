/*
 * A layer that swipes: a drawer along the end edge of the window that rests at
 * its snap points and dismisses as a swipe takes it out. The swipe's gesture is
 * `drivers/swipe.jest.tsx`'s; here `useSwipe` stands in, so the spec reads
 * what the layer asks of it and answers as a release would.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import type { SwipeSetup } from '../drivers/swipe'
import { element } from '../render/element'
import { LayerHostView } from '../root/layers'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'

/** What the stand-in was last asked, and the share it says the layer rests at. */
const mockSwipe = { setup: undefined as SwipeSetup | undefined, shown: 0.5 }

jest.mock('../drivers/swipe', () => {
  const actual = jest.requireActual<Record<string, unknown>>('../drivers/swipe')
  return {
    ...actual,
    useSwipe: (setup: SwipeSetup) => {
      mockSwipe.setup = setup
      return {
        gesture: jest
          .requireActual<{ usePanGesture: () => unknown }>('react-native-gesture-handler')
          .usePanGesture(),
        measure: () => undefined,
        scroller: undefined,
        shown: mockSwipe.shown,
        style: {},
      }
    },
  }
})

type Rule = Extract<NonNullable<Family['rules']>[number], { readonly kind: 'rule' }>

/** A drawer: a modal layer along the end edge that swipes and rests at its snap points. */
const drawerForm: Family = {
  api: {
    events: [{ cancelable: true, detail: ['open'], name: 'before-close' }],
    props: [
      { attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' },
      { attribute: true, default: '', name: 'snap-points', tier: 'headless', type: 'string' },
    ],
    states: ['open', 'snapped'],
    toggle: { checked: 'open', closes: 'before-close' },
  },
  machines: [
    {
      bind: { checked: { prop: 'open' }, closes: { event: 'before-close' } },
      machine: 'toggle',
    },
    {
      bind: { open: { prop: 'open' }, part: { part: 'panel' }, snap: { prop: 'snap-points' } },
      machine: 'layer',
    },
  ],
  name: 'drawer',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set: [['opacity', { number: 0.5 }]],
      specificity: [0, 2, 0],
      target: 'panel',
      values: [],
      webOnly: false,
      when: [{ kind: 'state', name: 'snapped' }],
    } satisfies Rule,
  ],
  tag: 'helix-drawer',
  tree: [
    {
      attributes: {
        edge: 'end',
        modal: true,
        open: { bind: 'open' },
        role: 'dialog',
        snap: { bind: 'snap-points' },
        swipe: true,
      },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'layer',
      name: 'panel',
    },
  ],
  version: '2.0',
}

const Drawer = element(drawerForm, behaviorFor(drawerForm))

/** Draws the drawer open, telling `closing` as it is asked to close. */
const draw = async (closing?: (event: { preventDefault: () => void }) => void) => {
  const drawn = await render(
    <GestureHandlerRootView>
      <ThemeProvider tokens={{}}>
        <LayerHostView>
          <Drawer onBeforeClose={closing} open snapPoints="0.5 1">
            <Text>Filters</Text>
          </Drawer>
        </LayerHostView>
      </ThemeProvider>
    </GestureHandlerRootView>,
  )
  await act(() => new Promise<void>((done) => setTimeout(done, 40)))
  return drawn
}

/** The flat style of the drawer's own view. */
const panelStyle = (drawn: Awaited<ReturnType<typeof render>>) => {
  const view = drawn.container.queryAll(
    (one) => one.props.role === 'dialog' && one.props.onAccessibilityEscape !== undefined,
  )[0]
  return Object.assign({}, ...[view?.props.style].flat(3)) as Record<string, unknown>
}

describe('a layer that swipes', () => {
  test('stands along its edge, and swipes along it with the points its prop holds', async () => {
    const drawn = await draw()
    expect(screen.getByText('Filters')).toBeTruthy()
    const along = drawn.container.queryAll((one) => {
      const style = one.props.style as { flexDirection?: string; justifyContent?: string }
      return style?.flexDirection === 'row' && style.justifyContent === 'flex-end'
    })
    expect(along.length).toBeGreaterThan(0)
    expect(mockSwipe.setup?.edge).toBe('right')
    expect(mockSwipe.setup?.points).toBe('0.5 1')
    expect(mockSwipe.setup?.open).toBe(true)
  })

  test('is snapped while it rests short of the whole', async () => {
    mockSwipe.shown = 0.5
    const half = await draw()
    expect(panelStyle(half).opacity).toBe(0.5)
    mockSwipe.shown = 1
    const whole = await draw()
    expect(panelStyle(whole).opacity).toBeUndefined()
  })

  test('asks its toggle to close as a swipe takes it out, which may refuse', async () => {
    const refusing = jest.fn((event: { preventDefault: () => void }) => event.preventDefault())
    await draw(refusing)
    let dismissed: boolean | undefined
    await act(async () => {
      dismissed = mockSwipe.setup?.settle(0)
    })
    expect(dismissed).toBe(true)
    expect(refusing).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Filters')).toBeTruthy()
    /* A rest at a snap point asks nothing. */
    expect(mockSwipe.setup?.settle(1)).toBe(true)
    expect(refusing).toHaveBeenCalledTimes(1)
  })
})
