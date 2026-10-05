import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('app header', () => {
  test('is a banner holding three regions, named for where they are', async () => {
    const header = await mount(`
      <helix-headless-app-header>
        <span slot="start">Fusion</span>
        <helix-headless-navigation><a href="/work">Work</a></helix-headless-navigation>
        <helix-headless-button slot="end">Contact</helix-headless-button>
      </helix-headless-app-header>
    `)
    // On the host, since the host is the banner: it carries the material and
    // spans the window, and `row` carries the measure.
    expect(role(header)).toBe('banner')
    expect(part(header, 'start')).not.toBeNull()
    expect(part(header, 'content')).not.toBeNull()
    expect(part(header, 'end')).not.toBeNull()
  })

  test('renders no landmark of its own, because a header is not navigation', async () => {
    // The `<nav>` belongs to `Navigation`, which is what usually goes in the middle
    // but is not what a header inherently is.
    const header = await mount('<helix-headless-app-header></helix-headless-app-header>')
    expect(header.shadowRoot?.querySelector('nav')).toBeNull()
  })

  /* **Asserted through the event and the attribute list, never `:state()`.**
     happy-dom implements neither `ElementInternals.states` nor the selector, so
     `matches(':state(scrolled)')` is false in every case: a `toBe(false)` there
     passes on a component that has stopped working, and a `toBe(true)` cannot
     pass at all. The event is the observable half by design, and it is the half
     a consumer uses. */
  test('starts un-scrolled, matching what the server rendered', async () => {
    const header = await mount('<helix-headless-app-header></helix-headless-app-header>')
    expect(header.getAttributeNames()).not.toContain('data-scrolled')
  })

  // The whole reason this is a state and not `data-scrolled`: an attribute the
  // element writes onto itself is markup the server never sent, and a framework
  // hydrating the page reports the tree as mismatched.
  test('writes no attribute a hydrating framework could disagree with', async () => {
    const header = await mount('<helix-headless-app-header></helix-headless-app-header>')
    const seen: boolean[] = []
    header.addEventListener('helix-scrolled', (event) => {
      seen.push((event as CustomEvent<{ scrolled: boolean }>).detail.scrolled)
    })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))
    expect(seen).toEqual([true])
    expect(header.getAttributeNames()).not.toContain('data-scrolled')
  })

  test('announces the change, since a custom state cannot be observed', async () => {
    /* Reset before mounting: `scrollY` is stubbed on the shared `window` and
       survives the test that stubbed it, so a header connecting after one of
       those reads the page as already scrolled and the first crossing never
       happens. */
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    const header = await mount('<helix-headless-app-header></helix-headless-app-header>')
    const heard: boolean[] = []
    header.addEventListener('helix-scrolled', (event) => {
      heard.push((event as CustomEvent<{ scrolled: boolean }>).detail.scrolled)
    })

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    window.dispatchEvent(new Event('scroll'))

    expect(heard).toEqual([true, false])
  })

  // Only on a crossing. The handler returns early when the threshold has not
  // moved, so a listener is not woken on every frame of a scroll.
  test('says nothing while the threshold holds', async () => {
    const header = await mount('<helix-headless-app-header></helix-headless-app-header>')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))

    let after = 0
    header.addEventListener('helix-scrolled', () => {
      after += 1
    })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 900 })
    window.dispatchEvent(new Event('scroll'))
    expect(after).toBe(0)
  })

  test('reflects scroll position so styling needs no handler of its own', async () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    const header = await mount('<helix-headless-app-header></helix-headless-app-header>')
    const seen: boolean[] = []
    header.addEventListener('helix-scrolled', (event) => {
      seen.push((event as CustomEvent<{ scrolled: boolean }>).detail.scrolled)
    })

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    window.dispatchEvent(new Event('scroll'))

    expect(seen).toEqual([true, false])
  })

  test('stops listening once removed', async () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    const header = await mount('<helix-headless-app-header></helix-headless-app-header>')
    const seen: boolean[] = []
    header.addEventListener('helix-scrolled', () => seen.push(true))
    header.remove()
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))
    expect(seen).toEqual([])
  })
})

describe('an app header over a scrolling container', () => {
  test('lifts when the element named by scroller scrolls, and ignores the window', async () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    const shell = await mount(
      '<div><helix-headless-app-header scroller="content"></helix-headless-app-header><main id="content"></main></div>',
    )
    const header = shell.querySelector('helix-headless-app-header') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await header.updateComplete
    const heard: boolean[] = []
    header.addEventListener('helix-scrolled', (event) => {
      heard.push((event as CustomEvent<{ scrolled: boolean }>).detail.scrolled)
    })
    const content = shell.querySelector('#content') as HTMLElement
    Object.defineProperty(content, 'scrollTop', { configurable: true, value: 240 })
    content.dispatchEvent(new Event('scroll'))
    expect(heard).toEqual([true])
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    window.dispatchEvent(new Event('scroll'))
    expect(heard).toEqual([true])
  })
})

describe('an app header inside sectioning content', () => {
  /* A native <header> is a banner only at the top of the page. One in a card,
     a pane or an article is a plain box, and a second banner there sent screen
     reader users to the wrong place from the landmarks list. */
  test('is no banner inside main, and is one again when moved to the top', async () => {
    await mount('<main><helix-headless-app-header></helix-headless-app-header></main>')
    const header = document.querySelector('helix-headless-app-header') as HTMLElement
    expect(role(header)).toBeNull()
    document.body.append(header)
    expect(role(header)).toBe('banner')
  })
})
