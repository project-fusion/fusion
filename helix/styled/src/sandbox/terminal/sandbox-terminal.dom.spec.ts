import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

  /* The level was hidden from screen readers, so an error read the same as a
     log. A plain log keeps its word hidden, being every other line. */
  test('reads a warning and an error by their level', async () => {
    const term = await terminal()
    term.write({ level: 'error', text: 'Boom' })
    term.write({ level: 'log', text: 'hi' })
    await term.updateComplete
    const levels = [...(term.shadowRoot?.querySelectorAll('[part="level"]') ?? [])]
    expect(levels.map((level) => level.getAttribute('aria-hidden'))).toEqual([null, 'true'])
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

  test('has no controls unless asked, and the asked-for ones clear and filter', async () => {
    const plain = await terminal()
    expect(part(plain, 'controls')).toBeNull()

    const term = (await mount(
      '<helix-sandbox-terminal controls></helix-sandbox-terminal>',
    )) as Terminal & { level?: string | undefined }
    term.write({ level: 'log', text: 'hi' })
    term.write({ level: 'warn', text: 'careful' })
    term.write({ level: 'error', text: 'Boom' })
    await term.updateComplete

    const filter = part(term, 'filter') as HTMLSelectElement
    expect(filter.getAttribute('aria-label')).toBe('Levels shown')
    filter.value = 'warn'
    filter.dispatchEvent(new Event('change'))
    await term.updateComplete
    expect(term.level).toBe('warn')
    expect(lines(term).map((line) => line.text)).toEqual(['careful', 'Boom'])

    term.level = undefined
    await term.updateComplete
    expect(lines(term)).toHaveLength(3)

    ;(part(term, 'clear') as HTMLButtonElement).click()
    await term.updateComplete
    expect(lines(term)).toEqual([])
    expect(part(term, 'empty')).not.toBeNull()
  })

  /* Lit's `Object` converter turned JSON that did not parse into `null`, and
     the render read a level off it and threw, so the terminal drew nothing. */
  test('words that do not parse keep the English ones, and the terminal still draws', async () => {
    const term = (await mount(
      `<helix-sandbox-terminal controls level-words="oops"></helix-sandbox-terminal>`,
    )) as Terminal
    expect(part(term, 'log')).not.toBeNull()
    const choices = [...(part(term, 'filter')?.querySelectorAll('option') ?? [])]
    expect(choices.map((choice) => choice.textContent?.trim())).toEqual([
      'All levels',
      'Info and above',
      'Warnings and errors',
      'Errors',
    ])
  })

  test('the filter asks before it changes, and says so after', async () => {
    const term = (await mount(
      '<helix-sandbox-terminal controls></helix-sandbox-terminal>',
    )) as Terminal & { level?: string | undefined }
    const heard: string[] = []
    term.addEventListener('helix-before-change', (event) => {
      heard.push(`before ${(event as CustomEvent<{ value: string }>).detail.value}`)
    })
    term.addEventListener('change', () => heard.push(`change ${term.level}`))
    const filter = part(term, 'filter') as HTMLSelectElement
    filter.value = 'error'
    filter.dispatchEvent(new Event('change'))
    await term.updateComplete
    expect(heard).toEqual(['before error', 'change error'])

    const refuse = (event: Event): void => event.preventDefault()
    term.addEventListener('helix-before-change', refuse)
    filter.value = 'log'
    filter.dispatchEvent(new Event('change'))
    await term.updateComplete
    expect(term.level).toBe('error')
    expect(filter.value).toBe('error')
    expect(heard).toEqual(['before error', 'change error', 'before log'])
  })

  test('`level` hides the quieter lines without the controls', async () => {
    const term = (await mount(
      '<helix-sandbox-terminal level="error"></helix-sandbox-terminal>',
    )) as Terminal
    term.write({ level: 'warn', text: 'careful' })
    term.write({ level: 'error', text: 'Boom' })
    await term.updateComplete
    expect(lines(term).map((line) => line.text)).toEqual(['Boom'])
  })
})
