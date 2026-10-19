import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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

describe('a header that folds', () => {
  type Folding = HTMLElement & {
    fold(width: number): void
    updateComplete: Promise<unknown>
  }
  const folding = async (): Promise<Folding> => {
    const header = (await mount(`
      <helix-headless-app-header fold-below="640" menu-label="Site menu">
        <span slot="start">Fusion</span>
        <a href="/work">Work</a>
      </helix-headless-app-header>
    `)) as Folding
    /* What the width watch reports for a 400 pixel bar. */
    header.fold(400)
    await header.updateComplete
    return header
  }

  /* The fold reads the bar's width, and an inline host has none, so a bar
     with no stylesheet from the page never folded. */
  test('is a block in this tier, so the width it folds on is there to read', async () => {
    const header = await folding()
    if (hasLayout()) {
      expect(getComputedStyle(header).display).toBe('block')
      return
    }
    /* happy-dom resolves no cascade, so the rule the element adopts is read. */
    const declared = (
      customElements.get('helix-headless-app-header') as unknown as {
        styles?: { cssText?: string }
      }
    ).styles
    expect(declared?.cssText?.replace(/\s+/g, ' ')).toContain(':host { display: block; }')
  })

  test('hides the middle region behind a named toggle that says whether it is open', async () => {
    const header = await folding()
    const toggle = part(header, 'toggle') as HTMLButtonElement
    const content = part(header, 'content') as HTMLElement
    expect([toggle.getAttribute('aria-label'), toggle.getAttribute('aria-expanded')]).toEqual([
      'Site menu',
      'false',
    ])
    expect(toggle.getAttribute('aria-controls')).toBe(content.id)
    expect(content.hidden).toBe(true)
    expect(hasState(header, 'folded')).toBe(true)

    toggle.click()
    await header.updateComplete
    expect([toggle.getAttribute('aria-expanded'), content.hidden]).toEqual(['true', false])
    expect(hasState(header, 'open')).toBe(true)
  })

  test('closes on Escape and puts focus back on the toggle', async () => {
    const header = await folding()
    const toggle = part(header, 'toggle') as HTMLButtonElement
    toggle.click()
    await header.updateComplete
    const link = header.querySelector('a') as HTMLElement
    link.focus()
    link.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Escape',
      }),
    )
    await header.updateComplete
    await header.updateComplete
    expect((part(header, 'content') as HTMLElement).hidden).toBe(true)
    expect(header.shadowRoot?.activeElement).toBe(toggle)
  })

  test('draws no toggle and hides nothing where the bar is wide, or nothing asked it to fold', async () => {
    const header = await folding()
    header.fold(900)
    await header.updateComplete
    expect(part(header, 'toggle')).toBeNull()
    expect((part(header, 'content') as HTMLElement).hidden).toBe(false)
    const plain = await mount(
      '<helix-headless-app-header><a href="/">Home</a></helix-headless-app-header>',
    )
    expect(part(plain, 'toggle')).toBeNull()
  })
})

describe('an open folded region', () => {
  type Opening = HTMLElement & {
    fold(width: number): void
    open: boolean
    requestOpen(next: boolean): boolean
    toggleOpen(): boolean
    updateComplete: Promise<unknown>
  }
  const folded = async (attrs = ''): Promise<Opening> => {
    const header = (await mount(`
      <helix-headless-app-header fold-below="640" ${attrs}>
        <span slot="start">Fusion</span>
        <a href="/work">Work</a>
        <button slot="end">Sign in</button>
      </helix-headless-app-header>
      <button id="outside">Outside</button>
    `)) as Opening
    header.fold(400)
    await header.updateComplete
    return header
  }

  test('follows the toggle in focus order', async () => {
    /* It opens below the row, and between the brand and the actions in the
       markup Tab from the toggle left the header. */
    const header = await folded()
    const toggle = part(header, 'toggle') as HTMLElement
    const content = part(header, 'content') as HTMLElement
    expect(toggle.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(part(header, 'end')?.nextElementSibling).toBe(content)
  })

  test('sits between the brand and the actions while the bar is wide', async () => {
    const header = await folded()
    header.fold(900)
    await header.updateComplete
    expect(part(header, 'start')?.nextElementSibling).toBe(part(header, 'content'))
  })

  test('opens from the open attribute, and says so through the toggle', async () => {
    const header = await folded('open')
    expect(header.open).toBe(true)
    expect((part(header, 'content') as HTMLElement).hidden).toBe(false)
    expect(part(header, 'toggle')?.getAttribute('aria-expanded')).toBe('true')
    expect(hasState(header, 'open')).toBe(true)
  })

  test('opens through requestOpen, which can be refused, and announces with toggle', async () => {
    const header = await folded()
    const heard: string[] = []
    header.addEventListener('toggle', (event) => heard.push((event as ToggleEvent).newState))
    const refuse = (event: Event): void => event.preventDefault()
    header.addEventListener('helix-before-open', refuse)
    expect(header.requestOpen(true)).toBe(false)
    await header.updateComplete
    expect((part(header, 'content') as HTMLElement).hidden).toBe(true)
    header.removeEventListener('helix-before-open', refuse)
    expect(header.toggleOpen()).toBe(true)
    await header.updateComplete
    expect((part(header, 'content') as HTMLElement).hidden).toBe(false)
    expect(heard).toEqual(['open'])
  })

  test('closes when focus moves outside the header', async () => {
    const header = await folded('open')
    const link = header.querySelector('a') as HTMLElement
    const outside = document.getElementById('outside') as HTMLElement
    link.focus()
    link.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: outside }),
    )
    await header.updateComplete
    expect(header.open).toBe(false)
    expect((part(header, 'content') as HTMLElement).hidden).toBe(true)
  })

  test('stays open while focus moves inside the header', async () => {
    const header = await folded('open')
    const link = header.querySelector('a') as HTMLElement
    link.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        composed: true,
        relatedTarget: part(header, 'toggle'),
      }),
    )
    await header.updateComplete
    expect(header.open).toBe(true)
  })

  test('closes on a press outside the header, and not on one inside it', async () => {
    const header = await folded('open')
    header
      .querySelector('a')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    await header.updateComplete
    expect(header.open).toBe(true)
    document
      .getElementById('outside')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    await header.updateComplete
    expect(header.open).toBe(false)
  })

  test('closes when the bar widens past fold-below', async () => {
    const header = await folded('open')
    header.fold(900)
    await header.updateComplete
    expect(header.open).toBe(false)
    header.fold(400)
    await header.updateComplete
    expect((part(header, 'content') as HTMLElement).hidden).toBe(true)
  })

  test('puts the toggle before the brand with toggle-placement="start"', async () => {
    const header = await folded('toggle-placement="start"')
    const toggle = part(header, 'toggle') as HTMLElement
    expect(toggle.parentElement === part(header, 'start')).toBe(true)
    expect(part(header, 'start')?.firstElementChild).toBe(toggle)
    expect(part(header, 'end')?.querySelector('[part="toggle"]')).toBeNull()
  })
})

describe('a header that hides on scroll', () => {
  type Hiding = HTMLElement & { follow(y: number): void; updateComplete: Promise<unknown> }

  test('goes on a scroll down past it and comes back on a scroll up', async () => {
    const header = (await mount(
      '<helix-headless-app-header hide-on-scroll><a href="/">Home</a></helix-headless-app-header>',
    )) as Hiding
    header.getBoundingClientRect = () => ({ height: 56 }) as DOMRect
    header.follow(400)
    header.follow(600)
    expect(hasState(header, 'hidden')).toBe(true)
    header.follow(500)
    expect(hasState(header, 'hidden')).toBe(false)
    header.follow(700)
    header.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(hasState(header, 'hidden')).toBe(false)
  })

  test('and stays where it is without hide-on-scroll', async () => {
    const header = (await mount(
      '<helix-headless-app-header><a href="/">Home</a></helix-headless-app-header>',
    )) as Hiding
    header.getBoundingClientRect = () => ({ height: 56 }) as DOMRect
    header.follow(400)
    header.follow(600)
    expect(hasState(header, 'hidden')).toBe(false)
  })
})
