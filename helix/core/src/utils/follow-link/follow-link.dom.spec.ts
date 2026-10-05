import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { followLink } from './follow-link.js'

beforeAll(() => {
  registerDom()
})

/* Each catcher comes off the document after its test: left on, it would cancel
   every link click in the files after this one. */
const catchers: ((event: Event) => void)[] = []
afterEach(() => {
  for (const catcher of catchers.splice(0)) {
    document.removeEventListener('click', catcher, { capture: true })
  }
})

/** Every click an anchor hears, caught on the way down and kept from navigating. */
const clicks = (): { anchor: HTMLAnchorElement; event: MouseEvent }[] => {
  const heard: { anchor: HTMLAnchorElement; event: MouseEvent }[] = []
  const catcher = (event: Event): void => {
    if (event.target instanceof HTMLAnchorElement) {
      heard.push({ anchor: event.target, event: event as MouseEvent })
      event.preventDefault()
    }
  }
  catchers.push(catcher)
  document.addEventListener('click', catcher, { capture: true })
  return heard
}

describe('following a link from something that is not one', () => {
  test('clicks an anchor that names the link, its target and its rel', () => {
    const heard = clicks()
    followLink(document, { href: 'https://example.com/a', rel: 'noopener', target: '_blank' })
    expect(heard).toHaveLength(1)
    const { anchor, event } = heard[0] as { anchor: HTMLAnchorElement; event: MouseEvent }
    expect(anchor.getAttribute('href')).toBe('https://example.com/a')
    expect(anchor.target).toBe('_blank')
    expect(anchor.rel).toBe('noopener')
    expect(anchor.hasAttribute('download')).toBe(false)
    expect(event.bubbles).toBe(false)
  })

  test('carries the keys held, which say where the browser opens it', () => {
    const heard = clicks()
    followLink(document, { download: true, href: '/report.csv' }, { metaKey: true, shiftKey: true })
    const { anchor, event } = heard.at(-1) as { anchor: HTMLAnchorElement; event: MouseEvent }
    expect(event.metaKey).toBe(true)
    expect(event.shiftKey).toBe(true)
    expect(event.ctrlKey).toBe(false)
    expect(anchor.hasAttribute('download')).toBe(true)
  })

  test('leaves nothing behind in the document', () => {
    clicks()
    followLink(document, { href: '/b' })
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })
})
