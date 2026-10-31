import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { ScrollView, Text } from 'react-native'
import { HelixRoot } from '../index'
import { HelixCarousel } from './carousel/index.native'

type Drawn = (given: Record<string, unknown>) => React.ReactNode
const Carousel = HelixCarousel as unknown as Drawn

const SLIDES = ['One', 'Two', 'Three', 'Four'].map((words) => <Text key={words}>{words}</Text>)

const FRAME = { nativeEvent: { layout: { height: 200, width: 320, x: 0, y: 0 } } }

interface Host {
  readonly props: Record<string, unknown>
  readonly type: string
}

/** The track's scroll view. */
const track = (): Host => {
  const found = screen.root?.queryAll((node: Host) => node.type === 'RCTScrollView')?.[0]
  return found as unknown as Host
}

/** Lays the track and its panes out, as a device reports them. */
const layOut = async (across = 288): Promise<void> => {
  await fireEvent(track() as never, 'layout', FRAME)
  for (const [at, name] of ['1 of 4', '2 of 4', '3 of 4', '4 of 4'].entries()) {
    await fireEvent(screen.getByLabelText(name), 'layout', {
      nativeEvent: { layout: { height: 100, width: across, x: 16 + at * (across + 16), y: 16 } },
    })
  }
}

/** A scroll that stands at `x`, and the quiet wait that says it came to rest. */
const rest = async (x: number): Promise<void> => {
  jest.useFakeTimers()
  await fireEvent.scroll(track() as never, {
    nativeEvent: {
      contentOffset: { x, y: 0 },
      contentSize: { height: 100, width: 1200 },
      layoutMeasurement: { height: 100, width: 320 },
    },
  })
  await act(async () => {
    jest.advanceTimersByTime(200)
  })
  jest.useRealTimers()
}

describe('Carousel on a phone', () => {
  test('draws a slide in each pane, named for where it stands', async () => {
    await render(
      <HelixRoot>
        <Carousel label="Folders">{SLIDES}</Carousel>
      </HelixRoot>,
    )
    expect(await screen.findByText('Three')).toBeTruthy()
    expect(screen.getByLabelText('3 of 4')).toBeTruthy()
    expect(screen.getByLabelText('Slide 4')).toBeTruthy()
  })

  test('the track snaps at each pane, clear of its bleed, and stops soon', async () => {
    await render(
      <HelixRoot>
        <Carousel label="Folders">{SLIDES}</Carousel>
      </HelixRoot>,
    )
    await layOut()
    const { props } = track()
    expect(props.snapToOffsets).toEqual([0, 304, 608, 912])
    expect(props.decelerationRate).toBe('fast')
    expect(props.disableIntervalMomentum).toBe(true)
  })

  test('slides per move leaves the track only its stops', async () => {
    await render(
      <HelixRoot>
        <Carousel label="Folders" slidesPerMove={2}>
          {SLIDES}
        </Carousel>
      </HelixRoot>,
    )
    await layOut()
    expect(track().props.snapToOffsets).toEqual([0, 608, 912])
  })

  test('a swipe that comes to rest moves the index once, through the request', async () => {
    const activate = jest.fn()
    await render(
      <HelixRoot>
        <Carousel label="Folders" onActivate={activate}>
          {SLIDES}
        </Carousel>
      </HelixRoot>,
    )
    await layOut()
    await rest(608)
    expect(activate).toHaveBeenCalledTimes(1)
    expect((activate.mock.calls[0]?.[0] as { detail: unknown } | undefined)?.detail).toEqual({
      value: '2',
    })
  })

  test('a refused swipe goes back to the slide the index holds', async () => {
    const refuse = (event: { preventDefault: () => void }) => event.preventDefault()
    const activate = jest.fn()
    await render(
      <HelixRoot>
        <Carousel label="Folders" onActivate={activate} onBeforeActivate={refuse}>
          {SLIDES}
        </Carousel>
      </HelixRoot>,
    )
    await layOut()
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => undefined)
    await rest(304)
    expect(activate).not.toHaveBeenCalled()
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ x: 0 }))
  })

  test('a press scrolls the track, and the rest of that scroll is not a reader moving it', async () => {
    const activate = jest.fn()
    await render(
      <HelixRoot>
        <Carousel controls="always" label="Folders" onActivate={activate}>
          {SLIDES}
        </Carousel>
      </HelixRoot>,
    )
    await layOut()
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => undefined)
    await fireEvent.press(screen.getByLabelText('Next slide'))
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ x: 304 }))
    expect(activate).toHaveBeenCalledTimes(1)
    /* A scroll of ours that rests a little short is still the place the press asked for. */
    await rest(0)
    expect(activate).toHaveBeenCalledTimes(1)
  })

  test('a fitted track draws no dots until its frame has been measured', async () => {
    await render(
      <HelixRoot>
        <Carousel label="Folders" perView="auto" style={{ '--carousel-slide-min': '10rem' }}>
          {SLIDES}
        </Carousel>
      </HelixRoot>,
    )
    expect(screen.queryByLabelText('Slide 1')).toBeNull()
  })

  test('the rotation control stands first, and after the arrows under an overlay', async () => {
    const order = async (placement: string) => {
      const view = await render(
        <HelixRoot>
          <Carousel autoplay controls="always" controlsPlacement={placement} label="Places">
            {SLIDES}
          </Carousel>
        </HelixRoot>,
      )
      const said = (screen.root?.queryAll((node: Host) => node.type === 'View') ?? [])
        .map((node) => (node as unknown as Host).props.accessibilityLabel)
        .filter((label) => typeof label === 'string' && /rotation|next|previous/i.test(label))
      await view.unmount()
      return said.findIndex((label) => /rotation/i.test(String(label))) === 0
    }
    expect(await order('top')).toBe(true)
    expect(await order('overlay')).toBe(false)
  })
})
