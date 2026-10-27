/*
 * A notice in the layer host: drawn above every other layer whenever it
 * opened, read and pressable while a modal layer holds the reader, and
 * taking no close request from the layers under it, as a toast's stack
 * stands over a dialog on the web.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Pressable, Text } from 'react-native'
import { behaviorFor } from '../machines/compose'
import { element } from '../render/element'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { drawnOrder, LayerHostView } from './layers'

/** An element whose one part is a layer that opens on `open`, with `attributes` on it. */
const layerForm = (name: string, attributes: Readonly<Record<string, unknown>>): Family => ({
  api: {
    events: [{ cancelable: true, detail: ['open'], name: 'before-close' }],
    props: [{ attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' }],
    states: ['open'],
    toggle: { checked: 'open', closes: 'before-close' },
  },
  machines: [
    {
      bind: { checked: { prop: 'open' }, closes: { event: 'before-close' } },
      machine: 'toggle',
    },
    { bind: { open: { prop: 'open' }, part: { part: 'surface' } }, machine: 'layer' },
  ],
  name,
  rules: [],
  tag: `helix-${name}`,
  tree: [
    {
      attributes: { open: { bind: 'open' }, ...attributes },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'layer',
      name: 'surface',
    },
  ],
  version: '2.0',
})

const dialogForm = layerForm('dialog', { modal: true, role: 'dialog' })
const Dialog = element(dialogForm, behaviorFor(dialogForm))
const stackForm = layerForm('stack', { closedby: 'closerequest', notice: true })
const Stack = element(stackForm, behaviorFor(stackForm))

let keys: FakeKeys<unknown>

beforeEach(() => {
  keys = fakeKeys()
  setKeys(keys)
  setFocus(fakeFocus())
})

describe('a notice', () => {
  test('is drawn after every other layer, whenever each opened', () => {
    const [dialog, toast, popover] = [{}, {}, {}]
    const order = drawnOrder([
      [toast, { notice: true }],
      [dialog, { notice: false }],
      [popover, {}],
    ])
    expect(order.map(([key]) => key)).toEqual([dialog, popover, toast])
  })

  test('opened before a modal dialog stays read and pressable over it, and leaves the dialog the close requests', async () => {
    const pressed = jest.fn()
    const dialogCloses = jest.fn((event: { preventDefault: () => void }) => event.preventDefault())
    const stackCloses = jest.fn()
    const app = (dialog: boolean) => (
      <ThemeProvider tokens={{}}>
        <LayerHostView>
          <Text>Page</Text>
          <Stack onBeforeClose={stackCloses} open>
            <Text>Saved</Text>
            <Pressable accessibilityRole="button" onPress={pressed}>
              <Text>Undo</Text>
            </Pressable>
          </Stack>
          <Dialog onBeforeClose={dialogCloses} open={dialog}>
            <Text>Rename</Text>
          </Dialog>
        </LayerHostView>
      </ThemeProvider>
    )
    await render(app(false))
    await screen.rerender(app(true))
    await act(() => new Promise<void>((done) => setTimeout(done, 40)))
    /* The page is hidden from a screen reader under the dialog, and the
       notice opened before it is not. */
    expect(screen.queryByText('Page')).toBeNull()
    expect(screen.getByText('Rename')).toBeTruthy()
    expect(screen.getByText('Saved')).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByText('Undo'))
    })
    expect(pressed).toHaveBeenCalledTimes(1)
    /* Escape is the dialog's, which is open over the page. */
    expect(keys.press(null, 'Escape')).toBe(true)
    expect(dialogCloses).toHaveBeenCalledTimes(1)
    expect(stackCloses).not.toHaveBeenCalled()
  })
})
