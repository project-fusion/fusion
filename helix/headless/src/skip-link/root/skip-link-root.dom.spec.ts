import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom focuses any element it is asked to, `<main>` included,
   so a target that needs a `tabindex` to take focus cannot be built there. */
const browser = hasLayout() ? test : (): void => {}

type Skip = HTMLElement & { updateComplete: Promise<unknown> }

/** A page with the link first and its target after, the order it is used in. */
const page = async (attrs = '', target = '<main id="main">Content</main>'): Promise<Skip> => {
  await mount(`<helix-headless-skip-link ${attrs}></helix-headless-skip-link>
    <header><a href="#one">One</a><a href="#two">Two</a></header>
    ${target}`)
  const host = document.querySelector('helix-headless-skip-link') as Skip
  await host.updateComplete
  return host
}

/**
 * Presses the anchor, and says whether the browser was left to follow it.
 *
 * Read from the window, after the link has had its turn, and then refused
 * there: a press left to a real browser on `/elsewhere` navigates the spec
 * runner away and takes every later test with it.
 */
const press = (host: Skip, init: MouseEventInit = {}): boolean => {
  const link = part(host, 'link') as HTMLAnchorElement
  let left = false
  const hold = (event: Event): void => {
    left = !event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener('click', hold, { once: true })
  link.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      composed: true,
      ...init,
    }),
  )
  return left
}

afterEach(() => {
  ;(document.activeElement as HTMLElement | null)?.blur?.()
})

describe('a skip link', () => {
  test('is an anchor to the content, named in words a reader recognizes', async () => {
    const host = await page()
    const link = part(host, 'link') as HTMLAnchorElement
    expect(link.localName).toBe('a')
    expect(link.getAttribute('href')).toBe('#main')
    expect(link.querySelector('slot')?.textContent).toBe('Skip to content')
  })

  test('moves focus to the target rather than only scrolling to it', async () => {
    /* An in-page link on its own leaves focus behind, so the next Tab goes to
       the header it was meant to skip. */
    const host = await page()
    const followed = press(host)
    expect(followed).toBe(false)
    expect(document.activeElement?.id).toBe('main')
  })

  browser(
    'lends a target that cannot take focus a tabindex, for as long as it holds it',
    async () => {
      const host = await page()
      const main = document.getElementById('main') as HTMLElement
      press(host)
      expect(main.getAttribute('tabindex')).toBe('-1')
      main.blur()
      expect(main.hasAttribute('tabindex')).toBe(false)
    },
  )

  test('gives a target that can already take focus nothing it did not have', async () => {
    const host = await page(
      'href="#results"',
      '<h2 id="results" tabindex="0">Results</h2><main id="main">Content</main>',
    )
    press(host)
    const heading = document.getElementById('results') as HTMLElement
    expect(document.activeElement).toBe(heading)
    expect(heading.getAttribute('tabindex')).toBe('0')
  })

  test('leaves a modified press to the browser', async () => {
    const host = await page()
    expect(press(host, { metaKey: true })).toBe(true)
    expect(document.getElementById('main')?.hasAttribute('tabindex')).toBe(false)
  })

  test('leaves a link to nothing on the page to the browser', async () => {
    expect(press(await page('href="#nowhere"'))).toBe(true)
    expect(press(await page('href="/elsewhere"'))).toBe(true)
  })

  /* A target id that matches nothing was silent, and the link did nothing a
     keyboard reader could notice. A link to another page is the browser's. */
  test('warns once when its in-page target is missing', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      const missing = await page('href="#nowhere"')
      press(missing)
      press(missing)
      press(await page('href="/elsewhere"'))
      press(await page())
    } finally {
      console.warn = original
    }
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('#nowhere')
  })
})
