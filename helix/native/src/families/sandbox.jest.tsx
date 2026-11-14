/*
 * The generated Sandbox on a phone, read only: its panes stacked, its file
 * tabs, each source in the highlighter's colors, its console, and its status
 * bar. The preview is the web's alone.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { Text } from 'react-native'
import { HelixRoot } from '../index'
import type { SandboxConsoleHandle } from '../machines/sandbox'
import {
  HelixSandbox,
  HelixSandboxConsole,
  HelixSandboxPreview,
  HelixSandboxSource,
  HelixSandboxStatusBar,
  HelixSandboxToolbar,
} from './sandbox/index.native'

type Drawn = (given: Record<string, unknown>) => React.ReactNode
const Root = HelixSandbox as unknown as Drawn
const Source = HelixSandboxSource as unknown as Drawn
const Console = HelixSandboxConsole as unknown as Drawn
const Bar = HelixSandboxStatusBar as unknown as Drawn
const Toolbar = HelixSandboxToolbar as unknown as Drawn
const Preview = HelixSandboxPreview as unknown as Drawn

const draw = (node: React.ReactNode) => render(<HelixRoot>{node}</HelixRoot>)

/** The words drawn, in the order they stand. */
const wordsIn = () =>
  (screen.root?.queryAll((node) => typeof node.props.children === 'string') ?? []).map(
    (node) => node.props.children as string,
  )

describe('the generated Sandbox', () => {
  test('stacks the bar, the source, the preview, the panel, and the status bar', async () => {
    await draw(
      <Root
        panel={<Text>Panel words</Text>}
        preview={<Text>Preview words</Text>}
        source={<Source value="<p>Hi</p>" />}
        status={<Bar language="html" />}
        toolbar={<Toolbar>{<Text>index.html</Text>}</Toolbar>}
      />,
    )
    const words = wordsIn()
    const at = (one: string) => words.indexOf(one)
    expect(at('index.html')).toBeGreaterThan(-1)
    expect(at('<p>Hi</p>')).toBeGreaterThan(at('index.html'))
    expect(at('Preview words')).toBeGreaterThan(at('<p>Hi</p>'))
    expect(at('Panel words')).toBeGreaterThan(at('Preview words'))
    expect(at('HTML')).toBeGreaterThan(at('Panel words'))
  })

  test('the preview comes first under lead="preview"', async () => {
    await draw(
      <Root lead="preview" preview={<Text>Preview words</Text>} source={<Source value="code" />} />,
    )
    const words = wordsIn()
    expect(words.indexOf('Preview words')).toBeLessThan(words.indexOf('code'))
  })

  test('several panes are files: a tab each, one pane shown, and a press asks first', async () => {
    const asked = jest.fn((event: { preventDefault: () => void }) => event.preventDefault())
    const changed = jest.fn()
    const view = await draw(
      <Root
        onBeforeChange={asked}
        onChange={changed}
        source={[
          <Source key="html" label="index.html" name="html" value="<b>one</b>" />,
          <Source key="css" label="styles.css" name="css" value="b { color: red }" />,
        ]}
      />,
    )
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.queryByText('<b>one</b>')).toBeTruthy()
    expect(screen.queryByText('b { color: red }')).toBeNull()
    await act(async () => fireEvent.press(screen.getByText('styles.css')))
    expect(asked).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('<b>one</b>')).toBeTruthy()
    asked.mockImplementation(() => undefined)
    await act(async () => fireEvent.press(screen.getByText('styles.css')))
    expect(changed).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('b { color: red }')).toBeTruthy()
    expect(screen.queryByText('<b>one</b>')).toBeNull()
    view.unmount()
  })

  test('file chooses the pane shown by its name', async () => {
    await draw(
      <Root
        file="css"
        source={[
          <Source key="html" name="html" value="one" />,
          <Source key="css" name="css" value="two" />,
        ]}
      />,
    )
    expect(screen.queryByText('two')).toBeTruthy()
    expect(screen.queryByText('one')).toBeNull()
  })
})

describe('the generated Sandbox Source', () => {
  test('colors each run by its kind, and a line holds its runs', async () => {
    await draw(
      <Source
        tokenize={(source: string) => [
          { kind: 'keyword', text: source.slice(0, 5) },
          { text: source.slice(5) },
        ]}
        value={'const a\nb'}
      />,
    )
    const keyword = screen.getByText('const')
    expect(JSON.stringify(keyword.props.style)).toMatch(/"color":"#[0-9a-fA-F]{6}/)
    expect(screen.getByText(' a')).toBeTruthy()
    expect(screen.getByText('b')).toBeTruthy()
  })

  test('numbers its lines under line-numbers, and is named by its field and its label', async () => {
    await draw(<Source label="index.html" lineNumbers value={'a\n\nc'} />)
    expect(screen.getByText('1', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByLabelText('Example source, index.html')).toBeTruthy()
  })
})

describe('the generated Sandbox Console', () => {
  test('says its empty text, takes lines by write, and empties by clear', async () => {
    const ref = createRef<SandboxConsoleHandle>()
    await draw(<Console controls ref={ref} />)
    expect(screen.getByText('Nothing written to the console yet.')).toBeTruthy()
    await act(async () => ref.current?.write({ level: 'warn', text: 'Careful' }))
    expect(screen.getByText('Careful')).toBeTruthy()
    await act(async () => ref.current?.clear())
    expect(screen.queryByText('Careful')).toBeNull()
    await act(async () => ref.current?.write({ level: 'log', text: 'Again' }))
    await act(async () => fireEvent.press(screen.getByText('Clear')))
    expect(screen.queryByText('Again')).toBeNull()
  })

  test('level hides the quieter lines, and the filter shows the level held', async () => {
    const ref = createRef<SandboxConsoleHandle>()
    await draw(<Console controls level="warn" ref={ref} />)
    await act(async () => ref.current?.write({ level: 'log', text: 'Plain' }))
    await act(async () => ref.current?.write({ level: 'error', text: 'Broke' }))
    expect(screen.queryByText('Plain')).toBeNull()
    expect(screen.getByText('Broke')).toBeTruthy()
    expect(screen.getByText('Warnings and errors')).toBeTruthy()
    expect(screen.getByLabelText(/^Levels shown/)).toBeTruthy()
  })

  test('a level chosen in the filter asks first, and a refusal keeps the level', async () => {
    const ref = createRef<SandboxConsoleHandle>()
    const asked = jest.fn((event: { preventDefault: () => void }) => event.preventDefault())
    const changed = jest.fn()
    await draw(
      <Console
        controls
        levelWords={{ error: 'Only errors' }}
        onBeforeChange={asked}
        onChange={changed}
        ref={ref}
      />,
    )
    await act(async () => ref.current?.write({ level: 'log', text: 'Plain' }))
    await act(async () => ref.current?.write({ level: 'error', text: 'Broke' }))
    await act(async () => fireEvent.press(screen.getByText('All levels')))
    const choose = () => act(async () => fireEvent.press(screen.getByText('Only errors')))
    await choose()
    expect(asked).toHaveBeenCalledTimes(1)
    expect(asked.mock.calls[0]?.[0]).toMatchObject({ detail: { value: 'error' } })
    expect(changed).not.toHaveBeenCalled()
    expect(screen.getByText('Plain')).toBeTruthy()
    asked.mockImplementation(() => undefined)
    await choose()
    expect(changed).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Plain')).toBeNull()
    expect(screen.getByText('Broke')).toBeTruthy()
    expect(screen.queryByText('Info and above')).toBeNull()
  })
})

describe('the generated Sandbox Status Bar', () => {
  test('says where the caret is and names the language, and nothing without them', async () => {
    const view = await draw(<Bar column={4} language="css" line={1200} />)
    expect(screen.getByText('Ln 1200, Col 4')).toBeTruthy()
    expect(screen.getByText('CSS')).toBeTruthy()
    view.unmount()
    await draw(<Bar line={3} />)
    expect(screen.queryByText(/Ln/)).toBeNull()
  })
})

describe('the generated Sandbox Preview', () => {
  test('draws nothing, since it runs a page a phone has no document for', async () => {
    const view = await draw(<Preview label="Live preview" src="/sandbox/frame.html" />)
    expect(view.toJSON()).toBeNull()
  })
})
