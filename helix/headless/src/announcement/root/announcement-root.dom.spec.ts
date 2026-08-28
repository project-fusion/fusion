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
    expect(role(announcement)).toBe('status')
    expect(announcement.internals?.ariaLive).toBe('polite')
    expect(announcement.hasAttribute('role')).toBe(false)
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
    expect(heard).toBe('Trial ending')
    expect(announcement.isConnected).toBe(true)
  })

  test('the dismiss control carries a name, and the glyph can be replaced', async () => {
    const announcement = await mount(
      '<helix-headless-announcement dismiss-label="Close notice" dismissible><span slot="icon">x</span></helix-headless-announcement>',
    )
    /* The name is on the control that is actually focused, which is now the
       control itself: this was a `helix-headless-icon-button` wrapping a button,
       and the wrapper shipped no styles, so what rendered was the browser's own
       bordered gray button inside a message bar. A plain `<button>` is what
       every other in-shadow control in the library renders.

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
