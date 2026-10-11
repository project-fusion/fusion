import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { TerminalTheme } from '../theme/terminal-theme.js'
import type { XtermSearch, XtermTerminal, XtermWebLinks } from './xterm-driver.js'

let xtermDriver: typeof import('./xterm-driver.js').xtermDriver
let xtermOptions: typeof import('./xterm-driver.js').xtermOptions

beforeAll(async () => {
  registerDom()
  ;({ xtermDriver, xtermOptions } = await import('./xterm-driver.js'))
})

/** A listener list, as xterm.js's events are: subscribe, and dispose to stop. */
const emitter = <T>() => {
  const listeners = new Set<(value: T) => void>()
  return {
    emit: (value: T) => {
      for (const listener of listeners) {
        listener(value)
      }
    },
    listen: (listener: (value: T) => void) => {
      listeners.add(listener)
      return { dispose: () => listeners.delete(listener) }
    },
    get size() {
      return listeners.size
    },
  }
}

/** A stand-in for xterm.js's Terminal that records what the driver asks of it. */
const standIn = () => {
  const data = emitter<string>()
  const binary = emitter<string>()
  const resize = emitter<{ cols: number; rows: number }>()
  const title = emitter<string>()
  const written: string[] = []
  const loaded: unknown[] = []
  const rows = [
    { isWrapped: false, text: '$ ls' },
    { isWrapped: false, text: 'README.md  pack' },
    { isWrapped: true, text: 'age.json' },
    { isWrapped: false, text: '' },
  ]
  const terminal: XtermTerminal = {
    buffer: {
      active: {
        getLine: (y) => {
          const row = rows[y]
          return row ? { isWrapped: row.isWrapped, translateToString: () => row.text } : undefined
        },
        length: rows.length,
        viewportY: 1,
      },
    },
    clear: () => written.push('clear()'),
    cols: 80,
    element: undefined,
    focus: () => {},
    getSelection: () => 'README.md',
    loadAddon: (addon) => {
      loaded.push(addon)
    },
    onBell: emitter<void>().listen as XtermTerminal['onBell'],
    onBinary: binary.listen,
    onData: data.listen,
    onResize: resize.listen,
    onSelectionChange: emitter<void>().listen as XtermTerminal['onSelectionChange'],
    onTitleChange: title.listen,
    options: { cursorBlink: true, smoothScrollDuration: 120 },
    paste: (text) => written.push(`paste(${text})`),
    reset: () => written.push('reset()'),
    resize: (columns, rows) => written.push(`resize(${columns}, ${rows})`),
    rows: 3,
    textarea: undefined,
    write: (chunk, callback) => {
      written.push(typeof chunk === 'string' ? chunk : `${chunk.length} bytes`)
      callback?.()
    },
  }
  return { binary, data, loaded, resize, terminal, title, written }
}

const THEME = {
  colors: { background: '#ffffff', cursorAccent: '#ffffff', foreground: '#111111' },
  font: { family: '"Geist Mono", monospace', size: 13 },
  matches: {
    activeBackground: '#f0d080',
    activeBorder: '#9a6700',
    background: '#fbefc8',
    ruler: '#9a6700',
  },
} as unknown as TerminalTheme

describe('xtermDriver', () => {
  test('hears typing as text and mouse reports as bytes, until stopped', () => {
    const { binary, data, terminal } = standIn()
    const heard: [string, boolean][] = []
    const stop = xtermDriver(terminal).onInput((value, bytes) => heard.push([value, bytes]))
    data.emit('ls\r')
    binary.emit('\u001b[M !!')
    stop()
    data.emit('late')
    expect(heard).toEqual([
      ['ls\r', false],
      ['\u001b[M !!', true],
    ])
    expect(data.size).toBe(0)
  })

  test('applies the connector’s options, hides the cursor with its escape code, and puts every one back on release', () => {
    const { terminal, written } = standIn()
    const driver = xtermDriver(terminal)
    driver.options?.({
      contrast: 4.5,
      cursor: false,
      input: false,
      motion: false,
      screenReader: true,
    })
    expect(terminal.options).toMatchObject({
      cursorBlink: false,
      disableStdin: true,
      minimumContrastRatio: 4.5,
      screenReaderMode: true,
      smoothScrollDuration: 0,
    })
    expect(written).toEqual(['\u001b[?25l'])
    driver.options?.({
      contrast: 4.5,
      cursor: false,
      input: true,
      motion: true,
      screenReader: false,
    })
    expect(terminal.options).toMatchObject({ cursorBlink: true, smoothScrollDuration: 120 })
    expect(written).toEqual(['\u001b[?25l'])
    driver.release?.()
    expect(terminal.options).toMatchObject({
      cursorBlink: true,
      disableStdin: false,
      minimumContrastRatio: 1,
      screenReaderMode: false,
    })
    expect(written).toEqual(['\u001b[?25l', '\u001b[?25h'])
  })

  test('reads the screen and the whole scrollback as lines, a wrapped row joined to the one above', () => {
    const driver = xtermDriver(standIn().terminal)
    expect(driver.text?.('screen')).toBe('README.md  package.json')
    expect(driver.text?.('all')).toBe('$ ls\nREADME.md  package.json')
  })

  test('says the grid in columns and rows', () => {
    const { resize, terminal } = standIn()
    const driver = xtermDriver(terminal)
    expect(driver.size?.()).toEqual({ columns: 80, rows: 3 })
    const sizes: unknown[] = []
    driver.onResize?.((grid) => sizes.push(grid))
    resize.emit({ cols: 100, rows: 30 })
    expect(sizes).toEqual([{ columns: 100, rows: 30 }])
  })

  test('draws in the theme’s colors and face', () => {
    const { terminal } = standIn()
    xtermDriver(terminal).theme?.(THEME)
    expect(terminal.options).toMatchObject({
      fontFamily: '"Geist Mono", monospace',
      fontSize: 13,
      theme: THEME.colors,
    })
    expect(xtermOptions(THEME)).toEqual({
      fontFamily: '"Geist Mono", monospace',
      fontSize: 13,
      theme: THEME.colors,
    })
    expect(xtermOptions({ ...THEME, font: undefined })).toEqual({ theme: THEME.colors })
  })

  test('hands a link of every scheme to the frame, makes the page’s web links addon with it, and puts the handler back', () => {
    const { loaded, terminal } = standIn()
    let made: ((event: MouseEvent, uri: string) => void) | undefined
    let disposed = false
    const WebLinks = class {
      constructor(handler: (event: MouseEvent, uri: string) => void) {
        made = handler
      }
      activate() {}
      dispose() {
        disposed = true
      }
    } as unknown as XtermWebLinks
    const activated: string[] = []
    const stop = xtermDriver(terminal, { webLinks: WebLinks }).onLink?.((href) =>
      activated.push(href),
    )
    terminal.options.linkHandler?.activate(
      new MouseEvent('click'),
      'file:///tmp/log',
      undefined as never,
    )
    made?.(new MouseEvent('click'), 'https://fusion.dev')
    expect(activated).toEqual(['file:///tmp/log', 'https://fusion.dev'])
    expect(terminal.options.linkHandler?.allowNonHttpProtocols).toBe(true)
    expect(loaded).toHaveLength(1)
    stop?.()
    expect(terminal.options.linkHandler).toBeNull()
    expect(disposed).toBe(true)
  })

  test('searches with the theme’s highlights, which is what turns on the count', () => {
    const { loaded, terminal } = standIn()
    const asked: unknown[][] = []
    const results = emitter<{ resultCount: number; resultIndex: number }>()
    const search = {
      activate() {},
      clearDecorations: () => asked.push(['clear']),
      dispose() {},
      findNext: (term: string, options: unknown) => asked.push(['next', term, options]) > 0,
      findPrevious: (term: string, options: unknown) => asked.push(['previous', term, options]) > 0,
      onDidChangeResults: results.listen,
    } as unknown as XtermSearch
    const driver = xtermDriver(terminal, { search })
    expect(loaded).toEqual([search])
    expect(terminal.options.allowProposedApi).toBe(true)
    const found: number[][] = []
    driver.search?.onResults((index, count) => found.push([index, count]))
    driver.search?.find('error', { backward: true, incremental: false }, THEME.matches)
    results.emit({ resultCount: 4, resultIndex: 1 })
    driver.search?.end()
    expect(asked[0]).toEqual([
      'previous',
      'error',
      {
        decorations: {
          activeMatchBackground: '#f0d080',
          activeMatchBorder: '#9a6700',
          activeMatchColorOverviewRuler: '#9a6700',
          matchBackground: '#fbefc8',
          matchOverviewRuler: '#9a6700',
        },
        incremental: false,
      },
    ])
    expect(asked[1]).toEqual(['clear'])
    expect(found).toEqual([[1, 4]])
    driver.release?.()
    expect(terminal.options.allowProposedApi).toBe(false)
  })

  test('fits only a terminal open in a box with a size, which a fit would otherwise shrink to one cell', () => {
    const { terminal } = standIn()
    let fitted = 0
    const fit = { activate() {}, dispose() {}, fit: () => (fitted += 1) } as never
    const driver = xtermDriver(terminal, { fit })
    driver.fit?.()
    expect(fitted).toBe(0)
  })

  test('takes no fit or search where the page brought neither addon', () => {
    const driver = xtermDriver(standIn().terminal)
    expect(driver.fit).toBeUndefined()
    expect(driver.search).toBeUndefined()
  })
})
