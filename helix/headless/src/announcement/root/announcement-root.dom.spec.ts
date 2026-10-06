import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The hidden page a spec stands in for is the document's own property, so
   the prototype's answer comes back after each spec. */
afterEach(() => {
  delete (document as unknown as { hidden?: boolean }).hidden
})

describe('announcement', () => {
  test('is a polite live region, never an assertive one', async () => {
    // `role="alert"` interrupts whatever is being read, which would cut across
    // a screen-reader user on every page load for an announcement that was in the
    // served HTML. Politeness costs a moment and is never wrong.
    const announcement = (await mount(
      '<helix-headless-announcement tone="danger">Down</helix-headless-announcement>',
    )) as HTMLElement & {
      internals?: ElementInternals
    }
    const live = part(announcement, 'live') as HTMLElement
    expect(live.getAttribute('role')).toBe('status')
    expect(role(announcement)).toBeNull()
    expect(announcement.hasAttribute('role')).toBe(false)
  })

  test('raised mid-session, its message is said by a region that was there first', async () => {
    /* The host was the region, and a banner inserted with its message in it
       is a region arriving with its words, read inconsistently at best. After
       the page has loaded, the region arrives empty and fills a frame later. */
    /* Inserted by hand and read after the first render, before a frame has
       passed: a harness that waits for frames would read the filled region. */
    document.body.innerHTML =
      '<helix-headless-announcement>Service degraded</helix-headless-announcement>'
    const announcement = document.body.firstElementChild as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await announcement.updateComplete
    const live = part(announcement, 'live') as HTMLElement
    expect(live.textContent?.trim()).toBe('')
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await announcement.updateComplete
    expect(live.textContent?.trim()).toBe('Service degraded')
  })

  /* The message was in the tree twice for the seven-second hold. */
  test('hides the message while the live copy holds it', async () => {
    document.body.innerHTML =
      '<helix-headless-announcement>Service degraded</helix-headless-announcement>'
    const announcement = document.body.firstElementChild as HTMLElement & {
      arrival: { said: string }
      requestUpdate: () => void
      updateComplete: Promise<boolean>
    }
    await announcement.updateComplete
    const content = part(announcement, 'content') as HTMLElement
    expect(content.hasAttribute('aria-hidden')).toBe(false)
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await announcement.updateComplete
    expect(content.getAttribute('aria-hidden')).toBe('true')
    announcement.arrival.said = ''
    announcement.requestUpdate()
    await announcement.updateComplete
    expect(content.hasAttribute('aria-hidden')).toBe(false)
  })

  /* The region was re-marked only when a property changed, so a link a
     framework rendered after the first render stayed hidden for good. */
  test('actions slotted after the first render are shown', async () => {
    const announcement = (await mount(
      '<helix-headless-announcement>Trial ends Friday.</helix-headless-announcement>',
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    expect((part(announcement, 'actions') as HTMLElement | null)?.hidden).toBe(true)
    const link = document.createElement('a')
    link.slot = 'actions'
    link.href = '#upgrade'
    link.textContent = 'Upgrade'
    announcement.append(link)
    await new Promise((done) => setTimeout(done, 0))
    expect((part(announcement, 'actions') as HTMLElement | null)?.hidden).toBe(false)
  })

  test('no dismiss control unless it can be dismissed', async () => {
    const announcement = await mount(
      '<helix-headless-announcement>Notice</helix-headless-announcement>',
    )
    expect(part(announcement, 'dismiss')).toBeNull()
  })

  test('dismissing asks rather than acts', async () => {
    // The consumer owns the markup: removing the node under them would put
    // their state and the document out of step.
    const announcement = await mount(
      '<helix-headless-announcement dismissible>Trial ending</helix-headless-announcement>',
    )
    let heard: string | null = null
    announcement.addEventListener('helix-dismiss', (event) => {
      heard = (event as CustomEvent<{ label: string }>).detail.label
    })

    part(announcement, 'dismiss')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect<string | null>(heard).toBe('Trial ending')
    expect(announcement.isConnected).toBe(true)
  })

  test('the dismiss control carries a name, and the glyph can be replaced', async () => {
    const announcement = await mount(
      '<helix-headless-announcement dismiss-label="Close notice" dismissible><span slot="icon">x</span></helix-headless-announcement>',
    )
    /* The name is on the control that is actually focused, which is the plain
       `<button>` every other in-shadow control in the library renders. Nesting
       a `helix-headless-icon-button` here instead puts the name on a wrapper
       that ships no styles, so what renders is the browser's own bordered gray
       button inside a message bar.

       Asserting the tag as well as the name, because the two failure modes are
       different and only one of them is visible: a name that never reaches the
       control is silent to everyone who can see, and a nested component is
       silent to everyone who cannot. */
    const dismiss = part(announcement, 'dismiss') as HTMLElement
    expect(dismiss.tagName.toLowerCase()).toBe('button')
    expect(dismiss.getAttribute('aria-label')).toBe('Close notice')

    const glyph = dismiss.querySelector('slot[name="icon"]') as HTMLSlotElement | null
    expect(glyph?.assignedNodes().length).toBeGreaterThan(0)
  })

  test('with a duration it asks to be dismissed once the time is spent, and not while held', async () => {
    const asked: string[] = []
    const announcement = await mount(
      '<helix-headless-announcement duration="40">Trial ends Friday</helix-headless-announcement>',
    )
    announcement.addEventListener('helix-dismiss', () => asked.push('dismiss'))
    announcement.dispatchEvent(new Event('mouseenter'))
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(asked).toEqual([])
    announcement.dispatchEvent(new Event('mouseleave'))
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(asked).toEqual(['dismiss'])
  })

  test('with no duration it stays', async () => {
    const asked: string[] = []
    const announcement = await mount(
      '<helix-headless-announcement>Trial ends Friday</helix-headless-announcement>',
    )
    announcement.addEventListener('helix-dismiss', () => asked.push('dismiss'))
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(asked).toEqual([])
  })

  /* A held clock had no state a sheet could draw, and a timed message ran
     out in a background tab where nobody saw it. */
  test('says when its clock is held, by a reader or by a hidden page', async () => {
    const asked: string[] = []
    const announcement = (await mount(
      '<helix-headless-announcement duration="40">Trial ends Friday</helix-headless-announcement>',
    )) as HTMLElement & { internals: ElementInternals }
    announcement.addEventListener('helix-dismiss', () => asked.push('dismiss'))
    expect(announcement.internals.states.has('paused')).toBe(false)
    announcement.dispatchEvent(new Event('focusin'))
    expect(announcement.internals.states.has('paused')).toBe(true)
    announcement.dispatchEvent(new Event('focusout'))
    expect(announcement.internals.states.has('paused')).toBe(false)

    let away = true
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => away })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(announcement.internals.states.has('paused')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(asked).toEqual([])
    away = false
    document.dispatchEvent(new Event('visibilitychange'))
    expect(announcement.internals.states.has('paused')).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(asked).toEqual(['dismiss'])
  })

  /* Callout named this slot `dismiss-icon` and Announcement named it `icon`. */
  test('takes the glyph from dismiss-icon, as Callout does, and still from icon', async () => {
    const glyph = async (slotted: string): Promise<string> => {
      const announcement = await mount(
        `<helix-headless-announcement dismissible>${slotted}</helix-headless-announcement>`,
      )
      const button = part(announcement, 'dismiss') as HTMLElement
      for (const name of ['dismiss-icon', 'icon']) {
        const slot = button.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null
        const shown = slot?.assignedElements() ?? []
        if (shown.length > 0) {
          return `${name}:${shown[0]?.textContent}`
        }
      }
      return 'none'
    }
    expect(await glyph('<span slot="dismiss-icon">a</span>')).toBe('dismiss-icon:a')
    expect(await glyph('<span slot="icon">b</span>')).toBe('icon:b')
    expect(await glyph('')).toBe('none')
  })
})

describe('the old `icon` slot', () => {
  /* It is still drawn, and a page slotting it was never told it has a replacement. */
  test('is reported once as deprecated, and `dismiss-icon` is not', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0))
    try {
      await mount(
        '<helix-headless-announcement dismissible>Hi<span slot="icon">x</span></helix-headless-announcement>',
      )
      await settle()
      await mount(
        '<helix-headless-announcement dismissible>Hi<span slot="dismiss-icon">x</span></helix-headless-announcement>',
      )
      await settle()
    } finally {
      console.warn = original
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('dismiss-icon')
  })
})
