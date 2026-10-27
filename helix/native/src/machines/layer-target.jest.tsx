/*
 * A layer placed against a view the page registers by id, as a tour stop is
 * placed against the control it explains: Floating UI is handed the view
 * `useTarget` registered under the id the stop's `for` holds, and the view
 * registered later under another id once `for` names that one.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import { Text, View } from 'react-native'
import { element } from '../render/element'
import { useTarget } from '../render/targets'
import { LayerHostView } from '../root/layers'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'

/** Each view Floating UI was handed as the reference. */
const mockReferences: unknown[] = []

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: () => ({
      middlewareData: {},
      placement: 'right-start',
      refs: {
        reference: { current: null },
        setFloating: () => undefined,
        setReference: (node: unknown) => {
          mockReferences.push(node)
        },
      },
      update: () => undefined,
      x: 0,
      y: 0,
    }),
  }
})

const stopForm: Family = {
  api: {
    events: [],
    props: [
      { attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' },
      { attribute: true, default: '', name: 'for', tier: 'headless', type: 'string' },
    ],
    states: [
      'open',
      'placed-bottom',
      'placed-left',
      'placed-right',
      'placed-top',
      'aligned-end',
      'aligned-start',
    ],
    toggle: { checked: 'open' },
  },
  machines: [
    { bind: { checked: { prop: 'open' } }, machine: 'toggle' },
    {
      bind: { open: { prop: 'open' }, part: { part: 'surface' }, target: { prop: 'for' } },
      machine: 'layer',
    },
  ],
  name: 'tour-stop',
  rules: [],
  tag: 'helix-tour-stop',
  tree: [
    {
      attributes: { open: { bind: 'open' }, role: 'dialog', target: { bind: 'for' } },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'layer',
      name: 'surface',
    },
  ],
  version: '2.0',
}

const Stop = element(stopForm, behaviorFor(stopForm))

/** The views the page registered, as their refs were handed them. */
const seen: { save?: unknown; share?: unknown } = {}

/** Two controls the page registers, and a stop placed against the one `at` names. */
function Page({ at }: { readonly at: string }) {
  const save = useTarget('save')
  const share = useTarget('share')
  return (
    <>
      <View
        ref={(node) => {
          save(node)
          seen.save = node
        }}
      />
      <View
        ref={(node) => {
          share(node)
          seen.share = node
        }}
      />
      <Stop for={at} open>
        <Text>Save your work here.</Text>
      </Stop>
    </>
  )
}

describe('a layer placed against a target', () => {
  test('is handed the view registered under the id its prop holds', async () => {
    const app = (at: string) => (
      <ThemeProvider tokens={{}}>
        <LayerHostView>
          <Page at={at} />
        </LayerHostView>
      </ThemeProvider>
    )
    const drawn = await render(app('save'))
    await act(() => new Promise<void>((done) => setTimeout(done, 40)))
    const handed = () => mockReferences.filter((one) => one !== null && one !== undefined).at(-1)
    expect(handed() === seen.save).toBe(true)
    await drawn.rerender(app('share'))
    await act(() => new Promise<void>((done) => setTimeout(done, 40)))
    expect(handed() === seen.share).toBe(true)
  })
})
