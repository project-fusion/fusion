import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
  settle,
} from '@fusion.dev/helix-testing/dom'
import type { HelixHeadlessTerminal, TerminalRenderer, TerminalSettings } from './terminal-root.js'

let onApple: () => boolean

/* Imported once the DOM is registered: the element extends whichever
   `HTMLElement` is global when its module is first evaluated. */
beforeAll(async () => {
  registerDom()
  ;({ onApple } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

type Held = Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey', boolean>>

/** The chord that opens the find bar on this keyboard. */
const findChord = (): [string, Held] =>
  onApple() ? ['f', { metaKey: true }] : ['F', { ctrlKey: true, shiftKey: true }]

/** The chord that switches Tab on this keyboard. */
const tabChord = (): [string, Held] =>
  onApple() ? ['M', { ctrlKey: true, shiftKey: true }] : ['m', { ctrlKey: true }]

afterEach(() => {
  document.body.innerHTML = ''
})

/** What a stand-in renderer was asked, in order. */
interface Asked {
  calls: string[]
  settings: TerminalSettings[]
  written: (string | Uint8Array)[]
}

/** A renderer that writes down what it is asked, with an input element of its own. */
const standIn = (
  host: HTMLElement,
  can: Partial<Record<'clear' | 'find' | 'selection', boolean>> = {
    clear: true,
    find: true,
    selection: true,
  },
): { asked: Asked; input: HTMLTextAreaElement; renderer: TerminalRenderer } => {
  const asked: Asked = { calls: [], settings: [], written: [] }
  const input = document.createElement('textarea')
  host.querySelector('div')?.append(input)
  const renderer: TerminalRenderer = {
    focus: () => input.focus(),
    input: () => input,
    settings: (settings) => {
      asked.settings.push(settings)
    },
    text: (scope) => (scope === 'all' ? 'every line' : 'the screen'),
    write: (data, done) => {
      asked.written.push(data)
      done()
    },
  }
  if (can.clear) {
    renderer.clear = () => asked.calls.push('clear')
  }
  if (can.find) {
    renderer.find = (query, options) =>
      asked.calls.push(`find ${query}${options.backward ? ' backward' : ''}`)
    renderer.findEnd = () => asked.calls.push('find end')
  }
  if (can.selection) {
    renderer.selection = () => 'selected text'
  }
  return { asked, input, renderer }
}

const frame = async (attributes = ''): Promise<HelixHeadlessTerminal> =>
  (await mount(
    `<helix-headless-terminal label="zsh" ${attributes}><div></div></helix-headless-terminal>`,
  )) as HelixHeadlessTerminal

/** A key pressed where the reader types, as the renderer's input receives it. */
const press = (target: Element, key: string, held: Held = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    ...held,
  })
  target.dispatchEvent(event)
  return event
}

describe('terminal output', () => {
  test('is held until a renderer is attached, then written in order, and each write resolves once parsed', async () => {
    const host = await frame()
    let first = false
    const one = host.write('one').then(() => {
      first = true
    })
    const two = host.write(new Uint8Array([116, 119, 111]))
    await Promise.resolve()
    expect(first).toBe(false)
    const { asked, renderer } = standIn(host)
    host.attach(renderer)
    await Promise.all([one, two])
    expect(first).toBe(true)
    expect(asked.written.map((data) => (typeof data === 'string' ? data : 'bytes'))).toEqual([
      'one',
      'bytes',
    ])
    await host.write('three')
    expect(asked.written.at(-1)).toBe('three')
  })

  test('the text it reads back is the renderer’s, and empty before one is attached', async () => {
    const host = await frame()
    expect(host.text()).toBe('')
    host.attach(standIn(host).renderer)
    expect(host.text()).toBe('the screen')
    expect(host.text('all')).toBe('every line')
  })
})

describe('terminal input', () => {
  test('reaches the page as helix-terminal-input, with whether it is bytes', async () => {
    const host = await frame()
    const sink = host.attach(standIn(host).renderer)
    const heard: { binary: boolean; data: string }[] = []
    host.addEventListener('helix-terminal-input', (event) => heard.push(event.detail))
    sink.input('ls\r')
    sink.input('\u001b[M !!', true)
    expect(heard).toEqual([
      { binary: false, data: 'ls\r' },
      { binary: true, data: '\u001b[M !!' },
    ])
  })

  test('is not sent while readonly, or once the process has exited', async () => {
    for (const attributes of ['readonly', 'exit-code="0"']) {
      const host = await frame(attributes)
      const sink = host.attach(standIn(host).renderer)
      let heard = 0
      host.addEventListener('helix-terminal-input', () => {
        heard += 1
      })
      sink.input('x')
      host.paste('pasted')
      expect(heard).toBe(0)
    }
  })

  test('the renderer is told when input closes, and the cursor goes with readonly', async () => {
    const host = await frame()
    const { asked, renderer } = standIn(host)
    host.attach(renderer)
    expect(asked.settings.at(-1)).toMatchObject({ cursor: true, input: true })
    host.exitCode = 1
    await settle(host)
    expect(asked.settings.at(-1)).toMatchObject({ cursor: true, input: false })
    host.exitCode = undefined
    host.readOnly = true
    await settle(host)
    expect(asked.settings.at(-1)).toMatchObject({ cursor: false, input: false })
  })

  test('a fixed grid is asked for only with both columns and rows', async () => {
    const host = await frame('columns="80"')
    const { asked, renderer } = standIn(host)
    host.attach(renderer)
    expect(asked.settings.at(-1)).toMatchObject({ columns: undefined, rows: undefined })
    host.rows = 24
    await settle(host)
    expect(asked.settings.at(-1)).toMatchObject({ columns: 80, rows: 24 })
  })
})

describe('terminal controls', () => {
  test('are drawn from the list before a renderer is attached, and narrowed to what it can answer', async () => {
    const host = await frame('controls="find copy clear fullscreen"')
    for (const name of ['find', 'copy', 'clear', 'fullscreen']) {
      expect(part(host, name)).not.toBeNull()
    }
    host.attach(standIn(host, {}).renderer)
    await settle(host)
    expect(part(host, 'find')).toBeNull()
    expect(part(host, 'copy')).toBeNull()
    expect(part(host, 'clear')).toBeNull()
    expect(part(host, 'fullscreen')).not.toBeNull()
  })

  test('rest at find and clear, and none with controls="none"', async () => {
    const host = await frame()
    expect(part(host, 'find')).not.toBeNull()
    expect(part(host, 'clear')).not.toBeNull()
    expect(part(host, 'copy')).toBeNull()
    const bare = await frame('controls="none"')
    expect(part(bare, 'controls')).toBeNull()
  })

  test('clear asks the renderer, and copy waits for a selection', async () => {
    const host = await frame('controls="copy clear"')
    const { asked, renderer } = standIn(host)
    const sink = host.attach(renderer)
    await settle(host)
    ;(part(host, 'clear') as HTMLButtonElement).click()
    expect(asked.calls).toEqual(['clear'])
    expect((part(host, 'copy') as HTMLButtonElement).disabled).toBe(true)
    sink.selected(true)
    await settle(host)
    expect((part(host, 'copy') as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('the find bar', () => {
  test('opens from its button, searches as the reader types, and says the count', async () => {
    const host = await frame()
    const { asked, renderer } = standIn(host)
    const sink = host.attach(renderer)
    await settle(host)
    expect(part(host, 'find-bar')?.hasAttribute('hidden')).toBe(true)
    ;(part(host, 'find') as HTMLButtonElement).click()
    await settle(host)
    expect(part(host, 'find-bar')?.hasAttribute('hidden')).toBe(false)
    expect(hasState(host, 'find-open')).toBe(true)
    expect(part(host, 'find')?.getAttribute('aria-expanded')).toBe('true')
    const field = part(host, 'find-field') as HTMLInputElement
    field.value = 'error'
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(asked.calls).toEqual(['find error'])
    sink.found(2, 12)
    await settle(host)
    expect(part(host, 'find-count')?.textContent?.trim()).toBe('3 of 12 matches')
    expect(part(host, 'live')?.textContent?.trim()).toBe('3 of 12 matches')
    press(field, 'Enter', { shiftKey: true })
    expect(asked.calls.at(-1)).toBe('find error backward')
  })

  test('says when nothing matched', async () => {
    const host = await frame()
    const sink = host.attach(standIn(host).renderer)
    sink.found(-1, 0)
    await settle(host)
    expect(part(host, 'find-count')?.textContent?.trim()).toBe('No matches')
  })

  test('Escape closes it, takes the highlights off, and returns focus to the terminal', async () => {
    const host = await frame()
    const { asked, input, renderer } = standIn(host)
    host.attach(renderer)
    await settle(host)
    ;(part(host, 'find') as HTMLButtonElement).click()
    await settle(host)
    press(part(host, 'find-field') as Element, 'Escape')
    await settle(host)
    expect(part(host, 'find-bar')?.hasAttribute('hidden')).toBe(true)
    expect(asked.calls).toEqual(['find end'])
    expect(document.activeElement).toBe(input)
  })
})

describe('the frame’s keys', () => {
  test('Control+Shift+F, or Command+F on a Mac, opens the find bar, and the program never sees it', async () => {
    const host = await frame()
    const { input, renderer } = standIn(host)
    host.attach(renderer)
    let reached = false
    input.addEventListener('keydown', () => {
      reached = true
    })
    const event = press(input, ...findChord())
    await settle(host)
    expect(event.defaultPrevented).toBe(true)
    expect(reached).toBe(false)
    expect(hasState(host, 'find-open')).toBe(true)
  })

  test('Control+M, or Control+Shift+M on a Mac, switches Tab to moving focus, which the program then never sees, and back', async () => {
    const host = await frame()
    const { input, renderer } = standIn(host)
    host.attach(renderer)
    const reached: string[] = []
    input.addEventListener('keydown', (event) => reached.push(event.key))
    press(input, 'Tab')
    expect(reached).toEqual(['Tab'])
    press(input, ...tabChord())
    await settle(host)
    expect(hasState(host, 'tab-moves-focus')).toBe(true)
    expect(part(host, 'status')?.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'status')?.textContent).toContain('Tab moves focus')
    const tab = press(input, 'Tab')
    expect(tab.defaultPrevented).toBe(false)
    expect(reached).toEqual(['Tab'])
    press(input, ...tabChord())
    await settle(host)
    expect(hasState(host, 'tab-moves-focus')).toBe(false)
    expect(part(host, 'live')?.textContent?.trim()).toBe('Tab types in the terminal.')
    press(input, 'Tab')
    expect(reached).toEqual(['Tab', 'Tab'])
  })

  test('every other key reaches the program, Escape and Control+C among them', async () => {
    const host = await frame()
    const { input, renderer } = standIn(host)
    host.attach(renderer)
    const reached: string[] = []
    input.addEventListener('keydown', (event) => reached.push(event.key))
    press(input, 'Escape')
    press(input, 'c', { ctrlKey: true })
    press(input, 'Tab', { shiftKey: true })
    expect(reached).toEqual(['Escape', 'c', 'Tab'])
  })

  test('the keys are left alone until a renderer is attached', async () => {
    const host = await frame()
    const event = press(host.querySelector('div') as Element, ...tabChord())
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('the renderer’s input', () => {
  test('is named, described with the key that frees Tab, and put back on detach', async () => {
    const host = await frame()
    const { input, renderer } = standIn(host)
    input.setAttribute('aria-label', 'Terminal input from the renderer')
    const sink = host.attach(renderer)
    expect(input.getAttribute('aria-label')).toBe('Terminal input')
    expect(input.getAttribute('aria-description')).toMatch(
      /^Press Control(\+Shift)?\+M to move focus with Tab\.$/,
    )
    expect(input.getAttribute('aria-keyshortcuts')).toContain('+M')
    sink.detach()
    expect(input.getAttribute('aria-label')).toBe('Terminal input from the renderer')
    expect(input.hasAttribute('aria-description')).toBe(false)
  })

  test('focus goes to it', async () => {
    const host = await frame()
    const { input, renderer } = standIn(host)
    host.attach(renderer)
    host.focus()
    expect(document.activeElement).toBe(input)
  })
})

describe('what the renderer tells the frame', () => {
  test('a resize and a title reach the page', async () => {
    const host = await frame()
    const sink = host.attach(standIn(host).renderer)
    const sizes: unknown[] = []
    const titles: string[] = []
    host.addEventListener('helix-terminal-resize', (event) => sizes.push(event.detail))
    host.addEventListener('helix-terminal-title', (event) => titles.push(event.detail.title))
    sink.resized({ columns: 80, height: 384, rows: 24, width: 640 })
    sink.title('~/fusion')
    expect(sizes).toEqual([{ columns: 80, height: 384, rows: 24, width: 640 }])
    expect(titles).toEqual(['~/fusion'])
    expect(host.label).toBe('zsh')
  })

  test('the bell flashes for a moment, and reaches the page', async () => {
    const host = await frame()
    const sink = host.attach(standIn(host).renderer)
    let rang = 0
    host.addEventListener('helix-terminal-bell', () => {
      rang += 1
    })
    sink.bell()
    expect(rang).toBe(1)
    expect(hasState(host, 'bell')).toBe(true)
    await new Promise((done) => setTimeout(done, 260))
    expect(hasState(host, 'bell')).toBe(false)
  })

  test('a web link opens in a new tab, another address does not, and a page that takes one opens it itself', async () => {
    const host = await frame()
    const sink = host.attach(standIn(host).renderer)
    const opened: unknown[][] = []
    const open = window.open
    window.open = ((...args: unknown[]) => {
      opened.push(args)
      return null
    }) as typeof window.open
    try {
      sink.link('https://example.com/build-log')
      sink.link('javascript:alert(1)')
      const taken = (event: Event) => event.preventDefault()
      host.addEventListener('helix-terminal-link', taken)
      sink.link('https://example.com/report')
      host.removeEventListener('helix-terminal-link', taken)
    } finally {
      window.open = open
    }
    expect(opened).toEqual([['https://example.com/build-log', '_blank', 'noopener,noreferrer']])
  })

  test('a renderer detached, or replaced, is no longer heard', async () => {
    const host = await frame()
    const first = host.attach(standIn(host).renderer)
    let heard = 0
    host.addEventListener('helix-terminal-input', () => {
      heard += 1
    })
    host.attach(standIn(host).renderer)
    first.input('late')
    expect(heard).toBe(0)
  })
})

describe('the process exiting', () => {
  test('the status line says how, Restart asks the page, and the change is said', async () => {
    const host = await frame()
    host.attach(standIn(host).renderer)
    expect(part(host, 'status')?.hasAttribute('hidden')).toBe(true)
    host.exitCode = 130
    await settle(host)
    expect(hasState(host, 'exited')).toBe(true)
    expect(part(host, 'status')?.textContent).toContain('The process exited with code 130.')
    expect(part(host, 'live')?.textContent?.trim()).toBe('The process exited with code 130.')
    let restarted = 0
    host.addEventListener('helix-terminal-restart', () => {
      restarted += 1
    })
    ;(part(host, 'restart') as HTMLButtonElement).click()
    expect(restarted).toBe(1)
    host.exitCode = 0
    await settle(host)
    expect(part(host, 'status')?.textContent).toContain('The process exited.')
  })

  test('an exit written in the markup is shown and not announced', async () => {
    const host = await frame('exit-code="2"')
    expect(part(host, 'status')?.textContent).toContain('The process exited with code 2.')
    expect(part(host, 'live')?.textContent?.trim()).toBe('')
  })
})

/* Browser only: happy-dom does not inherit a custom property into a computed
   style, so a color the page sets can only be read there. */
const run = hasLayout() ? test : (): void => {}

describe('the look a renderer is themed with', () => {
  run('is what the page sets, and leaves out a color nothing sets', async () => {
    const host = await frame('style="--terminal-ansi-red: rgb(200, 10, 20); font: 14px monospace"')
    const { colors, font } = host.look()
    expect(colors.red).toBe('rgb(200, 10, 20)')
    expect(colors.blue).toBeUndefined()
    expect(font?.size).toBe(14)
  })
})
