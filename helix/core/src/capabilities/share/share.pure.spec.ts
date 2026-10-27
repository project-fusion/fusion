import { afterEach, describe, expect, test } from 'bun:test'
import { fakeShare } from './fake.js'
import { setShare, share } from './index.js'
import { serverShare } from './server.js'

afterEach(() => {
  setShare(serverShare)
})

describe('share', () => {
  test('is the server implementation until one is set', () => {
    expect(share()).toBe(serverShare)
  })

  test('shares nothing on the server', async () => {
    expect(await serverShare.share({ url: 'https://fusion.dev' })).toBe('unavailable')
  })

  test('calls the implementation set last, and the fake keeps each item and gives its answer', async () => {
    const fake = fakeShare()
    setShare(fake)
    expect(await share().share({ title: 'Release notes', url: 'https://example.com/notes' })).toBe(
      'shared',
    )
    fake.answer = 'dismissed'
    expect(await share().share({ text: 'Closed' })).toBe('dismissed')
    expect(fake.shared).toEqual([
      { title: 'Release notes', url: 'https://example.com/notes' },
      { text: 'Closed' },
    ])
  })
})
