import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let claimBusy: typeof import('./busy.js').claimBusy
let releaseBusy: typeof import('./busy.js').releaseBusy

beforeAll(async () => {
  registerDom()
  ;({ claimBusy, releaseBusy } = await import('./busy.js'))
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
