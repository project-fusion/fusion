import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import type { TerminalTheme } from '../theme/terminal-theme.js'
import type { TerminalDriver, TerminalGrid, TerminalOptions } from './connect-terminal.js'

/* Imported after the DOM is registered, like the elements: the connector
   reaches `@fusion.dev/helix-core`, which evaluates Lit. */
let connectTerminal: typeof import('./connect-terminal.js').connectTerminal

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/terminal')
  ;({ connectTerminal } = await import('./connect-terminal.js'))
})

/* Browser only: happy-dom does not inherit a custom property into a computed
   style, so no theme can be read there. */
const run = hasLayout() ? test : (): void => {}

afterEach(() => {
  document.body.innerHTML = ''
})

type Frame = HTMLElement & {
  exitCode?: number | undefined
  readOnly: boolean
  text(scope?: 'all' | 'screen'): string
  updateComplete: Promise<unknown>
  write(data: string | Uint8Array): Promise<void>
}

/** What a stand-in driver was asked, in order, and what it holds. */
interface Recording {
  calls: string[]
  grid: TerminalGrid
  input?: (data: string, binary: boolean) => void
  options: TerminalOptions[]
  resized?: (grid: TerminalGrid) => void
  themes: TerminalTheme[]
  written: string[]
}

/** A driver that writes down what it is asked rather than drawing anything. */
const recorder = (element: HTMLElement): { driver: TerminalDriver; seen: Recording } => {
  const seen: Recording = {
    calls: [],
    grid: { columns: 80, rows: 24 },
    options: [],
    themes: [],
    written: [],
  }
  const driver: TerminalDriver = {
    clear: () => seen.calls.push('clear'),
    element: () => element,
    fit: () => seen.calls.push('fit'),
    onInput: (input) => {
      seen.input = input
      return () => {
        seen.calls.push('input stopped')
        delete seen.input
      }
    },
    onResize: (resized) => {
      seen.resized = resized
      return () => seen.calls.push('resize stopped')
    },
    options: (options) => {
      seen.options.push(options)
    },
    pixels: () => ({ height: 384, width: 640 }),
    release: () => seen.calls.push('release'),
    resize: (columns, rows) => {
      seen.calls.push(`resize ${columns}x${rows}`)
      seen.grid = { columns, rows }
    },
    size: () => seen.grid,
    text: (scope) => `${scope} text`,
    theme: (theme) => {
      seen.themes.push(theme)
    },
    write: (data, done) => {
      seen.written.push(typeof data === 'string' ? data : `${data.length} bytes`)
      done()
    },
  }
  return { driver, seen }
}

/** A headless frame with an element for the renderer to draw in. */
const frame = async (attributes = ''): Promise<{ element: HTMLElement; host: Frame }> => {
  const host = (await mount(
    `<helix-headless-terminal label="zsh" ${attributes}><div></div></helix-headless-terminal>`,
  )) as Frame
  return { element: host.querySelector('div') as HTMLElement, host }
}

describe('connectTerminal', () => {
  test('refuses an element that is not a terminal frame, saying what to import', async () => {
    const element = await mount('<div></div>')
    expect(() => connectTerminal(element, recorder(element).driver)).toThrow(
      /Import @fusion\.dev\/helix\/terminal/,
    )
  })

  test('writes what the frame held, then what it is given, through the driver', async () => {
    const { element, host } = await frame()
    const held = host.write('before\r\n')
    const { driver, seen } = recorder(element)
    connectTerminal(host, driver)
    await held
    await host.write(new Uint8Array([1, 2, 3]))
    expect(seen.written).toEqual(['before\r\n', '3 bytes'])
  })

  test('the reader’s input reaches the page, and stops on disconnect', async () => {
    const { element, host } = await frame()
    const { driver, seen } = recorder(element)
    const connection = connectTerminal(host, driver)
    const heard: string[] = []
    host.addEventListener('helix-terminal-input', (event) => heard.push(event.detail.data))
    seen.input?.('ls\r', false)
    connection.disconnect()
    expect(heard).toEqual(['ls\r'])
    expect(seen.input).toBeUndefined()
    expect(seen.calls).toContain('release')
    expect(host.text()).toBe('')
  })

  test('says the size the process starts at, in cells and pixels, and every change after', async () => {
    const { element, host } = await frame()
    const sizes: unknown[] = []
    host.addEventListener('helix-terminal-resize', (event) => sizes.push(event.detail))
    const { driver, seen } = recorder(element)
    connectTerminal(host, driver)
    seen.resized?.({ columns: 100, rows: 30 })
    expect(sizes).toEqual([
      { columns: 80, height: 384, rows: 24, width: 640 },
      { columns: 100, height: 384, rows: 30, width: 640 },
    ])
    expect(seen.calls).toContain('fit')
  })

  test('a frame with columns and rows gets a grid of that size, and no fitting', async () => {
    const { element, host } = await frame('columns="120" rows="40"')
    const { driver, seen } = recorder(element)
    connectTerminal(host, driver)
    expect(seen.calls).toContain('resize 120x40')
    expect(seen.calls).not.toContain('fit')
  })

  test('holds every cell to 4.5:1 by default, or to the contrast it is given', async () => {
    const { element, host } = await frame()
    const { driver, seen } = recorder(element)
    connectTerminal(host, driver)
    expect(seen.options.at(-1)).toMatchObject({ contrast: 4.5, input: true, motion: true })
    const other = await frame()
    const second = recorder(other.element)
    connectTerminal(other.host, second.driver, { contrast: 7 })
    expect(second.seen.options.at(-1)?.contrast).toBe(7)
  })

  test('closes the renderer’s input when the frame is readonly or its process exits', async () => {
    const { element, host } = await frame()
    const { driver, seen } = recorder(element)
    connectTerminal(host, driver)
    host.exitCode = 1
    await settle(host)
    expect(seen.options.at(-1)).toMatchObject({ cursor: true, input: false })
    host.exitCode = undefined
    host.readOnly = true
    await settle(host)
    expect(seen.options.at(-1)).toMatchObject({ cursor: false, input: false })
  })

  test('reads the frame’s text and clears it through the driver', async () => {
    const { element, host } = await frame()
    const { driver, seen } = recorder(element)
    connectTerminal(host, driver)
    expect(host.text('all')).toBe('all text')
    ;(host as Frame & { clear(): void }).clear()
    expect(seen.calls).toContain('clear')
  })

  run('themes the renderer once it connects, from the frame’s own properties', async () => {
    const { element, host } = await frame('style="--terminal-ansi-red: rgb(200, 10, 20)"')
    const { driver, seen } = recorder(element)
    connectTerminal(host, driver)
    const theme = seen.themes.at(-1)
    expect(theme?.colors.red).toBe('#c80a14')
    expect(theme?.colors.cursorAccent).toBe(theme?.colors.background)
  })
})
