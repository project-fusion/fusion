/*
 * An anchored layer that may be a sheet, and one with an arrow: a sheet in a
 * window narrower than 30rem at the reader's text size and a popover in a
 * wider one, either forced by `presentation`, padded by the safe area as a
 * sheet, and as a popover aligned to the end its placement names, its arrow
 * on the edge facing its anchor. Floating UI's hook stands in for the one
 * that measures views on a device, as in `layer-place.jest.tsx`.
 */
import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, Text } from 'react-native'
import { element } from '../render/element'
import { LayerHostView } from '../root/layers'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'
import { fromOrigin } from './layer-place'

/** What the stand-in hook was last asked, and what it answers. */
const mockFloating = {
  arrow: { x: 12 } as { x?: number; y?: number } | undefined,
  offset: 0,
  padding: undefined as number | undefined,
  placed: 0,
}

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: (options: {
      readonly middleware: readonly {
        readonly name?: string
        readonly options?: readonly unknown[]
      }[]
    }) => {
      mockFloating.placed += 1
      const found = (name: string) => options.middleware.find((one) => one.name === name)
      const offset = found('offset')?.options?.[0] as { readonly mainAxis?: number } | undefined
      mockFloating.offset = Number(offset?.mainAxis ?? 0)
      const arrow = found('arrow')?.options?.[0] as (() => { readonly padding: number }) | undefined
      mockFloating.padding = arrow?.().padding
      const size = found('size')?.options?.[0] as
        | { readonly apply: (state: Readonly<Record<string, unknown>>) => void }
        | undefined
      size?.apply({
        availableHeight: 240,
        availableWidth: 360,
        rects: { reference: { height: 40, width: 120, x: 20, y: 300 } },
      })
      return {
        middlewareData: mockFloating.arrow === undefined ? {} : { arrow: mockFloating.arrow },
        placement: 'bottom-start',
        refs: {
          reference: { current: null },
          setFloating: () => undefined,
          setReference: () => undefined,
        },
        update: () => undefined,
        x: 20,
        y: 344,
      }
    },
  }
})

type Rule = Extract<NonNullable<Family['rules']>[number], { readonly kind: 'rule' }>

/** A rule on `target` while `states` hold. */
const rule = (order: number, target: string, set: Rule['set'], states: string[] = []): Rule => ({
  kind: 'rule',
  order,
  set,
  specificity: [0, 1 + states.length, 0],
  target,
  values: [],
  webOnly: false,
  when: states.map((name) => ({ kind: 'state', name })),
})

/** A menu: a panel placed against its trigger, a sheet in a narrow window, with an arrow. */
const menuForm: Family = {
  api: {
    events: [{ cancelable: true, detail: ['open'], name: 'before-close' }],
    props: [
      { attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' },
      {
        attribute: true,
        default: 'auto',
        name: 'presentation',
        tier: 'headless',
        type: ['auto', 'popover', 'sheet'],
      },
    ],
    states: [
      'open',
      'sheet',
      'placed-bottom',
      'placed-left',
      'placed-right',
      'placed-top',
      'aligned-end',
      'aligned-start',
    ],
    toggle: { checked: 'open', closes: 'before-close' },
  },
  machines: [
    {
      bind: { checked: { prop: 'open' }, closes: { event: 'before-close' } },
      machine: 'toggle',
    },
    {
      bind: {
        anchor: { part: 'trigger' },
        arrow: { part: 'arrow' },
        open: { prop: 'open' },
        part: { part: 'surface' },
        presentation: { prop: 'presentation' },
      },
      machine: 'layer',
    },
  ],
  name: 'menu',
  rules: [
    rule(0, 'surface', [['border-radius', { text: '6px' }]]),
    rule(1, 'surface', [['opacity', { number: 0.5 }]], ['aligned-start']),
    rule(
      2,
      'surface',
      [
        [
          'padding-block-end',
          {
            calc: {
              op: '+',
              operands: [
                { text: '16px' },
                {
                  function: {
                    arguments: [{ text: 'safe-area-inset-bottom' }, { text: '0px' }],
                    name: 'env',
                  },
                },
              ],
            },
          },
        ],
      ],
      ['sheet'],
    ),
    rule(3, 'arrow', [
      ['inline-size', { text: '10px' }],
      ['block-size', { text: '10px' }],
      ['bottom', { text: '0' }],
    ]),
  ],
  tag: 'helix-menu',
  tree: [
    { attributes: { part: 'trigger' }, kind: 'region', name: 'trigger' },
    {
      attributes: {
        anchor: 'trigger',
        arrow: 'arrow',
        offset: 4,
        open: { bind: 'open' },
        presentation: { bind: 'presentation' },
        role: 'menu',
      },
      children: [
        { kind: 'box', name: 'arrow' },
        { kind: 'region', name: 'default' },
      ],
      kind: 'layer',
      name: 'surface',
    },
  ],
  version: '2.0',
}

const Menu = element(menuForm, behaviorFor(menuForm))

/** The window's width as Jest's React Native gives it. */
const width = Dimensions.get('window').width

/** A rem at which the window is narrower than 30rem, and one at which it is wider. */
const NARROW = Math.ceil(width / 30) + 1
const WIDE = Math.floor(width / 30) - 1

beforeEach(() => {
  setEnvironment(fakeEnvironment({ insets: { bottom: 34, left: 0, right: 0, top: 59 } }))
  mockFloating.arrow = { x: 12 }
  mockFloating.placed = 0
})

/** Draws the menu open at `rem`, asking for `presentation`, telling `closing` as it is asked to close. */
const draw = async (rem: number, presentation?: 'popover' | 'sheet', closing?: () => void) => {
  const drawn = await render(
    <ThemeProvider rem={rem} tokens={{}}>
      <LayerHostView>
        <Menu
          onBeforeClose={closing}
          open
          presentation={presentation}
          trigger={<Text>Actions</Text>}
        >
          <Text>Rename</Text>
        </Menu>
      </LayerHostView>
    </ThemeProvider>,
  )
  await act(() => new Promise<void>((done) => setTimeout(done, 40)))
  return drawn
}

/** The flat style of the layer's own view, which a screen reader hears as `role`. */
const flatStyle = (drawn: Awaited<ReturnType<typeof render>>, role: string) => {
  const view = drawn.container.queryAll(
    (one) =>
      (one.props.role === role || one.props.accessibilityRole === role) &&
      one.props.onAccessibilityEscape !== undefined,
  )[0]
  return Object.assign({}, ...[view?.props.style].flat(3)) as Record<string, unknown>
}

describe('an anchored layer that names a presentation', () => {
  test('is a sheet along the bottom edge in a narrow window, padded by the safe area', async () => {
    const drawn = await draw(NARROW)
    expect(screen.getByText('Rename')).toBeTruthy()
    const frame = drawn.container.queryAll((one) => {
      const style = one.props.style as { justifyContent?: string } | undefined
      return style?.justifyContent === 'flex-end'
    })
    expect(frame.length).toBeGreaterThan(0)
    const menu = flatStyle(drawn, 'menu')
    expect(menu.paddingBottom).toBe(50)
    /* A sheet is placed by no anchor, and in no placed or aligned state. */
    expect(menu.opacity).toBeUndefined()
  })

  test('is a popover in a wide window, aligned to the end its placement names', async () => {
    const drawn = await draw(WIDE)
    const menu = flatStyle(drawn, 'menu')
    expect(menu.opacity).toBe(0.5)
    expect(menu.paddingBottom).toBeUndefined()
  })

  test('as a sheet, takes a press beside it on its scrim, which dismisses it', async () => {
    const closing = jest.fn()
    const drawn = await draw(NARROW, undefined, closing)
    const scrim = drawn.container.queryAll(
      (one) => one.props.importantForAccessibility === 'no' && one.props.accessible === false,
    )[0]
    expect(scrim).toBeDefined()
    await act(async () => {
      fireEvent.press(scrim as never)
    })
    expect(closing).toHaveBeenCalledTimes(1)
  })

  test('is the one `presentation` names at any width', async () => {
    expect(flatStyle(await draw(NARROW, 'popover'), 'menu').opacity).toBe(0.5)
    expect(flatStyle(await draw(WIDE, 'sheet'), 'menu').paddingBottom).toBe(50)
  })
})

describe('a layer’s arrow', () => {
  test('stands on the edge facing the anchor, where Floating UI puts it, and adds its reach to the offset', async () => {
    const drawn = await draw(WIDE)
    const arrow = drawn.container.queryAll(
      (one) => one.props.collapsable === false && typeof one.props.onLayout === 'function',
    )[0]
    expect(arrow).toBeDefined()
    expect(mockFloating.offset).toBe(4)
    await act(async () => {
      fireEvent(arrow as never, 'layout', { nativeEvent: { layout: { height: 10, width: 10 } } })
    })
    expect(mockFloating.offset).toBeCloseTo(4 + 10 / Math.SQRT2, 3)
    /* It keeps the layer's corner radius from either end. */
    expect(mockFloating.padding).toBe(6)
    const placed = Object.assign({}, ...[arrow?.props.style].flat(3)) as Record<string, unknown>
    expect(placed.position).toBe('absolute')
    expect(placed.left).toBe(12)
    expect(placed.top).toBe(-5)
    /* The rule's own bottom edge stands down, as the web writes it `auto`. */
    expect(placed.bottom).toBeUndefined()
  })
})

describe('an anchor measured in the window', () => {
  test('is moved into the host’s frame once for each measure', () => {
    const shift = fromOrigin(() => ({ x: 0, y: 24 }))
    const rects = {
      floating: { height: 100, width: 200, x: 0, y: 0 },
      reference: { height: 40, width: 120, x: 20, y: 324 },
    }
    const first = shift.fn({ middlewareData: {}, rects }) as {
      readonly data: { readonly rects: typeof rects }
      readonly reset: { readonly rects: typeof rects }
    }
    expect(first.reset.rects.reference.y).toBe(300)
    expect(first.reset.rects.floating).toBe(rects.floating)
    expect(
      shift.fn({ middlewareData: { helixOrigin: first.data }, rects: first.reset.rects }),
    ).toEqual({})
    /* Nothing to move where the host is at the window's corner and no bar was added. */
    expect(fromOrigin(() => ({ x: 0, y: 0 })).fn({ middlewareData: {}, rects })).toEqual({})
  })
})
