import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Line = HTMLElement & {
  logNumber: number
  logNumbers: boolean
  logQuery: string
  logTimes: string
  runs: unknown
  updateComplete: Promise<unknown>
}

const line = async (
  markup = '<helix-headless-log-line>ok</helix-headless-log-line>',
): Promise<Line> => {
  const host = (await mount(`<div>${markup}</div>`)) as HTMLElement
  const element = host.querySelector('helix-headless-log-line') as Line
  await element.updateComplete
  return element
}

describe('Log Line', () => {
  test('shows its own text, with no number or time until a log asks', async () => {
    const element = await line()
    expect(part(element, 'text')?.querySelector('slot')).not.toBeNull()
    expect(part(element, 'number')).toBeNull()
    expect(part(element, 'time')).toBeNull()
  })

  test('names its row for its level', async () => {
    const element = await line(
      '<helix-headless-log-line level="warn">deprecated</helix-headless-log-line>',
    )
    expect(part(element, 'line')?.getAttribute('part')).toBe('line line-warn')
  })

  test('reads a time written as milliseconds', async () => {
    const element = await line(
      '<helix-headless-log-line at="1791547200000">ok</helix-headless-log-line>',
    )
    element.logTimes = 'relative'
    await element.updateComplete
    expect(part(element, 'time')?.getAttribute('datetime')).toBe(
      new Date(1791547200000).toISOString(),
    )
  })

  test('draws the runs a log hands it, marking its query in them', async () => {
    const element = await line('<helix-headless-log-line></helix-headless-log-line>')
    element.runs = [
      { text: 'no ' },
      { color: 'var(--log-ansi-red)', italic: true, text: 'match here' },
    ]
    element.logQuery = 'match'
    await element.updateComplete
    const run = part(element, 'run') as HTMLElement
    expect(run.getAttribute('part')).toBe('run run-italic')
    expect(run.closest('mark')?.getAttribute('part')).toBe('match')
    expect(part(element, 'text')?.textContent).toBe('no match here')
  })
})

describe('what a line says beside its text', () => {
  test('its level in words at debug, warn and error, and nothing at info or log', async () => {
    for (const [level, words] of [
      ['debug', 'Debug:'],
      ['warn', 'Warning:'],
      ['error', 'Error:'],
    ]) {
      const element = await line(
        `<helix-headless-log-line level="${level}">ok</helix-headless-log-line>`,
      )
      expect(part(element, 'level')?.textContent?.trim()).toBe(words)
    }
    for (const level of ['info', 'log']) {
      const element = await line(
        `<helix-headless-log-line level="${level}">ok</helix-headless-log-line>`,
      )
      expect(part(element, 'level')).toBeNull()
    }
  })

  /* `console.error(error)` writes `Error: …`, which read `Error: Error: …`. */
  test('no level where its text already starts with the words, written or drawn from data', async () => {
    /* The first render is the server's, which has no text to read; the log
       numbers its lines once it has hydrated, and the line reads it then. */
    const written = await line(
      '<helix-headless-log-line level="error">Error: Cannot find module</helix-headless-log-line>',
    )
    written.logNumber = 1
    await written.updateComplete
    expect(part(written, 'level')).toBeNull()
    const plural = await line(
      '<helix-headless-log-line level="error">Errors: 2</helix-headless-log-line>',
    )
    plural.logNumber = 1
    await plural.updateComplete
    expect(part(plural, 'level')?.textContent?.trim()).toBe('Error:')
    const drawn = (await line(
      '<helix-headless-log-line level="warn"></helix-headless-log-line>',
    )) as Line
    drawn.runs = [{ text: 'warning: glob@7.2.3 is deprecated' }]
    await drawn.updateComplete
    expect(part(drawn, 'level')).toBeNull()
  })

  test('how many times it was written, as a number and in words, once a log folds it', async () => {
    const element = (await line()) as Line & { logCount: number }
    expect(part(element, 'count')).toBeNull()
    element.logCount = 3
    await element.updateComplete
    expect(part(element, 'count')?.textContent?.trim()).toBe('3')
    expect(part(element, 'count')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(element, 'count-label')?.textContent?.trim()).toBe('3 times')
  })
})
