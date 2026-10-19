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
 * Button and Icon Button on the words registry: each family reads its own
 * key, so a word registered for one does not reach the other.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
  await import('../../icon-button/index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Pending = Updatable & { pendingLabel: string }

const mounted = async (markup: string, tag: string): Promise<Pending> => {
  document.body.innerHTML = `<div lang="pl">${markup}</div>`
  const host = document.querySelector(tag) as Pending
  await settle(host)
  return host
}

describe('a button on a page in another language', () => {
  test('says the pending words registered for its own family', async () => {
    registerWords('pl', {
      'helix-button': { pendingLabel: 'Ładowanie' },
      'helix-icon-button': { pendingLabel: 'Czekaj' },
    })
    const button = await mounted(
      '<helix-headless-button>Zapisz</helix-headless-button>',
      'helix-headless-button',
    )
    const icon = await mounted(
      '<helix-headless-icon-button label="Zapisz"></helix-headless-icon-button>',
      'helix-headless-icon-button',
    )
    expect(button.pendingLabel).toBe('Ładowanie')
    expect(icon.pendingLabel).toBe('Czekaj')
  })

  test('says it while it waits with focus', async () => {
    registerWords('pl', { 'helix-button': { pendingLabel: 'Ładowanie' } })
    const button = await mounted(
      '<helix-headless-button>Zapisz</helix-headless-button>',
      'helix-headless-button',
    )
    ;(part(button, 'button') as HTMLButtonElement).focus()
    ;(button as unknown as { pending: boolean }).pending = true
    await settle(button)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await settle(button)
    expect(part(button, 'live')?.textContent?.trim()).toBe('Ładowanie')
  })
})
