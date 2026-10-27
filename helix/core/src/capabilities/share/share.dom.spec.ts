import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { fakeClipboard } from '../clipboard/fake.js'
import { setClipboard } from '../clipboard/index.js'
import { serverClipboard } from '../clipboard/server.js'
import { fakeShare } from './fake.js'
import { setShare, share } from './index.js'
import { serverShare } from './server.js'
import { installWebShare, webShare } from './web.js'

beforeAll(() => {
  registerDom()
})

type Sheet = { canShare?: unknown; share?: unknown }

/** Gives the page a share sheet that runs `opens`, or takes it away, for one test. */
const sheet = (opens: ((data: ShareData) => Promise<void>) | undefined): ShareData[] => {
  const handed: ShareData[] = []
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value:
      opens === undefined
        ? undefined
        : (data: ShareData) => {
            handed.push(data)
            return opens(data)
          },
  })
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined })
  return handed
}

afterEach(() => {
  sheet(undefined)
  setClipboard(serverClipboard)
  setShare(serverShare)
})

describe('webShare', () => {
  test('hands the title, words, and address to the browser’s share sheet', async () => {
    const handed = sheet(() => Promise.resolve())
    expect(
      await webShare.share({ text: 'Notes', title: 'Release', url: 'https://fusion.dev' }),
    ).toBe('shared')
    expect(handed).toEqual([{ text: 'Notes', title: 'Release', url: 'https://fusion.dev' }])
  })

  test('gives dismissed when the reader closes the sheet, and copies nothing', async () => {
    sheet(() => Promise.reject(new DOMException('Share canceled', 'AbortError')))
    const clipboard = fakeClipboard()
    setClipboard(clipboard)
    expect(await webShare.share({ url: 'https://fusion.dev' })).toBe('dismissed')
    expect(clipboard.written).toEqual([])
  })

  test('copies the address where the browser has no share sheet', async () => {
    sheet(undefined)
    const clipboard = fakeClipboard()
    setClipboard(clipboard)
    expect(await webShare.share({ text: 'Notes', url: 'https://example.com/notes' })).toBe('copied')
    expect(await webShare.share({ text: 'Words alone' })).toBe('copied')
    expect(clipboard.written).toEqual(['https://example.com/notes', 'Words alone'])
  })

  test('copies where the sheet refuses the item, and is unavailable where the clipboard refuses too', async () => {
    sheet(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')))
    const clipboard = fakeClipboard()
    setClipboard(clipboard)
    expect(await webShare.share({ url: 'https://fusion.dev' })).toBe('copied')
    clipboard.refuses = true
    expect(await webShare.share({ url: 'https://fusion.dev' })).toBe('unavailable')
    expect(await webShare.share({ title: 'Nothing to copy' })).toBe('unavailable')
  })

  test('is installed where nothing is set, and leaves a fake in place', () => {
    installWebShare()
    expect(share()).toBe(webShare)
    const fake = fakeShare()
    setShare(fake)
    installWebShare()
    expect(share()).toBe(fake)
    expect((navigator as Sheet).share).toBeUndefined()
  })
})
