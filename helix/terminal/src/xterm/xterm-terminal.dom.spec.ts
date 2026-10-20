import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import type { Terminal } from '@xterm/xterm'
import xtermCss from '@xterm/xterm/css/xterm.css' with { type: 'text' }

/* Imported after the DOM is registered, like the elements: the connector
   reaches `@fusion.dev/helix-core`, which evaluates Lit. */
let connectTerminal: typeof import('../connect-terminal/connect-terminal.js').connectTerminal
let onApple: () => boolean
let xtermDriver: typeof import('./xterm-driver.js').xtermDriver

/** A part of the terminal's find bar, inside the Find it draws. */
const inFind = (host: HTMLElement, name: string): Element | null =>
  part(part(host, 'find') as HTMLElement, name)

beforeAll(async () => {
  registerDom()
  ;({ onApple } = await import('@fusion.dev/helix-core'))
  await import('@fusion.dev/helix-headless/terminal')
  ;({ connectTerminal } = await import('../connect-terminal/connect-terminal.js'))
  ;({ xtermDriver } = await import('./xterm-driver.js'))
})

/* Browser only: xterm.js measures its cells from a layout, which happy-dom
   does not have. */
const run = hasLayout() ? test : (): void => {}

/** Waits for `done` to hold, a frame at a time, for up to a second and a half. */
const until = async (done: () => boolean): Promise<boolean> => {
  const end = performance.now() + 1500
  while (!done() && performance.now() < end) {
    await new Promise((next) => requestAnimationFrame(next))
  }
  return done()
}

type Frame = HTMLElement & {
  readOnly: boolean
  text(scope?: 'all' | 'screen'): string
  updateComplete: Promise<unknown>
  write(data: string | Uint8Array): Promise<void>
}

interface Made {
  host: Frame
  sizes: { columns: number; height: number; rows: number; width: number }[]
  terminal: Terminal
}

/** Runs `body` against a frame on a real xterm.js terminal, made fresh for it, and takes both down after. */
const onTerminal = async (body: (made: Made) => Promise<void>): Promise<void> => {
  const { Terminal } = await import('@xterm/xterm')
  const { FitAddon } = await import('@xterm/addon-fit')
  const { SearchAddon } = await import('@xterm/addon-search')
  if (!document.getElementById('xterm-css')) {
    const sheet = document.createElement('style')
    sheet.id = 'xterm-css'
    sheet.textContent = xtermCss
    document.head.append(sheet)
  }
  const host = (await mount(
    `<helix-headless-terminal
      label="Shell"
      style="display: block; inline-size: 480px; --terminal-color: rgb(17, 17, 17); --terminal-ansi-red: oklch(0.55 0.2 25)"
    >
      <div style="inline-size: 480px; block-size: 240px"></div>
    </helix-headless-terminal>`,
  )) as Frame
  const sizes: Made['sizes'] = []
  host.addEventListener('helix-terminal-resize', (event) => sizes.push(event.detail))
  const terminal = new Terminal()
  terminal.open(host.querySelector('div') as HTMLElement)
  const connection = connectTerminal(
    host,
    xtermDriver(terminal, { fit: new FitAddon(), search: new SearchAddon() }),
  )
  try {
    await body({ host, sizes, terminal })
  } finally {
    connection.disconnect()
    terminal.dispose()
    host.remove()
  }
}

describe('a frame on xterm.js', () => {
  run('fits the grid to its box and says the size the process starts at', async () => {
    await onTerminal(async ({ sizes }) => {
      expect(await until(() => sizes.length > 0)).toBe(true)
      const [first] = sizes
      expect(first?.columns ?? 0).toBeGreaterThan(20)
      expect(first?.rows ?? 0).toBeGreaterThan(5)
      expect(first?.width ?? 0).toBeGreaterThan(0)
    })
  })

  run('draws what the frame is written, and reads it back as text', async () => {
    await onTerminal(async ({ host }) => {
      await host.write('hello\r\n\u001b[31mred\u001b[0m\r\n')
      expect(host.text()).toContain('hello\nred')
    })
  })

  run('is themed from the frame’s properties, each color one xterm.js parses', async () => {
    await onTerminal(async ({ terminal }) => {
      const theme = terminal.options.theme ?? {}
      expect(theme.foreground).toBe('#111111')
      expect(theme.red).toMatch(/^#[0-9a-f]{6}$/)
      expect(terminal.options.minimumContrastRatio).toBe(4.5)
    })
  })

  run('sends what the reader types to the page', async () => {
    await onTerminal(async ({ host, terminal }) => {
      const heard: string[] = []
      host.addEventListener('helix-terminal-input', (event) => heard.push(event.detail.data))
      terminal.input('ls\r', true)
      expect(heard).toEqual(['ls\r'])
      host.readOnly = true
      await settle(host)
      expect(terminal.options.disableStdin).toBe(true)
    })
  })

  run('the find bar searches the output and says the count', async () => {
    await onTerminal(async ({ host, terminal }) => {
      await host.write('error one\r\nfine\r\nerror two\r\n')
      const input = terminal.textarea as HTMLTextAreaElement
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          ...(onApple()
            ? { key: 'f', metaKey: true }
            : { ctrlKey: true, key: 'F', shiftKey: true }),
        }),
      )
      await settle(host)
      const field = inFind(host, 'field') as HTMLInputElement
      field.value = 'error'
      field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      expect(await until(() => (inFind(host, 'count')?.textContent ?? '').includes('of 2'))).toBe(
        true,
      )
    })
  })

  run(
    'the find bar matches case, whole words, and a regular expression, as xterm.js searches',
    async () => {
      await onTerminal(async ({ host, terminal }) => {
        await host.write('Error one\r\nfine\r\nerror two\r\nerrors three\r\n')
        const input = terminal.textarea as HTMLTextAreaElement
        input.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            composed: true,
            ...(onApple()
              ? { key: 'f', metaKey: true }
              : { ctrlKey: true, key: 'F', shiftKey: true }),
          }),
        )
        await settle(host)
        const count = (): string => inFind(host, 'count')?.textContent ?? ''
        const field = inFind(host, 'field') as HTMLInputElement
        const type = (query: string): void => {
          field.value = query
          field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        }
        type('error')
        expect(await until(() => count().includes('of 3'))).toBe(true)
        ;(inFind(host, 'match-case') as HTMLElement).click()
        expect(await until(() => count().includes('of 2'))).toBe(true)
        ;(inFind(host, 'whole-word') as HTMLElement).click()
        expect(await until(() => count().includes('of 1'))).toBe(true)
        ;(inFind(host, 'match-case') as HTMLElement).click()
        ;(inFind(host, 'whole-word') as HTMLElement).click()
        ;(inFind(host, 'regex') as HTMLElement).click()
        type('(one|two)$')
        expect(await until(() => count().includes('of 2'))).toBe(true)
      })
    },
  )
})
