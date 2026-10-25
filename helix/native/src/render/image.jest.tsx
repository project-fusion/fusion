/*
 * An `image` node: React Native's `Image`, with the part's `object-fit`,
 * and the load machine that sets the web's states and sends its events.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { ThemeProvider } from '../theme/theme'
import { made } from './image.fixtures'

const Picture = made()
const Avatar = made('error')

const drawn = (props: Readonly<Record<string, unknown>>, Drawn = Picture) => (
  <ThemeProvider tokens={{}}>
    <Drawn {...props} />
  </ThemeProvider>
)

/** The picture, which a screen reader passes over where it is decoration. */
const image = () => screen.getByTestId('image', { includeHiddenElements: true })

/** The style the picture is drawn with, flattened. */
const style = (): Record<string, unknown> =>
  Object.assign({}, ...[image().props.style].flat(3).filter(Boolean))

const lake = { alt: 'A lake', src: 'https://example.com/lake.png' }

describe('an image node', () => {
  test('draws its source, named by its alt, and fits the picture as object-fit says', async () => {
    await render(drawn(lake))
    expect(image().props.source).toEqual({ uri: 'https://example.com/lake.png' })
    expect(image().props.accessibilityLabel).toBe('A lake')
    expect(style()).toMatchObject({ objectFit: 'cover', opacity: 0 })
    await act(async () => fireEvent(image(), 'load'))
    expect(style()).toMatchObject({ opacity: 1 })
  })

  test('sends load once, and an answer after it moves nothing', async () => {
    const onError = jest.fn()
    const onLoad = jest.fn()
    await render(drawn({ ...lake, onError, onLoad }))
    await act(async () => fireEvent(image(), 'load'))
    await act(async () => fireEvent(image(), 'load'))
    await act(async () => fireEvent(image(), 'error'))
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
    expect(style()).toMatchObject({ opacity: 1 })
  })

  test('sends error as it fails, and a new source starts over at loading', async () => {
    const onError = jest.fn()
    const onLoad = jest.fn()
    const view = await render(drawn({ ...lake, onError, onLoad }))
    await act(async () => fireEvent(image(), 'error'))
    expect(onError).toHaveBeenCalledTimes(1)
    await act(async () => view.rerender(drawn({ ...lake, onError, onLoad, src: 'b.png' })))
    expect(style()).toMatchObject({ opacity: 0 })
    await act(async () => fireEvent(image(), 'load'))
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(style()).toMatchObject({ opacity: 1 })
  })

  test('draws its box and no picture with no source, and an empty alt is decoration', async () => {
    await render(drawn({ alt: '', src: '' }))
    expect(image().props.source).toBeUndefined()
    expect(image().props.accessibilityElementsHidden).toBe(true)
  })
})

describe('a picture with no source', () => {
  test('stands loading, as Image does', async () => {
    await render(drawn({ src: '' }))
    expect(style()).toMatchObject({ opacity: 0 })
  })

  test('stands in error where its node says so, as Avatar shows its initials', async () => {
    await render(drawn({ src: '' }, Avatar))
    expect(style()).toMatchObject({ opacity: 0.5 })
  })

  test('fails in error as well', async () => {
    await render(drawn(lake))
    await act(async () => fireEvent(image(), 'error'))
    expect(style()).toMatchObject({ opacity: 0.5 })
  })
})
