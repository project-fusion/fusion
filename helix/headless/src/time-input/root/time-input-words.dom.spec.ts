import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Time Input on the words registry: its trigger and its sentences. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const field = async (around: string, attrs = ''): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-time-input label="Godzina" ${attrs}></helix-headless-time-input></div>`
  const host = document.querySelector('helix-headless-time-input') as Updatable
  await settle(host)
  return host
}

const bubble = (host: HTMLElement): string =>
  (host as unknown as { internals: ElementInternals }).internals.validationMessage

describe('a time input on a page in another language', () => {
  test('names its trigger and raises its sentences in the registered words', async () => {
    registerWords('pl', {
      'helix-time-input': {
        rangeUnderflowMessage: 'Wybierz godzinę od {min}.',
        triggerLabel: 'Wybierz godzinę',
      },
    })
    const host = await field('lang="pl"', 'min="09:00" value="08:00"')
    expect(part(host, 'trigger')?.getAttribute('aria-label')).toBe('Wybierz godzinę')
    expect(bubble(host)).toBe('Wybierz godzinę od 09:00.')
  })

  test('raises the English it always raised', async () => {
    expect(bubble(await field('', 'min="09:00" value="08:00" hour-cycle="h23"'))).toBe(
      'Choose a time at or after 09:00.',
    )
  })
})
