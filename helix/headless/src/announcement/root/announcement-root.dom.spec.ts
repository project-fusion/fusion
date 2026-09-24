import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
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
})
