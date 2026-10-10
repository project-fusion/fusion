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

/** Tree on the words registry: its name and the words a move is said in. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Host = Updatable & Record<string, unknown>

const mounted = async (around: string, extra = ''): Promise<Host> => {
  document.body.innerHTML = `<div ${around}><helix-headless-tree ${extra}><helix-headless-tree-item>Docs</helix-headless-tree-item></helix-headless-tree></div>`
  const host = document.querySelector<Host>('helix-headless-tree') as Host
  await settle(host)
  return host
}

const WORDS = {
  'helix-tree': {
    droppedLabel: 'Abgelegt',
    label: 'Baum',
    movedLabel: '{name} an Position {position} von {count} verschoben',
  },
}

describe('on a page in another language', () => {
  test('names itself in the registered words, and moves in them', async () => {
    registerWords('de', WORDS)
    const host = await mounted('lang="de"')
    expect(part(host, 'tree')?.getAttribute('aria-label')).toBe('Baum')
    expect(host.droppedLabel).toBe('Abgelegt')
    expect(part(await mounted(''), 'tree')?.getAttribute('aria-label')).toBe('Tree')
  })
})
