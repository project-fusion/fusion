import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * List on the words registry: its grips and the steps of a move speak the
 * words registered for the page's language.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }
type List = Updatable & { rows: Updatable[] }

const settle = async (list: List): Promise<void> => {
  for (let round = 0; round < 3; round += 1) {
    await list.updateComplete
    await Promise.all(list.rows.map((row) => row.updateComplete))
  }
}

/** A reorderable list in a container whose attributes set the page's language. */
const list = async (around = ''): Promise<List> => {
  document.body.innerHTML = `<div ${around}><helix-headless-list label="Files" reorderable>
    <helix-headless-list-item value="a">Alpha</helix-headless-list-item>
    <helix-headless-list-item value="b">Beta</helix-headless-list-item>
  </helix-headless-list></div>`
  const host = document.querySelector('helix-headless-list') as List
  await settle(host)
  return host
}

const grip = (row: Updatable | undefined): HTMLElement =>
  part(row as HTMLElement, 'grip') as HTMLElement

const GERMAN = {
  'helix-list': { moveLabel: '{name} verschieben', pickedUpLabel: '{name} aufgenommen' },
}

describe('a list on a page in another language', () => {
  test('names its grips with the words registered for the nearest `lang`', async () => {
    registerWords('de', GERMAN)
    const host = await list('lang="de"')
    expect(grip(host.rows[0]).getAttribute('aria-label')).toBe('Alpha verschieben')
  })

  test('says the steps of a move in them', async () => {
    registerWords('de', GERMAN)
    const host = await list('lang="de"')
    grip(host.rows[0]).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
    )
    await settle(host)
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toBe('Alpha aufgenommen')
  })

  test('updates once words are registered after it rendered', async () => {
    const host = await list('lang="de"')
    expect(grip(host.rows[0]).getAttribute('aria-label')).toBe('Move Alpha')
    registerWords('de', GERMAN)
    await Promise.resolve()
    await settle(host)
    expect(grip(host.rows[0]).getAttribute('aria-label')).toBe('Alpha verschieben')
  })
})
