import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../../index.js')
})

type Level = 'error' | 'info' | 'log' | 'warn'

type Console = Updatable & {
  clear: () => void
  level?: Level | undefined
  write: (detail: { level: Level; text: string }) => void
}

type Output = Updatable & {
  collapse: boolean
  level?: string | undefined
  limit: number
  lines: readonly { count?: number; level?: string; text: string }[]
  quiet: boolean
}

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

/* In a box, as a sandbox's panel gives it. With no height, the log grows to
   hold every line it keeps, and draws them a window at a time until it does. */
const opened = async (attributes = ''): Promise<Console> => {
  const host = (await mount(
    `<helix-sandbox-console ${attributes} style="--sandbox-console-size: 240px"></helix-sandbox-console>`,
  )) as Console
  await settle(host)
  return host
}

const output = (host: Console): Output => part(host, 'output') as Output

/** Waits for the console, then its log, then each line the log drew. */
const settleAll = async (host: Console): Promise<void> => {
  await settle(host)
  await settle(output(host))
  await frame()
  await settle(output(host))
  await Promise.all(drawn(host).map((line) => settle(line)))
}

/** The lines the log drew, each a Log line element. */
const drawn = (host: Console): Updatable[] =>
  [...(output(host).shadowRoot?.querySelectorAll<HTMLElement>('[part="row"]') ?? [])].map(
    (row) => row.firstElementChild as Updatable,
  )

const texts = (host: Console): string[] =>
  drawn(host).map((line) => part(line, 'text')?.textContent ?? '')

/** What a screen reader has been told, a line to an entry. */
const heard = (host: Console): string[] =>
  [...(part(host, 'live')?.querySelectorAll('p') ?? [])].map((one) => one.textContent ?? '')

describe('sandbox console', () => {
  test('draws its lines in a quiet Log that keeps 200 and folds repeats, and speaks from a log of its own', async () => {
    const host = await opened()
    const log = output(host)
    expect(log.localName).toBe('helix-log')
    expect(log.quiet).toBe(true)
    expect(log.collapse).toBe(true)
    expect(log.limit).toBe(200)
    expect(part(host, 'live')?.getAttribute('role')).toBe('log')
  })

  test('nothing written, so the log says so', async () => {
    const host = await opened()
    await settleAll(host)
    expect(part(output(host), 'empty')?.textContent?.trim()).toBe(
      'Nothing written to the console yet.',
    )
    expect(drawn(host)).toEqual([])
  })

  test('a line arrives with its level, which the line says in words where it is a warning', async () => {
    const host = await opened()
    host.write({ level: 'warn', text: 'careful' })
    await settleAll(host)
    expect(output(host).lines).toEqual([{ level: 'warn', text: 'careful' }])
    expect(texts(host)).toEqual(['careful'])
    const [line] = drawn(host)
    expect(line && part(line, 'level')?.textContent?.trim()).toBe('Warning:')
    expect(part(output(host), 'empty')).toBeNull()
  })

  /* The level was hidden from screen readers, so an error read the same as a
     log. A plain log says no level, being every other line. */
  test('tells a screen reader each new line, its level first except a plain log', async () => {
    const host = await opened()
    host.write({ level: 'error', text: 'Boom' })
    host.write({ level: 'log', text: 'hi' })
    host.write({ level: 'info', text: 'ready' })
    await settleAll(host)
    expect(heard(host)).toEqual(['Error: Boom', 'hi', 'Info: ready'])
  })

  test('a line whose text already starts with its level is not told it twice', async () => {
    const host = await opened()
    host.write({ level: 'error', text: 'Error: Boom' })
    await settleAll(host)
    expect(heard(host)).toEqual(['Error: Boom'])
    const [line] = drawn(host)
    expect(line && part(line, 'level')).toBeNull()
  })

  test('consecutive repeats fold into one line with a count, and are heard once', async () => {
    const host = await opened()
    for (let index = 0; index < 4; index += 1) {
      host.write({ level: 'warn', text: 'same' })
    }
    await settleAll(host)
    expect(output(host).lines).toEqual([{ count: 4, level: 'warn', text: 'same' }])
    const [line] = drawn(host)
    expect(line && part(line, 'count-label')?.textContent?.trim()).toBe('4 times')
    expect(heard(host)).toEqual(['Warning: same'])
  })

  test('a repeat that is not consecutive is its own line', async () => {
    // Folding across a gap would reorder what happened, which is the one
    // thing a log is for.
    const host = await opened()
    host.write({ level: 'warn', text: 'same' })
    host.write({ level: 'log', text: 'between' })
    host.write({ level: 'warn', text: 'same' })
    await settleAll(host)
    expect(texts(host)).toEqual(['same', 'between', 'same'])
    expect(heard(host)).toEqual(['Warning: same', 'between', 'Warning: same'])
  })

  test('the same text at a different level is a different line', async () => {
    const host = await opened()
    host.write({ level: 'warn', text: 'same' })
    host.write({ level: 'error', text: 'same' })
    await settleAll(host)
    expect(output(host).lines.map((line) => line.level)).toEqual(['warn', 'error'])
  })

  test('the oldest lines fall off, so a loop cannot grow it without bound, and only the newest are heard', async () => {
    const host = await opened()
    for (let index = 0; index < 260; index += 1) {
      host.write({ level: 'log', text: `line ${index}` })
    }
    await settleAll(host)
    const kept = output(host).lines
    expect(kept.length).toBe(200)
    expect(kept[0]?.text).toBe('line 60')
    expect(kept.at(-1)?.text).toBe('line 259')
    expect(heard(host)).toEqual(['line 255', 'line 256', 'line 257', 'line 258', 'line 259'])
  })

  test('lines written before the log is drawn reach it once it is', async () => {
    const host = document.createElement('helix-sandbox-console') as Console
    host.write({ level: 'log', text: 'early' })
    document.body.replaceChildren(host)
    await settleAll(host)
    expect(output(host).lines).toEqual([{ level: 'log', text: 'early' }])
  })

  test('clearing empties it back to the empty state', async () => {
    const host = await opened()
    host.write({ level: 'log', text: 'something' })
    await settleAll(host)
    host.clear()
    await settleAll(host)
    expect(output(host).lines).toEqual([])
    expect(heard(host)).toEqual([])
    expect(part(output(host), 'empty')).not.toBeNull()
    host.write({ level: 'log', text: 'something' })
    await settleAll(host)
    expect(heard(host)).toEqual(['something'])
  })

  test('has no controls unless asked, and the asked-for ones clear and filter', async () => {
    const plain = await opened()
    expect(part(plain, 'controls')).toBeNull()

    const host = await opened('controls')
    host.write({ level: 'log', text: 'hi' })
    host.write({ level: 'warn', text: 'careful' })
    host.write({ level: 'error', text: 'Boom' })
    await settleAll(host)

    const filter = part(host, 'filter') as HTMLSelectElement
    expect(filter.getAttribute('aria-label')).toBe('Levels shown')
    filter.value = 'warn'
    filter.dispatchEvent(new Event('change'))
    await settleAll(host)
    expect(host.level).toBe('warn')
    expect(output(host).level).toBe('warn')
    expect(texts(host)).toEqual(['careful', 'Boom'])

    host.level = undefined
    await settleAll(host)
    expect(texts(host)).toHaveLength(3)

    const clear = part(host, 'clear') as Updatable
    expect(clear.localName).toBe('helix-button')
    expect(clear.textContent).toBe('Clear')
    clear.click()
    await settleAll(host)
    expect(output(host).lines).toEqual([])
    expect(part(output(host), 'empty')).not.toBeNull()
  })

  /* Lit's `Object` converter turned JSON that did not parse into `null`, and
     the render read a level off it and threw, so the panel drew nothing. */
  test('words that do not parse keep the English ones, and the console still draws', async () => {
    const host = await opened('controls level-words="oops" spoken-words="oops"')
    expect(part(host, 'output')).not.toBeNull()
    const choices = [...(part(host, 'filter')?.querySelectorAll('option') ?? [])]
    expect(choices.map((choice) => choice.textContent?.trim())).toEqual([
      'All levels',
      'Info and above',
      'Warnings and errors',
      'Errors',
    ])
    host.write({ level: 'warn', text: 'careful' })
    await settleAll(host)
    expect(heard(host)).toEqual(['Warning: careful'])
  })

  test('the filter asks before it changes, and says so after', async () => {
    const host = await opened('controls')
    const events: string[] = []
    host.addEventListener('helix-before-change', (event) => {
      events.push(`before ${(event as CustomEvent<{ value: string }>).detail.value}`)
    })
    host.addEventListener('change', () => events.push(`change ${host.level}`))
    host.addEventListener('input', () => events.push(`input ${host.level}`))
    const filter = part(host, 'filter') as HTMLSelectElement
    /* A select sends a composed `input` before its `change`, which would leave
       the console before it asked and whatever the answer: it stops at the
       select. */
    const choose = (level: string): void => {
      filter.value = level
      filter.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      filter.dispatchEvent(new Event('change', { bubbles: true }))
    }
    choose('error')
    await settle(host)
    expect(events).toEqual(['before error', 'change error'])

    const refuse = (event: Event): void => event.preventDefault()
    host.addEventListener('helix-before-change', refuse)
    choose('log')
    await settle(host)
    expect(host.level).toBe('error')
    expect(filter.value).toBe('error')
    expect(events).toEqual(['before error', 'change error', 'before log'])
  })

  test('`level` hides the quieter lines without the controls', async () => {
    const host = await opened('level="error"')
    host.write({ level: 'warn', text: 'careful' })
    host.write({ level: 'error', text: 'Boom' })
    await settleAll(host)
    expect(texts(host)).toEqual(['Boom'])
  })
})
