import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import {
  label,
  nextFrame,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * Steps on the words registry: the sequence's name and its progress under
 * `helix-steps`, a stage's words under `helix-step`, with the percentage
 * written as the language writes one and a finished stage said in one
 * sentence a language can order.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Step = Updatable & { complete: boolean }

const steps = async (around: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-steps>
    <helix-headless-step complete>Details</helix-headless-step>
    <helix-headless-step current>Payment</helix-headless-step>
    <helix-headless-step>Review</helix-headless-step>
  </helix-headless-steps></div>`
  const host = document.querySelector('helix-headless-steps') as Updatable
  await settle(host)
  for (const step of host.querySelectorAll('helix-headless-step')) {
    await settle(step as Updatable)
  }
  return host
}

const FRENCH = {
  'helix-step': { completedLabel: 'Étape {name} terminée', completeLabel: 'Terminée' },
  'helix-steps': { label: 'Étapes', progressLabel: '{share, number, percent} terminé' },
}

describe('steps on a page in another language', () => {
  test('name the sequence and say its progress in the registered words', async () => {
    registerWords('fr', FRENCH)
    const host = await steps('lang="fr"')
    expect(label(host)).toBe('Étapes')
    /* French puts a space before the sign, a narrow one in some runtimes. */
    const share = new Intl.NumberFormat('fr', { style: 'percent' }).format(0.33)
    expect(share).not.toBe('33%')
    expect(part(host, 'progress')?.getAttribute('aria-valuetext')).toBe(`${share} terminé`)
  })

  test('say a finished stage in one registered sentence', async () => {
    registerWords('fr', FRENCH)
    const host = await steps('lang="fr"')
    const [done, , review] = [...host.querySelectorAll('helix-headless-step')] as Step[]
    expect(part(done as Step, 'state')?.textContent).toBe('Terminée')
    ;(review as Step).complete = true
    await settle(review as Step)
    await nextFrame()
    await settle(review as Step)
    expect(part(review as Step, 'live')?.textContent).toBe('Étape Review terminée')
  })

  test('keep the English, and the sign where English puts it, where nothing is registered', async () => {
    const host = await steps('')
    expect(part(host, 'progress')?.getAttribute('aria-valuetext')).toBe('33% complete')
  })
})
