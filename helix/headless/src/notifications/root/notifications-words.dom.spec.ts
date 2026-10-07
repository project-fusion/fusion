import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { label, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Notifications on the words registry: the feed's controls and the name it
 * falls back to under `helix-notifications`, a row's mark under
 * `helix-notification`.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const feed = async (around: string, extra = ''): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-notifications mark-all load-more ${extra}>
    <helix-headless-notification>One</helix-headless-notification>
  </helix-headless-notifications></div>`
  const host = document.querySelector('helix-headless-notifications') as Updatable
  await settle(host)
  await settle(host.querySelector('helix-headless-notification') as Updatable)
  return host
}

const GERMAN = {
  'helix-notification': { unreadLabel: 'Ungelesen' },
  'helix-notifications': {
    fallbackLabel: 'Benachrichtigungen',
    loadMoreLabel: 'Mehr laden',
    markAllLabel: 'Alle als gelesen markieren',
  },
}

describe('a feed on a page in another language', () => {
  test('names itself and draws its controls in the registered words', async () => {
    registerWords('de', GERMAN)
    const host = await feed('lang="de"')
    expect(label(host)).toBe('Benachrichtigungen')
    expect(part(host, 'mark-all')?.textContent?.trim()).toBe('Alle als gelesen markieren')
    expect(part(host, 'more')?.textContent?.trim()).toBe('Mehr laden')
    const row = host.querySelector('helix-headless-notification') as HTMLElement
    expect(row.shadowRoot?.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Ungelesen',
    )
  })

  test('takes a page’s own name over the registry, and says Notifications in English', async () => {
    registerWords('de', GERMAN)
    expect(label(await feed('lang="de"', 'label="Aktivität"'))).toBe('Aktivität')
    expect(label(await feed(''))).toBe('Notifications')
  })
})
