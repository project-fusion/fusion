import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../../index.js')
})

type Terminal = HTMLElement & {
  clear: () => void
  updateComplete: Promise<unknown>
  write: (detail: { level: 'log' | 'info' | 'warn' | 'error'; text: string }) => void
}

const terminal = async (): Promise<Terminal> =>
  (await mount('<helix-sandbox-terminal></helix-sandbox-terminal>')) as Terminal

const lines = (term: Terminal): { count: string | null; level: string; text: string }[] =>
  [...(term.shadowRoot?.querySelectorAll('[part="entry"]') ?? [])].map((entry) => ({
    count: entry.querySelector('[part="count"]')?.textContent?.trim() ?? null,
    level: (entry as HTMLElement).dataset.level ?? '',
    text: entry.querySelector('[part="message"]')?.textContent ?? '',
  }))

describe('sandbox terminal', () => {
  test('it is a log, so a reader hears new output without the panel repeating', async () => {
    const term = await terminal()
    expect(part(term, 'log')?.getAttribute('role')).toBe('log')
  })

  test('nothing written, so it says so', async () => {
    const term = await terminal()
    expect(part(term, 'empty')).not.toBeNull()
    expect(part(term, 'entry')).toBeNull()
  })

  test('a line arrives with its level', async () => {
    const term = await terminal()
    term.write({ level: 'warn', text: 'careful' })
    await term.updateComplete
    expect(lines(term)).toEqual([{ count: null, level: 'warn', text: 'careful' }])
    expect(part(term, 'empty')).toBeNull()
  })

  test('consecutive repeats collapse into one line and a count', async () => {
    const term = await terminal()
    for (let index = 0; index < 4; index += 1) {
      term.write({ level: 'warn', text: 'same' })
    }
    await term.updateComplete
    expect(lines(term)).toEqual([{ count: '4', level: 'warn', text: 'same' }])
  })

  test('a repeat that is not consecutive is its own line', async () => {
    // Collapsing across a gap would reorder what happened, which is the one
    // thing a log is for.
    const term = await terminal()
    term.write({ level: 'warn', text: 'same' })
    term.write({ level: 'log', text: 'between' })
    term.write({ level: 'warn', text: 'same' })
    await term.updateComplete
    expect(lines(term).map((line) => line.text)).toEqual(['same', 'between', 'same'])
  })

  test('the same text at a different level is a different line', async () => {
    const term = await terminal()
    term.write({ level: 'warn', text: 'same' })
    term.write({ level: 'error', text: 'same' })
    await term.updateComplete
    expect(lines(term).map((line) => line.level)).toEqual(['warn', 'error'])
  })

  test('the oldest lines fall off, so a loop cannot grow it without bound', async () => {
    const term = await terminal()
    for (let index = 0; index < 260; index += 1) {
      term.write({ level: 'log', text: `line ${index}` })
    }
    await term.updateComplete
    const shown = lines(term)
    expect(shown.length).toBe(200)
    expect(shown[0]?.text).toBe('line 60')
    expect(shown.at(-1)?.text).toBe('line 259')
  })

  test('clearing empties it back to the empty state', async () => {
    const term = await terminal()
    term.write({ level: 'log', text: 'something' })
    await term.updateComplete
    term.clear()
    await term.updateComplete
    expect(part(term, 'entry')).toBeNull()
    expect(part(term, 'empty')).not.toBeNull()
  })
})
