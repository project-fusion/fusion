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
 * The specs runner on the words registry: what it shows before, during and
 * after a run is registered for the page's language, and its counts take
 * plural forms.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('./sandbox-specs.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Runner = Updatable & {
  results: { name: string; passed: boolean; suite: string[] }[]
  elapsed: number
}

const runner = async (around = ''): Promise<Runner> => {
  document.body.innerHTML = `<div ${around}><helix-sandbox-specs></helix-sandbox-specs></div>`
  const host = document.querySelector('helix-sandbox-specs') as Runner
  await settle(host)
  return host
}

const finished = async (host: Runner, passed: number, failed: number): Promise<string> => {
  host.results = [
    ...Array.from({ length: passed }, (_, at) => ({ name: `p${at}`, passed: true, suite: [] })),
    ...Array.from({ length: failed }, (_, at) => ({ name: `f${at}`, passed: false, suite: [] })),
  ]
  host.elapsed = 1234.4
  await settle(host)
  return part(host, 'summary')?.textContent?.trim() ?? ''
}

describe('sandbox specs words', () => {
  test('before a run it shows the words registered for the nearest lang', async () => {
    registerWords('de', { 'helix-sandbox-specs': { emptyText: 'Noch nichts gelaufen.' } })
    expect(part(await runner('lang="de"'), 'empty')?.textContent).toBe('Noch nichts gelaufen.')
  })

  test('the summary is one message, its numbers in the locale', async () => {
    expect(await finished(await runner(), 3, 0)).toBe('3 passed in 1,234ms')
    expect(await finished(await runner(), 3, 1)).toBe('3 passed, 1 failed in 1,234ms')
    registerWords('de', {
      'helix-sandbox-specs': {
        summaryLabel:
          '{failed, plural, =0 {{passed} bestanden in {time} ms} other {{passed} bestanden, {failed} fehlgeschlagen in {time} ms}}',
      },
    })
    expect(await finished(await runner('lang="de"'), 3, 1)).toBe(
      '3 bestanden, 1 fehlgeschlagen in 1.234 ms',
    )
  })
})
