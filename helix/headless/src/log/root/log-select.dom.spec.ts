import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* Selecting lines, the address that follows, the one tab stop among the
   numbers, and reading a CI log's markers with `format`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  history.replaceState(null, '', location.pathname)
})

type Line = HTMLElement & { updateComplete: Promise<unknown> }

interface Log extends HTMLElement {
  format?: string
  groups: readonly { heading: string; id: string; status?: string }[]
  lines: readonly { group?: string; level?: string; text: string }[]
  selectedLines: string
  updateComplete: Promise<unknown>
  write(chunk: string): void
}

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const lines = (element: Log): Line[] => [
  ...element.querySelectorAll<Line>('helix-headless-log-line'),
]

const settle = async (element: Log): Promise<void> => {
  await Promise.resolve()
  await element.updateComplete
  await element.updateComplete
  await Promise.all(lines(element).map((line) => line.updateComplete))
}

const number = (line: Line): HTMLElement => part(line, 'number') as HTMLElement

const opened = async (attributes: string, count = 5): Promise<Log> => {
  const body = Array.from(
    { length: count },
    (_, index) => `<helix-headless-log-line>line ${index + 1}</helix-headless-log-line>`,
  ).join('')
  const element = (await mount(
    `<helix-headless-log label="Build" line-numbers ${attributes}>${body}</helix-headless-log>`,
  )) as Log
  await frame()
  await settle(element)
  return element
}

describe('a selectable log', () => {
  test('draws each number as a button named for its line', async () => {
    const element = await opened('selectable')
    const button = number(lines(element)[1] as Line)
    expect(button.localName).toBe('button')
    expect(button.getAttribute('aria-label')).toBe('Line 2')
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  test('selects a line on a press, asking first and saying so after', async () => {
    const element = await opened('selectable')
    const heard: string[] = []
    element.addEventListener('helix-select', (event) =>
      heard.push(`select ${(event as CustomEvent).detail.value}`),
    )
    element.addEventListener('helix-selected', (event) =>
      heard.push(`selected ${(event as CustomEvent).detail.value}`),
    )
    number(lines(element)[2] as Line).click()
    await settle(element)
    expect(element.selectedLines).toBe('3')
    expect(heard).toEqual(['select 3', 'selected 3'])
    expect(part(lines(element)[2] as Line, 'line')?.getAttribute('part')).toBe('line line-selected')
    expect(number(lines(element)[2] as Line).getAttribute('aria-pressed')).toBe('true')
  })

  test('selects a range on a press with Shift, from the line pressed before', async () => {
    const element = await opened('selectable')
    number(lines(element)[1] as Line).click()
    await settle(element)
    number(lines(element)[3] as Line).dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true, shiftKey: true }),
    )
    await settle(element)
    expect(element.selectedLines).toBe('2-4')
    expect(
      lines(element).map((line) =>
        part(line, 'line')?.getAttribute('part')?.includes('line-selected'),
      ),
    ).toEqual([false, true, true, true, false])
  })

  test('keeps the selection where the request is refused', async () => {
    const element = await opened('selectable')
    element.addEventListener('helix-select', (event) => event.preventDefault())
    number(lines(element)[0] as Line).click()
    await settle(element)
    expect(element.selectedLines).toBe('')
  })

  test('puts the selection in the address, as line-href spells a line', async () => {
    const element = await opened('selectable line-href="#L{n}"')
    number(lines(element)[1] as Line).click()
    await settle(element)
    expect(location.hash).toBe('#L2')
    number(lines(element)[4] as Line).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, shiftKey: true }),
    )
    await settle(element)
    expect(location.hash).toBe('#L2-L5')
  })

  test('selects the lines the address names when it opens', async () => {
    history.replaceState(null, '', '#L3-L4')
    const element = await opened('selectable line-href="#L{n}"')
    expect(element.selectedLines).toBe('3-4')
  })
})

describe('the numbers are one tab stop', () => {
  test('one number takes Tab and the rest wait for the arrow keys', async () => {
    const element = await opened('selectable')
    expect(lines(element).map((line) => number(line).getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
    ])
  })

  test('the stop is the first selected line', async () => {
    const element = await opened('selectable selected-lines="4"')
    expect(lines(element).map((line) => number(line).getAttribute('tabindex'))).toEqual([
      '-1',
      '-1',
      '-1',
      '0',
      '-1',
    ])
  })

  test('the arrow keys and Home and End move the stop and focus', async () => {
    const element = await opened('line-href="#L{n}"')
    const key = async (from: number, name: string, shiftKey = false): Promise<void> => {
      number(lines(element)[from] as Line).dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: name,
          shiftKey,
        }),
      )
      await settle(element)
    }
    await key(0, 'ArrowDown')
    expect(number(lines(element)[1] as Line).getAttribute('tabindex')).toBe('0')
    expect(number(lines(element)[0] as Line).getAttribute('tabindex')).toBe('-1')
    await key(1, 'End')
    expect(number(lines(element)[4] as Line).getAttribute('tabindex')).toBe('0')
    await key(4, 'Home')
    expect(number(lines(element)[0] as Line).getAttribute('tabindex')).toBe('0')
  })

  test('Shift with an arrow key extends the selection on a selectable log', async () => {
    const element = await opened('selectable')
    number(lines(element)[1] as Line).click()
    await settle(element)
    number(lines(element)[1] as Line).dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'ArrowDown',
        shiftKey: true,
      }),
    )
    await settle(element)
    expect(element.selectedLines).toBe('2-3')
  })

  test('numbers that are only text take no focus', async () => {
    const element = await opened('')
    expect(number(lines(element)[0] as Line).localName).toBe('span')
    expect(number(lines(element)[0] as Line).hasAttribute('tabindex')).toBe(false)
  })
})

describe('format', () => {
  test('reads a GitHub Actions log into steps, folding the one that passed', async () => {
    const element = (await mount(
      '<helix-headless-log label="CI" format="github-actions"></helix-headless-log><style>helix-headless-log::part(log) { block-size: 20rem }</style>',
    )) as Log
    await frame()
    element.write(
      '::group::Install\nadded 214 packages\n::endgroup::\n::group::Test\n::error::1 failed\n::endgroup::\n',
    )
    await settle(element)
    const groups = [
      ...(element.shadowRoot?.querySelectorAll<HTMLElement>(
        '[part="row"] > helix-headless-log-group',
      ) ?? []),
    ]
    expect(
      groups.map((group) => [group.getAttribute('heading'), group.getAttribute('status')]),
    ).toEqual([
      ['Install', 'done'],
      ['Test', 'failed'],
    ])
    expect(element.lines).toEqual([
      { group: 'step-1', text: 'added 214 packages' },
      { group: 'step-2', level: 'error', text: '1 failed' },
    ])
    expect(hasState(element, 'empty')).toBe(false)
  })

  test('steps a parser finished are said, as a page’s steps are', async () => {
    const element = (await mount(
      '<helix-headless-log label="CI" format="github-actions"></helix-headless-log><style>helix-headless-log::part(log) { block-size: 20rem }</style>',
    )) as Log
    await frame()
    element.write('::group::Install\nadded\n')
    await settle(element)
    await frame()
    element.write('::endgroup::\n')
    await settle(element)
    expect(part(element, 'live')?.textContent?.trim()).toBe('Install finished')
  })
})
