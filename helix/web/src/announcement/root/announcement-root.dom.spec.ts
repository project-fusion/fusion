import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

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
      '<helix-announcement severity="danger">Down</helix-announcement>',
    )) as HTMLElement & {
      internals?: ElementInternals
    }
    expect(role(announcement)).toBe('status')
    expect(announcement.internals?.ariaLive).toBe('polite')
    expect(announcement.hasAttribute('role')).toBe(false)
  })

  test('no dismiss control unless it can be dismissed', async () => {
    const announcement = await mount('<helix-announcement>Notice</helix-announcement>')
    expect(part(announcement, 'dismiss')).toBeNull()
  })

  test('dismissing asks rather than acts', async () => {
    // The consumer owns the markup: removing the node under them would put
    // their state and the document out of step.
    const announcement = await mount(
      '<helix-announcement dismissible>Trial ending</helix-announcement>',
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
      '<helix-announcement dismiss-label="Close notice" dismissible><span slot="icon">x</span></helix-announcement>',
    )
    /* On the icon button's own button, not on the host. The dismiss control is
       a `helix-base-icon-button` now rather than a bare `<button>`, so the name
       goes in as `label` and comes out as `aria-label` on the element that is
       actually focused. Asserting the inner one is asserting what a screen
       reader reads; asserting the host would pass on a name that never
       reached the control. */
    const dismiss = part(announcement, 'dismiss') as HTMLElement
    expect(dismiss.getAttribute('label')).toBe('Close notice')
    expect(dismiss.shadowRoot?.querySelector('[part="button"]')?.getAttribute('aria-label')).toBe(
      'Close notice',
    )
  })
})
