/*
 * The native half of the fake image source: a picture drawn with
 * `FakePicture` answers as its source says, through the load machine.
 */
import { fakeImage } from '@fusion.dev/helix-testing/conformance'
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { made } from '../../src/render/image.fixtures'
import { setPictureView } from '../../src/render/picture'
import { ThemeProvider } from '../../src/theme/theme'
import { FakePicture } from './images'

const Picture = made()

beforeAll(() => setPictureView(FakePicture))
afterAll(() => setPictureView())

/** The opacity the picture is drawn at: 0 loading, 1 loaded, and 0.5 in error. */
const opacity = (): unknown =>
  Object.assign(
    {},
    ...[screen.getByTestId('image', { includeHiddenElements: true }).props.style]
      .flat(3)
      .filter(Boolean),
  ).opacity

const drawn = (src: string, heard: Readonly<Record<string, unknown>> = {}) => (
  <ThemeProvider tokens={{}}>
    <Picture alt="A lake" src={src} {...heard} />
  </ThemeProvider>
)

describe('a fake image source', () => {
  test('that loads sends load, and the picture stands loaded', async () => {
    const onLoad = jest.fn()
    await render(drawn(fakeImage('loads'), { onLoad }))
    await act(async () => undefined)
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(opacity()).toBe(1)
  })

  test('that fails sends error, and the picture stands in error', async () => {
    const onError = jest.fn()
    await render(drawn(fakeImage('fails'), { onError }))
    await act(async () => undefined)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(opacity()).toBe(0.5)
  })

  test('that hangs sends nothing, and the picture stays loading', async () => {
    const onError = jest.fn()
    const onLoad = jest.fn()
    await render(drawn(fakeImage('hangs'), { onError, onLoad }))
    await act(async () => undefined)
    expect(onLoad).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(opacity()).toBe(0)
  })
})
