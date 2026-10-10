import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, label, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

/* A log written as children: what each line is told, what the log says, and
   what it draws. Where a reader is left in the box is the browser suite's,
   since happy-dom has no box. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Log extends HTMLElement {
  done: boolean
  lineHref: string
  lineNumbers: boolean
  markLines: string
  pinned: boolean
  query: string
  scrollToLine(number: number): Promise<boolean>
  text: string
  timestamps?: string
  updateComplete: Promise<unknown>
}

type Line = HTMLElement & { updateComplete: Promise<unknown> }

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

/* A child arriving is heard by an observer a microtask later, and what each
   line is told is a render of its own after the log's. */
const settle = async (element: Log): Promise<void> => {
  await Promise.resolve()
  await element.updateComplete
  await element.updateComplete
  await Promise.all(lines(element).map((line) => line.updateComplete))
}

const lines = (element: Log): Line[] => [
  ...element.querySelectorAll<Line>('helix-headless-log-line'),
]

const said = (element: Log): string => part(element, 'live')?.textContent?.trim() ?? ''

const opened = async (attributes = '', body = ''): Promise<Log> => {
  const element = (await mount(`<helix-headless-log label="Deploy" ${attributes}>
    ${
      body ||
      `<helix-headless-log-line at="2026-10-09T12:00:00Z">Cloning</helix-headless-log-line>
    <helix-headless-log-group heading="Install" status="running">
      <helix-headless-log-line at="2026-10-09T12:00:09Z">added 214 packages</helix-headless-log-line>
      <helix-headless-log-line at="2026-10-09T12:01:15Z" level="warn">deprecated glob</helix-headless-log-line>
    </helix-headless-log-group>`
    }
  </helix-headless-log>`)) as Log
  await frame()
  await settle(element)
  return element
}

describe('the log', () => {
  test('is a named region holding a quiet log', async () => {
    const element = await opened()
    expect(role(element)).toBe('region')
    expect(label(element)).toBe('Deploy')
    const log = part(element, 'log') as HTMLElement
    expect(log.getAttribute('role')).toBe('log')
    expect(log.getAttribute('aria-live')).toBe('off')
    expect(log.hasAttribute('data-scroller')).toBe(true)
  })

  test('opens following its newest line, with the way back hidden', async () => {
    const element = await opened()
    expect(element.pinned).toBe(true)
    expect(hasState(element, 'pinned')).toBe(true)
    expect(part(element, 'resume')?.hasAttribute('hidden')).toBe(true)
  })

  test('says it is empty when it holds no lines', async () => {
    const element = (await mount('<helix-headless-log></helix-headless-log>')) as Log
    await settle(element)
    expect(hasState(element, 'empty')).toBe(true)
    expect(part(element, 'empty')?.textContent?.trim()).toBe('No output yet')
  })
})

describe('lines written as children', () => {
  test('are numbered through every group, and show no number until asked', async () => {
    const element = await opened()
    expect(lines(element).map((line) => part(line, 'number'))).toEqual([null, null, null])
    element.lineNumbers = true
    await settle(element)
    expect(lines(element).map((line) => part(line, 'number')?.textContent)).toEqual(['1', '2', '3'])
    /* A plain number is read past, since a reader hears every line. */
    expect(part(lines(element)[0] as Line, 'number')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('link their numbers with line-href, each named for its line', async () => {
    const element = await opened('line-numbers line-href="#L{n}"')
    const link = part(lines(element)[1] as Line, 'number') as HTMLAnchorElement
    expect(link.localName).toBe('a')
    expect(link.getAttribute('href')).toBe('#L2')
    expect(link.getAttribute('aria-label')).toBe('Line 2')
  })

  test('show the time into the run with relative timestamps', async () => {
    const element = await opened('timestamps="relative"')
    expect(lines(element).map((line) => part(line, 'time')?.textContent)).toEqual([
      '0:00',
      '0:09',
      '1:15',
    ])
    expect(part(lines(element)[0] as Line, 'time')?.getAttribute('datetime')).toBe(
      '2026-10-09T12:00:00.000Z',
    )
  })

  test('mark the lines mark-lines names', async () => {
    const element = await opened('mark-lines="2-3"')
    expect(lines(element).map((line) => part(line, 'line')?.getAttribute('part'))).toEqual([
      'line',
      'line line-marked line-grouped',
      'line line-warn line-marked line-grouped',
    ])
  })

  test('hide what a query does not match, and open the group holding a match', async () => {
    const element = await opened()
    const group = element.querySelector('helix-headless-log-group') as HTMLElement & {
      open: boolean
    }
    expect(group.open).toBe(false)
    element.query = 'PACKAGES'
    await settle(element)
    expect(hasState(element, 'filtered')).toBe(true)
    expect(lines(element).map((line) => hasState(line, 'filtered'))).toEqual([true, false, true])
    expect(part(lines(element)[0] as Line, 'line')).toBeNull()
    expect(group.open).toBe(true)
  })

  test('read as plain text, one to a row', async () => {
    const element = await opened()
    expect(element.text).toBe('Cloning\nadded 214 packages\ndeprecated glob')
  })
})

describe('what the log says', () => {
  test('nothing of the lines it opened with', async () => {
    const element = await opened()
    expect(said(element)).toBe('')
  })

  test('a line at error, when it arrives', async () => {
    const element = await opened()
    const line = document.createElement('helix-headless-log-line')
    line.setAttribute('level', 'error')
    line.textContent = 'Command failed with exit code 1'
    element.append(line)
    await settle(element)
    expect(said(element)).toBe('Error: Command failed with exit code 1')
  })

  test('a step that finishes or fails, by its heading', async () => {
    const element = await opened()
    element.querySelector('helix-headless-log-group')?.setAttribute('status', 'failed')
    await settle(element)
    expect(said(element)).toBe('Install failed')
  })

  test('the end of the run', async () => {
    const element = await opened()
    element.done = true
    await settle(element)
    expect(said(element)).toBe('Finished')
    expect(hasState(element, 'done')).toBe(true)
  })

  test('how many lines a query matches', async () => {
    const element = await opened()
    element.query = 'e'
    await settle(element)
    expect(said(element)).toBe('2 lines match')
  })
})

describe('a quiet log', () => {
  test('says nothing as errors arrive, steps fail, or the run ends', async () => {
    const element = await opened('quiet')
    const line = document.createElement('helix-headless-log-line')
    line.setAttribute('level', 'error')
    line.textContent = 'Command failed'
    element.append(line)
    element.querySelector('helix-headless-log-group')?.setAttribute('status', 'failed')
    element.done = true
    await settle(element)
    expect(said(element)).toBe('')
  })
})
