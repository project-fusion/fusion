import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Number Input on the words registry: its button names and the sentences its
 * bubble raises come from `registerWords` for the page's language, and the
 * numbers in them are written in that language.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const field = async (around: string, attrs: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-number-input label="L" ${attrs}></helix-headless-number-input></div>`
  const host = document.querySelector('helix-headless-number-input') as Updatable
  await settle(host)
  return host
}

const bubble = (host: HTMLElement): string =>
  (host as unknown as { internals: ElementInternals }).internals.validationMessage

describe('a number input on a page in another language', () => {
  test('names its steppers and raises its sentences in the registered words', async () => {
    registerWords('pl', {
      'helix-number-input': {
        incrementLabel: 'Zwiększ',
        rangeUnderflowMessage: 'Wartość musi wynosić co najmniej {min}.',
      },
    })
    const host = await field('lang="pl"', 'default-value="1" min="2.5"')
    expect(part(host, 'increment')?.getAttribute('aria-label')).toBe('Zwiększ')
    /* The bound in Polish digits: before, `{min}` was the number as script writes it. */
    expect(bubble(host)).toBe('Wartość musi wynosić co najmniej 2,5.')
  })

  test('writes a bound in English as it always did, every digit and no grouping', async () => {
    expect(bubble(await field('', 'default-value="1" min="1000.125"'))).toBe(
      'Value must be 1000.125 or more.',
    )
    expect(bubble(await field('', 'default-value="9" max="3"'))).toBe('Value must be 3 or less.')
    expect(bubble(await field('', 'value="1.5" step="1"'))).toBe(
      'Please enter a valid value. The two nearest valid values are 1 and 2.',
    )
    expect(bubble(await field('', 'value="abc"'))).toBe('Please enter a number.')
  })

  test('raises its own sentence where the page sets an empty one', async () => {
    /* A template rendering an empty variable: an empty sentence would make
       the browser refuse the check, so the field says its built-in one. */
    expect(bubble(await field('', 'default-value="9" max="3" range-overflow-message=""'))).toBe(
      'Value must be 3 or less.',
    )
  })
})
