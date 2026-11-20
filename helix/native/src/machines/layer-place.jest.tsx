/*
 * A layer placed against its anchor: the side it lands on is a state of the
 * element, its place is where Floating UI puts it, and the room it has left
 * is a length its rules read. Floating UI's hook stands in for the one that
 * measures views on a device, and hands its `size` middleware the room a
 * device would.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { element } from '../render/element'
import { LayerHostView } from '../root/layers'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: (options: {
      readonly middleware: readonly {
        readonly name?: string
        readonly options?: readonly unknown[]
      }[]
      readonly placement: string
    }) => {
      const size = options.middleware.find((one) => one.name === 'size')
      const given = size?.options?.[0] as
        | { readonly apply: (state: Readonly<Record<string, unknown>>) => void }
        | undefined
      given?.apply({
        availableHeight: 240,
        availableWidth: 360,
        rects: { reference: { height: 40, width: 400, x: 20, y: 300 } },
      })
      return {
        placement: 'top-start',
        refs: {
          reference: { current: null },
          setFloating: () => undefined,
          setReference: () => undefined,
        },
        update: () => undefined,
        x: 20,
        y: 120,
      }
    },
  }
})

/** A popover: a panel placed against its trigger, which opens on `open`. */
const popoverForm: Family = {
  api: {
    events: [],
    props: [{ attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' }],
    states: ['open', 'placed-bottom', 'placed-left', 'placed-right', 'placed-top'],
    toggle: { checked: 'open' },
  },
  machines: [
    { bind: { checked: { prop: 'open' } }, machine: 'toggle' },
    {
      bind: { anchor: { part: 'trigger' }, open: { prop: 'open' }, part: { part: 'surface' } },
      machine: 'layer',
    },
  ],
  name: 'popover',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set: [['max-block-size', { measured: { name: 'floating-available-block-size' } }]],
      specificity: [0, 1, 0],
      target: 'surface',
      values: [],
      webOnly: false,
      when: [],
    },
    {
      kind: 'rule',
      order: 1,
      set: [['opacity', { number: 0.5 }]],
      specificity: [0, 2, 0],
      target: 'surface',
      values: [],
      webOnly: false,
      when: [{ kind: 'state', name: 'placed-top' }],
    },
  ],
  tag: 'helix-popover',
  tree: [
    { attributes: { part: 'trigger' }, kind: 'region', name: 'trigger' },
    {
      attributes: { anchor: 'trigger', open: { bind: 'open' }, role: 'dialog' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'layer',
      name: 'surface',
    },
  ],
  version: '2.0',
}

const Popover = element(popoverForm, behaviorFor(popoverForm))

describe('a layer placed against its anchor', () => {
  test('stands where Floating UI puts it, in the state of the side it landed on, told the room it has', async () => {
    const drawn = await render(
      <ThemeProvider tokens={{}}>
        <LayerHostView>
          <Popover open trigger={<Text>Filters</Text>}>
            <Text>Panel</Text>
          </Popover>
        </LayerHostView>
      </ThemeProvider>,
    )
    await act(() => new Promise<void>((done) => setTimeout(done, 40)))
    expect(screen.getByText('Panel')).toBeTruthy()
    const views = drawn.container.queryAll(() => true)
    const placed = views.find((one) => {
      const style = one.props.style as { left?: number; top?: number } | undefined
      return style?.left === 20 && style.top === 120
    })
    expect(placed).toBeDefined()
    const panel = views.find((one) => one.props.role === 'dialog')
    const flat = Object.assign({}, ...[panel?.props.style].flat(3)) as Record<string, unknown>
    expect(flat.maxHeight).toBe(240)
    expect(flat.opacity).toBe(0.5)
    /* The anchor is a view of its own, which Floating UI measures. */
    expect(
      views.some((one) => one.props.collapsable === false && one.queryAll(() => true).length > 0),
    ).toBe(true)
  })
})
