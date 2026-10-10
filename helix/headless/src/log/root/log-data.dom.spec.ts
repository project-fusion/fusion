import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { LogGroup, LogLine, LogParser } from '../buffer.js'
import type { LogSource } from './log-root.js'

/* A log handed text: what it draws, what it keeps, and what it says. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Log extends HTMLElement {
  clear(): void
  done: boolean
  groups: readonly LogGroup[]
  limit: number
  lineNumbers: boolean
  lines: readonly LogLine[]
  parse: LogParser | undefined
  query: string
  source: LogSource | null
  text: string
  updateComplete: Promise<unknown>
  write(chunk: string): void
}

type Drawn = HTMLElement & { updateComplete: Promise<unknown> }

const ESC = '\x1b'

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const settle = async (element: Log): Promise<void> => {
  await Promise.resolve()
  await element.updateComplete
  await element.updateComplete
  await Promise.all(rows(element).map((row) => (row.firstElementChild as Drawn).updateComplete))
}

const rows = (element: Log): HTMLElement[] => [
  ...(element.shadowRoot?.querySelectorAll<HTMLElement>('[part="row"]') ?? []),
]

/** Each drawn row as a short string: a line's number and text, or a group's heading. */
const shape = (element: Log): string[] =>
  rows(element).map((row) => {
    const child = row.firstElementChild as Drawn
    if (child.localName === 'helix-headless-log-group') {
      const open = part(child, 'summary')?.getAttribute('aria-expanded') === 'true'
      return `[${child.getAttribute('heading')}${open ? '' : ' shut'}]`
    }
    const number = part(child, 'number')?.textContent
    const text = part(child, 'text')?.textContent ?? ''
    return number ? `${number} ${text}` : text
  })

const said = (element: Log): string => part(element, 'live')?.textContent?.trim() ?? ''

/* A box to window, which headless leaves to the consumer. */
const opened = async (attributes = ''): Promise<Log> => {
  const element = (await mount(
    `<helix-headless-log label="Build" ${attributes}></helix-headless-log>
    <style>helix-headless-log::part(log) { block-size: 20rem }</style>`,
  )) as Log
  await frame()
  await settle(element)
  return element
}

describe('text written to the log', () => {
  test('is drawn a line to a row, the line still being written last', async () => {
    const element = await opened('line-numbers')
    element.write('Installing dependencies\nCompiling 214 mod')
    await settle(element)
    expect(shape(element)).toEqual(['1 Installing dependencies', '2 Compiling 214 mod'])
    element.write('ules\n')
    await settle(element)
    expect(shape(element)).toEqual(['1 Installing dependencies', '2 Compiling 214 modules'])
  })

  test('starts a line over at a carriage return, so a progress bar is one row', async () => {
    const element = await opened()
    element.write('Uploading 10%\rUploading 80%\rUploading 100%')
    await settle(element)
    expect(shape(element)).toEqual(['Uploading 100%'])
  })

  test('draws ANSI colors as runs, through the stylesheet’s sixteen', async () => {
    const element = await opened()
    element.write(`${ESC}[1;31mFAIL${ESC}[0m styled/button\n`)
    await settle(element)
    const line = rows(element)[0]?.firstElementChild as Drawn
    const run = part(line, 'run') as HTMLElement
    expect(run.getAttribute('part')).toBe('run run-bold')
    expect(run.getAttribute('style')?.trim()).toBe('--log-run-color: var(--log-ansi-red);')
    expect(part(line, 'text')?.textContent).toBe('FAIL styled/button')
  })

  test('forwards a drawn line’s parts, so a page can style them', async () => {
    const element = await opened()
    element.write('ok\n')
    await settle(element)
    const line = rows(element)[0]?.firstElementChild as HTMLElement
    expect(line.getAttribute('exportparts')).toContain('number: line-number')
    expect(line.getAttribute('exportparts')).toContain('run-bold: line-run-bold')
  })

  test('reads each finished line with parse', async () => {
    const element = await opened()
    element.parse = (text) =>
      text.startsWith('::error::') ? { level: 'error', text: text.slice(9) } : undefined
    element.write('::error::Process completed with exit code 1\n')
    await settle(element)
    expect(element.lines).toEqual([{ level: 'error', text: 'Process completed with exit code 1' }])
    const line = rows(element)[0]?.firstElementChild as Drawn
    expect(part(line, 'line')?.getAttribute('part')).toBe('line line-error')
  })

  test('keeps only the newest lines past the limit, numbered as they were written', async () => {
    const element = await opened('line-numbers limit="2"')
    element.write('a\nb\nc\nd\n')
    await settle(element)
    expect(shape(element)).toEqual(['3 c', '4 d'])
    expect(part(element, 'dropped')?.textContent?.trim()).toBe('2 earlier lines are not kept')
    expect(part(element, 'dropped')?.hasAttribute('hidden')).toBe(false)
  })

  test('reads as plain text, the escape codes taken out', async () => {
    const element = await opened()
    element.write(`${ESC}[32mok${ESC}[0m\nstill going`)
    expect(element.text).toBe('ok\nstill going')
  })

  test('starts over on clear', async () => {
    const element = await opened()
    element.write('a\nb\n')
    await settle(element)
    element.clear()
    await settle(element)
    expect(rows(element)).toEqual([])
    expect(hasState(element, 'empty')).toBe(true)
  })
})

describe('a source', () => {
  test('is read to its end, bytes as UTF-8, and sets done', async () => {
    const element = await opened()
    const bytes = new TextEncoder().encode('Ready ✓\n')
    element.source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 7))
        controller.enqueue(bytes.slice(7))
        controller.close()
      },
    })
    const log = part(element, 'log') as HTMLElement
    await element.updateComplete
    expect(log.getAttribute('aria-busy')).toBe('true')
    for (let tries = 0; tries < 20 && !element.done; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    await settle(element)
    expect(element.done).toBe(true)
    expect(shape(element)).toEqual(['Ready ✓'])
    expect(log.hasAttribute('aria-busy')).toBe(false)
    expect(said(element)).toBe('Finished')
  })

  test('can be an async iterable, and a new one stops reading the last', async () => {
    const element = await opened()
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    element.source = (async function* () {
      yield 'first\n'
      await held
      yield 'never\n'
    })()
    await new Promise((resolve) => setTimeout(resolve, 0))
    element.source = (async function* () {
      yield 'second\n'
    })()
    release()
    for (let tries = 0; tries < 20 && !element.done; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    await settle(element)
    expect(element.lines.map((line) => line.text)).toEqual(['first', 'second'])
  })
})

describe('groups', () => {
  const groups: LogGroup[] = [
    { duration: '4s', heading: 'Install', id: 'install', status: 'done' },
    { heading: 'Test', id: 'test', open: true, status: 'running' },
  ]
  const lines: LogLine[] = [
    { group: 'install', text: 'added 214 packages' },
    { group: 'test', text: 'PASS core' },
  ]

  test('stand before their first line, shut unless they open', async () => {
    const element = await opened()
    element.groups = groups
    element.lines = lines
    await settle(element)
    expect(shape(element)).toEqual(['[Install shut]', '[Test]', 'PASS core'])
    const group = rows(element)[0]?.firstElementChild as HTMLElement
    expect(group.getAttribute('exportparts')).toContain('summary: group-summary-done')
  })

  test('open when pressed, and say which are open', async () => {
    const element = await opened()
    element.groups = groups
    element.lines = lines
    await settle(element)
    const expanded: string[] = []
    element.addEventListener('helix-expand', (event) =>
      expanded.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    const group = rows(element)[0]?.firstElementChild as Drawn
    ;(part(group, 'summary') as HTMLButtonElement).click()
    await settle(element)
    expect(shape(element)).toEqual(['[Install]', 'added 214 packages', '[Test]', 'PASS core'])
    expect(expanded).toEqual(['install,test'])
  })

  test('are said when they finish or fail', async () => {
    const element = await opened()
    element.groups = groups
    element.lines = lines
    await settle(element)
    await frame()
    element.groups = [groups[0] as LogGroup, { ...(groups[1] as LogGroup), status: 'failed' }]
    await settle(element)
    expect(said(element)).toBe('Test failed')
  })
})

describe('a query', () => {
  test('shows only matching lines, marks each match, and opens their groups', async () => {
    const element = await opened()
    element.groups = [{ heading: 'Install', id: 'install' }]
    element.lines = [
      { text: 'Run started' },
      { group: 'install', text: 'added 214 packages' },
      { group: 'install', text: 'audited 215 Packages' },
    ]
    await settle(element)
    await frame()
    element.query = 'package'
    await settle(element)
    expect(shape(element)).toEqual(['[Install]', 'added 214 packages', 'audited 215 Packages'])
    const line = rows(element)[2]?.firstElementChild as Drawn
    expect(part(line, 'match')?.textContent).toBe('Package')
    expect(said(element)).toBe('2 lines match')
  })
})
