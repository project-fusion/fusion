import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { webAnnounce } from './web.js'

beforeAll(() => {
  registerDom()
})

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const region = (urgency: string): HTMLElement | null =>
  document.querySelector(`[data-helix-announce="${urgency}"]`)

describe('webAnnounce', () => {
  test('says a message through a live region of its urgency, a frame later', async () => {
    webAnnounce.say('Saved', 'polite')
    const live = region('polite')
    expect(live?.getAttribute('aria-live')).toBe('polite')
    expect(live?.textContent).toBe('')
    await frame()
    expect(live?.textContent).toBe('Saved')
  })

  test('keeps one region per urgency', async () => {
    webAnnounce.say('Picked up', 'assertive')
    webAnnounce.say('Moved', 'assertive')
    await frame()
    expect(document.querySelectorAll('[data-helix-announce="assertive"]')).toHaveLength(1)
    expect(region('assertive')?.textContent).toBe('Moved')
  })

  test('empties the region first, so the same message twice is a change both times', async () => {
    webAnnounce.say('Dropped', 'polite')
    await frame()
    webAnnounce.say('Dropped', 'polite')
    expect(region('polite')?.textContent).toBe('')
    await frame()
    expect(region('polite')?.textContent).toBe('Dropped')
  })

  test('makes the region again where the page removed it', async () => {
    region('polite')?.remove()
    webAnnounce.say('Back', 'polite')
    await frame()
    expect(region('polite')?.textContent).toBe('Back')
  })
})
