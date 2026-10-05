import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let awaitRegion: typeof import('./busy.js').awaitRegion
let claimBusy: typeof import('./busy.js').claimBusy
let releaseBusy: typeof import('./busy.js').releaseBusy

beforeAll(async () => {
  registerDom()
  ;({ awaitRegion, claimBusy, releaseBusy } = await import('./busy.js'))
})

describe('a busy region', () => {
  test('is busy from the first claim to the last release', () => {
    const region = document.createElement('section')
    claimBusy(region)
    claimBusy(region)
    expect(region.getAttribute('aria-busy')).toBe('true')
    releaseBusy(region)
    expect(region.getAttribute('aria-busy')).toBe('true')
    releaseBusy(region)
    expect(region.hasAttribute('aria-busy')).toBe(false)
  })

  /* A region the page marked busy itself is the page's to clear. */
  test('keeps a busy state the page set itself', () => {
    const region = document.createElement('section')
    region.setAttribute('aria-busy', 'true')
    claimBusy(region)
    releaseBusy(region)
    expect(region.getAttribute('aria-busy')).toBe('true')
  })

  test('takes back nothing that was never claimed', () => {
    const region = document.createElement('section')
    region.setAttribute('aria-busy', 'false')
    releaseBusy(region)
    expect(region.getAttribute('aria-busy')).toBe('false')
  })
})

describe('a region awaited', () => {
  const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

  test('is handed over once it is drawn, and only once', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    const found: Element[] = []
    awaitRegion(
      root,
      () => root.querySelector('#late'),
      (region) => found.push(region),
    )
    const region = document.createElement('section')
    region.id = 'late'
    root.append(region)
    await settle()
    root.append(document.createElement('p'))
    await settle()
    expect(found.length).toBe(1)
    expect(found[0]).toBe(region)
    root.remove()
  })

  test('is not handed over after the wait is stopped', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    const found: Element[] = []
    const stop = awaitRegion(
      root,
      () => root.querySelector('#late'),
      (region) => found.push(region),
    )
    stop()
    const region = document.createElement('section')
    region.id = 'late'
    root.append(region)
    await settle()
    expect(found.length).toBe(0)
    root.remove()
  })
})
