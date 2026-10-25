import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { webOpenLink } from './web.js'

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

/** The `href` of every anchor clicked, caught on the way down and kept from navigating. */
const followed = (): string[] => {
  const heard: string[] = []
  const catcher = (event: Event): void => {
    if (event.target instanceof HTMLAnchorElement) {
      heard.push(event.target.getAttribute('href') ?? '')
      event.preventDefault()
    }
  }
  catchers.push(catcher)
  document.addEventListener('click', catcher, { capture: true })
  return heard
}

describe('webOpenLink', () => {
  test('clicks a link to the destination, a URL or a path', () => {
    const heard = followed()
    webOpenLink.open('https://example.com/help')
    webOpenLink.open('/orders/42')
    expect(heard).toEqual(['https://example.com/help', '/orders/42'])
  })

  test('leaves nothing behind in the document', () => {
    followed()
    webOpenLink.open('/inbox')
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })
})
