import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * The sandbox's parts on the words registry: the console's words, the count
 * of a repeated line, which its log says in plural forms, and the divider's
 * name for the lead pane.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Console = Updatable & {
  write: (detail: { level: 'log' | 'info' | 'warn' | 'error'; text: string }) => void
}

const opened = async (around: string): Promise<Console> => {
  document.body.innerHTML = `<div ${around}><helix-sandbox-console controls></helix-sandbox-console></div>`
  const host = document.querySelector('helix-sandbox-console') as Console
  await settle(host)
  return host
}

/** The first line the console's log drew, once it and the log have settled. */
const firstLine = async (host: Console): Promise<Updatable> => {
  await settle(host)
  const log = part(host, 'output') as Updatable
  await settle(log)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await settle(log)
  const line = log.shadowRoot?.querySelector('[part="row"]')?.firstElementChild as Updatable
  await settle(line)
  return line
}

const POLISH = {
  'helix-log': {
    timesLabel: '{count, plural, one {# raz} few {# razy} many {# razy} other {# razy}}',
  },
  'helix-sandbox-console': {
    clearLabel: 'Wyczyść',
    levelWords: { error: 'Błędy' },
    spokenWords: { warn: 'Ostrzeżenie:' },
  },
}

describe('sandbox words', () => {
  test('the console’s words are the ones registered for the nearest lang', async () => {
    registerWords('pl', POLISH)
    const host = await opened('lang="pl"')
    expect(part(host, 'clear')?.textContent).toBe('Wyczyść')
    const options = [...(host.shadowRoot?.querySelectorAll('option') ?? [])].map((one) =>
      one.textContent?.trim(),
    )
    expect(options).toEqual(['All levels', 'Info and above', 'Warnings and errors', 'Błędy'])
    host.write({ level: 'warn', text: 'uwaga' })
    await settle(host)
    expect(part(host, 'live')?.textContent?.trim()).toBe('Ostrzeżenie: uwaga')
  })

  test('a repeated line’s count is a plural message, in the log’s words', async () => {
    registerWords('pl', POLISH)
    const host = await opened('lang="pl"')
    for (let step = 0; step < 3; step++) {
      host.write({ level: 'log', text: 'same' })
    }
    expect(part(await firstLine(host), 'count-label')?.textContent?.trim()).toBe('3 razy')
    const english = await opened('')
    english.write({ level: 'log', text: 'same' })
    english.write({ level: 'log', text: 'same' })
    expect(part(await firstLine(english), 'count-label')?.textContent?.trim()).toBe('2 times')
  })

  test('the divider between the panes is named for the lead pane in the registered words', async () => {
    registerWords('pl', {
      'helix-sandbox': {
        separatorLabel:
          '{pane, select, preview {Zmień rozmiar podglądu} other {Zmień rozmiar kodu}}',
      },
    })
    document.body.innerHTML = '<div lang="pl"><helix-sandbox lead="preview"></helix-sandbox></div>'
    const sandbox = document.querySelector('helix-sandbox') as Updatable
    await settle(sandbox)
    expect(part(sandbox, 'panes')?.getAttribute('label')).toBe('Zmień rozmiar podglądu')
  })

  test('the status bar says where the cursor is in the registered words, its numbers ungrouped', async () => {
    registerWords('de', {
      'helix-sandbox-status-bar': { positionLabel: 'Z. {line}, Sp. {column}' },
    })
    document.body.innerHTML =
      '<div lang="de"><helix-sandbox-status-bar line="1204" column="7"></helix-sandbox-status-bar></div>'
    const bar = document.querySelector('helix-sandbox-status-bar') as Updatable
    await settle(bar)
    expect(part(bar, 'caret')?.textContent).toBe('Z. 1204, Sp. 7')
  })
})
