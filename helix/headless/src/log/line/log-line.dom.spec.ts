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
