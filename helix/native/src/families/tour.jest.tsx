/*
 * The generated Tour, drawn from its real intermediate forms in the layer
 * host: stops placed against the views the page registers by id, shown one
 * at a time, with Skip, Back, and Next, each move asked first and told
 * after, Done finishing the tour on the last stop, a close request skipping
 * it, the tour's labels over each stop's own, a stop's place said and drawn,
 * a `wait` stop that moves on once its target registers, a stop's `effect`,
 * and the spotlight measured around the current target. Floating UI's hook
 * stands in for the one that measures views on a device, as in
 * `popover.jest.tsx`. `test:native` writes the components beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import { type ReactNode, useEffect } from 'react'
import { Text } from 'react-native'
import { useTarget } from '../render/targets'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixButton } from './button/index.native'
import { HelixTour, HelixTourStop } from './tour/index.native'

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: () => ({
      middlewareData: {},
      placement: 'bottom',
      refs: {
        reference: { current: null },
        setFloating: () => undefined,
        setReference: () => undefined,
      },
      update: () => undefined,
      x: 20,
      y: 120,
    }),
  }
})

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
let announced: FakeAnnounce
let focused: FakeFocus<unknown>

/** The app, with what the spec draws in it, under the layer host. */
const app = (content: ReactNode) => (
  <ThemeProvider tokens={light}>
    <LayerHostView>
      <Text>Page</Text>
      {content}
    </LayerHostView>
  </ThemeProvider>
)

/** A few frames, which the host, the focus, and the measures wait for. */
const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 60)))

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** Whether the words are drawn. */
const shows = (words: string) =>
  viewsWhere(() => true).some(
    (node) =>
      node.type === 'Text' &&
      [node.props.children].flat(3).some((child) => typeof child === 'string' && child === words),
  )

/** The press whose words are `words`. */
const press = (words: string) =>
  viewsWhere((props) => props.accessibilityRole === 'button' || props.role === 'button').find(
    (node) => node.queryAll((inner) => [inner.props.children].flat(3).includes(words)).length > 0,
  )

const tap = async (words: string) => {
  const found = press(words)
  expect(found === undefined).toBe(false)
  await act(async () => {
    fireEvent.press(found as never)
  })
  await frames()
}

/** A view registered under `id`, measured where `box` says, as a control the tour explains. */
function Measured({ box, id }: { readonly box: readonly number[]; readonly id: string }) {
  const register = useTarget(id)
  useEffect(() => {
    register({
      measureInWindow: (done: (x: number, y: number, w: number, h: number) => void) =>
        done(box[0] ?? 0, box[1] ?? 0, box[2] ?? 0, box[3] ?? 0),
    })
    return () => register(null)
  }, [box, register])
  return null
}

/** A tour of two stops over a Save and a Share button. */
const tour = (props: Readonly<Record<string, unknown>> = {}, stops: ReactNode = null) => (
  <>
    <HelixButton id="save">Save</HelixButton>
    <HelixButton id="share">Share</HelixButton>
    <HelixTour label="Getting started" open {...props}>
      {stops ?? (
        <>
          <HelixTourStop for="save">
            <Text>Save your work here.</Text>
          </HelixTourStop>
          <HelixTourStop for="share">
            <Text>Share it with your team.</Text>
          </HelixTourStop>
        </>
      )}
    </HelixTour>
  </>
)

beforeEach(() => {
  keys = fakeKeys()
  announced = fakeAnnounce()
  focused = fakeFocus()
  setKeys(keys)
  setFocus(focused)
  setAnnounce(announced)
})

function Later({ shown }: { readonly shown: boolean }) {
  return shown ? <Measured box={[0, 0, 10, 10]} id="later" /> : null
}

describe('the generated Tour', () => {
  test('shows its first stop, with Skip and Next and no Back, and says its name, its words, and its place', async () => {
    await draw(tour())
    expect(shows('Save your work here.')).toBe(true)
    expect(shows('Share it with your team.')).toBe(false)
    expect(press('Skip') === undefined).toBe(false)
    expect(press('Next') === undefined).toBe(false)
    expect(press('Back') === undefined).toBe(true)
    expect(announced.said.map((one) => one.message)).toContain(
      'Getting started. Save your work here. 1 of 2',
    )
  })

  test('asks each move first and tells it after, and Done on the last stop finishes the tour', async () => {
    const heard: string[] = []
    const hear =
      (name: string) =>
      (event: { detail?: Readonly<Record<string, unknown>>; newState?: string }) =>
        heard.push(`${name} ${JSON.stringify(event.detail ?? {})}`)
    await draw(
      tour({
        onActivate: hear('activate'),
        onBeforeActivate: hear('before-activate'),
        onComplete: hear('complete'),
        onToggle: hear('toggle'),
        onTourAsk: hear('tour-ask'),
        onTourStatus: hear('tour-status'),
      }),
    )
    await tap('Next')
    expect(shows('Share it with your team.')).toBe(true)
    expect(press('Back') === undefined).toBe(false)
    expect(press('Done') === undefined).toBe(false)
    await tap('Done')
    expect(shows('Share it with your team.')).toBe(false)
    expect(heard).toEqual([
      'tour-ask {"what":"next"}',
      'before-activate {"value":"1"}',
      'activate {"value":"1"}',
      'tour-ask {"what":"next"}',
      'complete {"value":"1"}',
      'tour-status {"index":1,"status":"completed"}',
      'toggle {"newState":"closed","oldState":"open"}',
    ])
  })

  test('a refused move stays, Back goes back, and Skip asks before-close', async () => {
    const closing = jest.fn((event: { preventDefault: () => void }) => event.preventDefault())
    const status = jest.fn()
    await draw(
      tour({
        defaultIndex: 1,
        onBeforeActivate: (event: { preventDefault: () => void }) => event.preventDefault(),
        onBeforeClose: closing,
        onTourStatus: status,
      }),
    )
    expect(shows('Share it with your team.')).toBe(true)
    await tap('Back')
    expect(shows('Share it with your team.')).toBe(true)
    await tap('Skip')
    expect(closing).toHaveBeenCalledTimes(1)
    expect(status).not.toHaveBeenCalled()
    expect(shows('Share it with your team.')).toBe(true)
  })

  test('a close request skips the tour, and focus goes to the stop and back', async () => {
    const status = jest.fn()
    await draw(tour({ onTourStatus: status }))
    await act(async () => {
      keys.press(null, 'Escape')
    })
    await frames()
    expect(status).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { index: 0, status: 'skipped' } }),
    )
    expect(shows('Save your work here.')).toBe(false)
  })

  test('takes the tour’s labels over each stop’s own, and draws the place under `progress`', async () => {
    await draw(
      tour({
        backLabel: 'Go back',
        defaultIndex: 1,
        doneLabel: 'Got it',
        progress: true,
        progressLabel: 'Step {index} of {count}',
        skipLabel: 'Not now',
      }),
    )
    expect(press('Got it') === undefined).toBe(false)
    expect(press('Go back') === undefined).toBe(false)
    expect(press('Not now') === undefined).toBe(false)
    expect(shows('Step 2 of 2')).toBe(true)
  })

  test('a `wait` stop waits for its target to register, then moves on by itself', async () => {
    const status = jest.fn()
    const stops = (
      <>
        <HelixTourStop for="save">
          <Text>Open the menu.</Text>
        </HelixTourStop>
        <HelixTourStop for="later" type="wait" />
        <HelixTourStop for="share">
          <Text>Share it with your team.</Text>
        </HelixTourStop>
      </>
    )
    const page = (shown: boolean) =>
      app(
        <>
          <Later shown={shown} />
          {tour({ defaultIndex: 1, onTourStatus: status }, stops)}
        </>,
      )
    drawn = await render(page(false))
    await frames()
    expect(status).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { index: 1, status: 'waiting' } }),
    )
    expect(shows('Share it with your team.')).toBe(false)
    await act(async () => {
      drawn?.rerender(page(true))
    })
    await frames()
    expect(shows('Share it with your team.')).toBe(true)
  })

  test('runs a stop’s effect as the tour reaches it, and what it returns as it leaves', async () => {
    const left = jest.fn()
    const effect = jest.fn(() => left)
    const stops = (
      <>
        <HelixTourStop effect={effect} for="save">
          <Text>Save your work here.</Text>
        </HelixTourStop>
        <HelixTourStop for="share">
          <Text>Share it with your team.</Text>
        </HelixTourStop>
      </>
    )
    await draw(tour({}, stops))
    expect(effect).toHaveBeenCalledTimes(1)
    await tap('Next')
    expect(left).toHaveBeenCalledTimes(1)
  })

  test('lights the current target, its padding around it, and a dialog stop over the backdrop', async () => {
    const stops = (
      <>
        <HelixTourStop for="lit">
          <Text>Here.</Text>
        </HelixTourStop>
        <HelixTourStop type="dialog">
          <Text>All done.</Text>
        </HelixTourStop>
      </>
    )
    await draw(
      <>
        <Measured box={[40, 100, 120, 44]} id="lit" />
        {tour({ spotlightPadding: 8 }, stops)}
      </>,
    )
    const scrim = viewsWhere(
      (props) =>
        typeof props.style === 'object' &&
        props.style !== null &&
        Number((props.style as { width?: unknown }).width) >= 1000,
    )
    expect(scrim.length > 0).toBe(true)
    const lit = viewsWhere(
      (props) =>
        JSON.stringify(props.style ?? {}).includes('"left":32') &&
        JSON.stringify(props.style).includes('"top":92'),
    )
    expect(lit.length > 0).toBe(true)
    await tap('Next')
    expect(shows('All done.')).toBe(true)
  })

  test("keeps Skip to the start of its row and draws Next in its button's label color", async () => {
    await draw(tour())
    const styleOf = (node: unknown) =>
      Object.assign(
        {},
        ...[(node as { props: { style?: unknown } }).props.style].flat(3),
      ) as Record<string, unknown>
    const skip = press('Skip')
    expect(styleOf(skip?.parent).marginEnd).toBe('auto')
    /* A solid button's words are its own label color, never the panel's. */
    const words = (said: string) =>
      viewsWhere((props) => [props.children].flat(3).includes(said)).find(
        (node) => node.type === 'Text',
      )
    expect(styleOf(words('Next')).color).toBe(light['color-foreground-on-primary'])
    expect(styleOf(words('Skip')).color).toBe(light['color-foreground'])
  })
})
