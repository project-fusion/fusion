/*
 * The generated Terminal on a phone, drawn from its real intermediate form:
 * output written on its ref parsed by `@xterm/headless` and drawn as lines of
 * runs in the theme's ANSI colors, the reader's typing sent as
 * `terminal-input`, the find bar's count, and the status line once the
 * process exits. `test:native` writes the component beside this file.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { HelixRoot } from '../index'
import type { TerminalHandle } from '../machines/terminal'
import { stillEngine } from '../machines/terminal-engine'
import { HelixTerminal } from './terminal/index.native'

type Drawn = (given: Record<string, unknown>) => React.ReactNode
const Terminal = HelixTerminal as unknown as Drawn

const draw = (node: React.ReactNode) => render(<HelixRoot>{node}</HelixRoot>)

/** Two frames, for the draw a write schedules. */
const settle = () =>
  act(
    () =>
      new Promise<void>((done) => {
        requestAnimationFrame(() => requestAnimationFrame(() => done()))
      }),
  )

/** Writes output on the ref and waits for its draw. */
const write = async (ref: { current: TerminalHandle | null }, data: string) => {
  await act(async () => {
    await ref.current?.write(data)
  })
  await settle()
}

/** The words of every run drawn, in order. */
const words = () =>
  (screen.root?.queryAll((node) => typeof node.props.children === 'string') ?? []).map(
    (node) => node.props.children as string,
  )

describe('the generated Terminal', () => {
  test('draws what is written on its ref, each run in its ANSI color', async () => {
    const ref = createRef<TerminalHandle>()
    await draw(<Terminal label="~/fusion" ref={ref} />)
    await write(ref, '\x1b[31mfail\x1b[0m done\r\nnext')
    const fail = screen.getByText('fail')
    expect(JSON.stringify(fail.props.style)).toMatch(/"color":"#[0-9a-fA-F]{6}/)
    expect(screen.getByText(' done')).toBeTruthy()
    expect(screen.getByText('next')).toBeTruthy()
    expect(screen.getByText('~/fusion')).toBeTruthy()
    expect(ref.current?.text()).toContain('fail done')
  })

  test('sends what the reader types, and nothing while read only or once exited', async () => {
    const typed = jest.fn()
    const view = await draw(<Terminal onTerminalInput={typed} />)
    const field = screen.getByLabelText('Terminal input')
    await act(async () => fireEvent.changeText(field, 'ls'))
    await act(async () => fireEvent(field, 'submitEditing'))
    await act(async () => fireEvent(field, 'keyPress', { nativeEvent: { key: 'Backspace' } }))
    expect(
      typed.mock.calls.map(([event]) => (event as { detail: { data: string } }).detail.data),
    ).toEqual(['ls', '\r', '\x7f'])
    await view.rerender(
      <HelixRoot>
        <Terminal onTerminalInput={typed} readonly />
      </HelixRoot>,
    )
    await act(async () => fireEvent.changeText(screen.getByLabelText('Terminal input'), 'x'))
    expect(typed).toHaveBeenCalledTimes(3)
  })

  test('the find bar counts the matches in the scrollback and says where it stands', async () => {
    const ref = createRef<TerminalHandle>()
    const found = jest.fn()
    await draw(<Terminal onFound={found} ref={ref} />)
    await write(ref, 'one fail\r\ntwo\r\nthree fail')
    await act(async () => fireEvent.press(screen.getByLabelText('Find')))
    await act(async () => fireEvent.changeText(screen.getByPlaceholderText('Find'), 'fail'))
    await settle()
    expect(screen.getByText('1 of 2 matches')).toBeTruthy()
    await act(async () => fireEvent.press(screen.getByLabelText('Next match')))
    expect(screen.getByText('2 of 2 matches')).toBeTruthy()
    expect(found).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: { count: 2, index: 1 } }),
    )
  })

  test('says how the process exited, and Restart asks for another', async () => {
    const restart = jest.fn()
    await draw(<Terminal exitCode={2} onTerminalRestart={restart} />)
    expect(screen.getByText('The process exited with code 2.')).toBeTruthy()
    await act(async () => fireEvent.press(screen.getByText('Restart')))
    expect(restart).toHaveBeenCalledTimes(1)
  })

  test('the clear control empties the scrollback but the cursor line', async () => {
    const ref = createRef<TerminalHandle>()
    await draw(<Terminal ref={ref} />)
    await write(ref, 'old\r\n$ ')
    await act(async () => fireEvent.press(screen.getByLabelText('Clear')))
    await settle()
    expect(words()).not.toContain('old')
  })
})

describe('the still lines, without @xterm/headless', () => {
  test('keep what was written in its colors, a line to each line feed', () => {
    const engine = stillEngine()
    engine.write('\x1b[32mok\x1b[0m one\r\ntwo\rTWO', () => undefined)
    expect(engine.lines(false)).toEqual([
      [{ color: 'green', text: 'ok' }, { text: ' one' }],
      [{ text: 'TWO' }],
    ])
    expect(engine.text('all')).toBe('ok one\nTWO')
  })
})
