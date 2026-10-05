import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { hideOutside } from './hide-outside.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  document.body.replaceChildren()
})

describe('hiding the page outside an element', () => {
  test('hides every sibling on the way up, and gives each back', () => {
    document.body.innerHTML = `
      <header id="header">Header</header>
      <main id="main"><p id="near">Near</p><div id="host">Kept</div></main>
      <footer id="footer">Footer</footer>`
    const show = hideOutside([document.getElementById('host') as Element])
    const hidden = (id: string): string | null =>
      document.getElementById(id)?.getAttribute('aria-hidden') ?? null
    expect([hidden('header'), hidden('near'), hidden('footer')]).toEqual(['true', 'true', 'true'])
    expect([hidden('main'), hidden('host')]).toEqual([null, null])
    show()
    expect([hidden('header'), hidden('near'), hidden('footer')]).toEqual([null, null, null])
  })

  test('leaves what already says aria-hidden as it was, and live regions shown', () => {
    document.body.innerHTML = `
      <div id="quiet" aria-hidden="false">Quiet</div>
      <div id="live" aria-live="polite"></div>
      <div id="host">Kept</div>`
    const show = hideOutside([document.getElementById('host') as Element])
    expect(document.getElementById('quiet')?.getAttribute('aria-hidden')).toBe('false')
    expect(document.getElementById('live')?.hasAttribute('aria-hidden')).toBe(false)
    show()
    expect(document.getElementById('quiet')?.getAttribute('aria-hidden')).toBe('false')
  })

  test('climbs out of a shadow root to the page around its host', () => {
    document.body.innerHTML = '<div id="outer"></div><p id="beside">Beside</p>'
    const outer = document.getElementById('outer') as HTMLElement
    const root = outer.attachShadow({ mode: 'open' })
    root.innerHTML = '<span id="inside-sibling">Sibling</span><span id="kept">Kept</span>'
    const show = hideOutside([root.getElementById('kept') as Element])
    expect(root.getElementById('inside-sibling')?.getAttribute('aria-hidden')).toBe('true')
    expect(document.getElementById('beside')?.getAttribute('aria-hidden')).toBe('true')
    expect(outer.hasAttribute('aria-hidden')).toBe(false)
    show()
    expect(document.getElementById('beside')?.hasAttribute('aria-hidden')).toBe(false)
  })
})
