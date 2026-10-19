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

/** QR Code on the words registry: its name is one sentence a page registers for its language. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const code = async (around: string, value: string): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-qr-code value="${value}"></helix-headless-qr-code></div>`
  const host = document.querySelector('helix-headless-qr-code') as Updatable
  await settle(host)
  return host
}

describe('qr code words', () => {
  test('the name is the sentence registered for the nearest lang', async () => {
    registerWords('de', {
      'helix-qr-code': { addressLabel: '{code} für {address}', codeLabel: 'QR-Code' },
    })
    expect(
      part(await code('lang="de"', 'https://fusion.dev'), 'code')?.getAttribute('aria-label'),
    ).toBe('QR-Code für https://fusion.dev')
    expect(part(await code('lang="de"', 'WIFI:S:Büro;;'), 'code')?.getAttribute('aria-label')).toBe(
      'QR-Code',
    )
  })
})
