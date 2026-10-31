import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { HelixRoot } from '../index'
import type { LogHandle } from '../machines/log'
import { HelixLog, HelixLogGroup, HelixLogLine } from './log/index.native'

type Drawn = (given: Record<string, unknown>) => React.ReactNode
const Log = HelixLog as unknown as Drawn
const Line = HelixLogLine as unknown as Drawn
const Group = HelixLogGroup as unknown as Drawn

const draw = async (props: Record<string, unknown> = {}, children?: React.ReactNode) =>
  render(
    <HelixRoot>
      <Log label="Build" {...props}>
        {children}
      </Log>
    </HelixRoot>,
  )

/** A frame's worth of waiting, for lines written quickly. */
const frame = () => act(() => new Promise<void>((done) => setTimeout(done, 40)))

describe('log', () => {
  test('`write` holds a line until it ends, and a carriage return starts it over', async () => {
    const ref = createRef<LogHandle>()
    await draw({ ref })
    await act(async () => {
      ref.current?.write('Downloading 12%\rDownloading 100%')
    })
    await frame()
    expect(screen.getByText('Downloading 100%')).toBeTruthy()
    expect(screen.queryByText('Downloading 12%')).toBeNull()
    expect(ref.current?.lines.length).toBe(0)
    await act(async () => {
      ref.current?.write('\nnext\n')
    })
    await frame()
    expect(ref.current?.lines.length).toBe(2)
    expect(ref.current?.text).toBe('Downloading 100%\nnext')
  })

  test('a `source` that is an async iterable is read to its end, and sets `done`', async () => {
    const source = (async function* () {
      yield 'one\n'
      yield 'two\n'
    })()
    const ref = createRef<LogHandle>()
    await draw({ ref, source })
    await frame()
    expect(screen.getByText('two')).toBeTruthy()
    expect(ref.current?.done).toBe(true)
  })

  test('lines passed in are numbered in order, and a search hides the rest', async () => {
    await draw(
      { lineNumbers: true, query: 'keep' },
      <>
        <Line>keep one</Line>
        <Line>drop</Line>
        <Line>keep two</Line>
      </>,
    )
    expect(screen.getByLabelText('keep one')).toBeTruthy()
    expect(screen.getByLabelText('keep two')).toBeTruthy()
  })

  test('a step passed in opens on a press, and holds its lines', async () => {
    const onToggle = jest.fn()
    await draw(
      {},
      <Group heading="Install" onToggle={onToggle} status="done">
        <Line>resolved</Line>
      </Group>,
    )
    const press = screen.getByLabelText('Install finished')
    expect(press.props.accessibilityState?.expanded).toBe(false)
    await fireEvent.press(press)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Install finished').props.accessibilityState?.expanded).toBe(true)
  })

  test('a press with Shift selects every line between, and a refusal stands', async () => {
    const onSelect = jest.fn()
    const lines = [{ text: 'a' }, { text: 'b' }, { text: 'c' }]
    await draw({ lineNumbers: true, lines, onSelect, selectable: true })
    await fireEvent.press(screen.getByLabelText('Line 1'))
    await fireEvent.press(screen.getByLabelText('Line 3'), { nativeEvent: { shiftKey: true } })
    expect(onSelect).toHaveBeenCalledTimes(2)
    const last = onSelect.mock.calls[1]?.[0] as { detail: { value: string } }
    expect(last.detail.value).toBe('1-3')
  })

  test('scrolling away lets go of the newest line, and the way back follows it again', async () => {
    const onPin = jest.fn()
    const ref = createRef<LogHandle>()
    const lines = Array.from({ length: 40 }, (_, at) => ({ text: `line ${at}` }))
    await draw({ lines, onPin, ref })
    const list = screen.root?.queryAll((node) => node.type === 'RCTScrollView').at(-1)
    if (list === undefined) {
      throw new Error('no list')
    }
    const scrolled = (y: number) =>
      fireEvent.scroll(list, {
        nativeEvent: {
          contentOffset: { x: 0, y },
          contentSize: { height: 1000, width: 300 },
          layoutMeasurement: { height: 200, width: 300 },
        },
      })
    await scrolled(800)
    await scrolled(300)
    const told = onPin.mock.calls.at(-1)?.[0] as { detail: { value: string } }
    expect(told.detail.value).toBe('false')
    await act(async () => ref.current?.resume())
    const again = onPin.mock.calls.at(-1)?.[0] as { detail: { value: string } }
    expect(again.detail.value).toBe('true')
  })
})
