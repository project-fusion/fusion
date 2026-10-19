import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/** Color Input on the words registry: the swatch's sentence is one message. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const swatch = async (around: string): Promise<string | null | undefined> => {
  document.body.innerHTML = `<div ${around}><helix-headless-color-input label="Brand" variant="swatch" default-value="#ff0000"></helix-headless-color-input></div>`
  const host = document.querySelector('helix-headless-color-input') as Updatable
  await settle(host)
  return host.shadowRoot?.querySelector('#swatch-value')?.textContent
}

describe('the swatch of a color input', () => {
  test('says the color and then the value, in English', async () => {
    expect(await swatch('')).toBe('vibrant red #ff0000')
  })

  test('says them in the order the registered sentence puts them', async () => {
    registerWords('pl', {
      'helix-color-input': { swatchLabel: '{value} ({name})', triggerLabel: 'Wybierz kolor' },
    })
    expect(await swatch('lang="pl"')).toBe('#ff0000 (vibrant red)')
  })
})
