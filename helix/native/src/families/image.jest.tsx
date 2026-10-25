/*
 * The generated Image, drawn from its real intermediate form: a picture
 * named by its `alt`, unseen until it loads, a placeholder over the box
 * while it is on its way, which `placeholder-delay` holds back, and a
 * fallback once it fails. Each picture answers as the conformance suite's
 * fake source says, and the delay runs on a fake clock. `test:native`
 * writes the component beside this file.
 */
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { setPictureView } from '../render/picture'
import { FakePicture, fakeImage } from '../render/picture.fixtures'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { type Drawn, nodes, styleOf } from './drawn'
import { HelixImage } from './image/index.native'

const original = timers()
let clock: FakeTimers

beforeAll(() => setPictureView(FakePicture))
afterAll(() => setPictureView())

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

/** Every node drawn, hidden ones too. */
const all = (): Drawn[] => nodes(screen.toJSON())

/** The picture. */
const picture = (): Drawn | undefined => all().find((node) => node.type === 'Image')

/** The views laid over the box: the placeholder, then the fallback. */
const covers = (): Drawn[] =>
  all().filter((node) => node.type === 'View' && styleOf(node).position === 'absolute')

const drawn = (src: string, extra: Readonly<Record<string, unknown>> = {}) =>
  themed(<HelixImage alt="A lake" fallback={<Text>Photo unavailable</Text>} src={src} {...extra} />)

describe('the generated Image', () => {
  test('is a picture named by its alt, unseen and under its placeholder while it loads', async () => {
    await render(drawn(fakeImage('hangs')))
    expect(picture()?.props.accessibilityLabel).toBe('A lake')
    expect(styleOf(picture() ?? { props: {} }).opacity).toBe(0)
    const [placeholder, fallback] = covers()
    expect(styleOf(placeholder ?? { props: {} }).display).not.toBe('none')
    expect(styleOf(placeholder ?? { props: {} }).backgroundColor).toBe(
      light['color-surface-sunken'],
    )
    expect(styleOf(fallback ?? { props: {} }).display).toBe('none')
  })

  test('once loaded, shows the picture and takes the placeholder away', async () => {
    await render(drawn(fakeImage('loads')))
    await act(async () => undefined)
    expect(styleOf(picture() ?? { props: {} }).opacity).toBe(1)
    expect(styleOf(covers()[0] ?? { props: {} }).display).toBe('none')
  })

  test('says the size it loaded at on its load event, as the web element gives it', async () => {
    const heard: string[] = []
    const onLoad = (event: {
      readonly currentTarget: { readonly naturalHeight?: number; readonly naturalWidth?: number }
    }) => {
      heard.push(`${event.currentTarget.naturalWidth} by ${event.currentTarget.naturalHeight}`)
    }
    await render(drawn(fakeImage('loads'), { onLoad }))
    await act(async () => undefined)
    expect(heard).toEqual(['400 by 238'])
  })

  test('once failed, shows the fallback in the muted ink', async () => {
    await render(drawn(fakeImage('fails')))
    await act(async () => undefined)
    const fallback = covers()[1]
    expect(styleOf(fallback ?? { props: {} }).display).not.toBe('none')
    expect(screen.getByText('Photo unavailable')).toBeTruthy()
  })

  test('once failed, is a 16 by 9 box that holds its fallback, as on the web', async () => {
    await render(drawn(fakeImage('fails')))
    await act(async () => undefined)
    const host = all()[0] ?? { props: {} }
    expect(styleOf(host).aspectRatio).toBe(16 / 9)
    expect(styleOf(host).minHeight).toBeUndefined()
    /* The failed picture lies over the box, so its full height sizes nothing. */
    expect(styleOf(picture() ?? { props: {} }).position).toBe('absolute')
    await render(drawn(fakeImage('loads')))
    await act(async () => undefined)
    expect(styleOf(all()[0] ?? { props: {} }).aspectRatio).toBe(16 / 9)
  })

  test('holds the placeholder back for its delay, and again for a new picture', async () => {
    const view = await render(drawn(fakeImage('hangs'), { placeholderDelay: 300 }))
    expect(styleOf(covers()[0] ?? { props: {} }).display).toBe('none')
    await act(async () => {
      clock.advance(300)
    })
    expect(styleOf(covers()[0] ?? { props: {} }).display).not.toBe('none')
    await view.rerender(drawn(fakeImage('hangs', 'next'), { placeholderDelay: 300 }))
    expect(styleOf(covers()[0] ?? { props: {} }).display).toBe('none')
  })
})
