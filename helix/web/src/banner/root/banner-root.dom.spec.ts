import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('banner', () => {
  test('is a polite live region, never an assertive one', async () => {
    // `role="alert"` interrupts whatever is being read, which would cut across
    // a screen-reader user on every page load for a banner that was in the
    // served HTML. Politeness costs a moment and is never wrong.
    const banner = (await mount(
      '<helix-banner severity="danger">Down</helix-banner>',
    )) as HTMLElement & {
      internals?: ElementInternals
    }
    expect(role(banner)).toBe('status')
    expect(banner.internals?.ariaLive).toBe('polite')
    expect(banner.hasAttribute('role')).toBe(false)
  })

  test('no dismiss control unless it can be dismissed', async () => {
    const banner = await mount('<helix-banner>Notice</helix-banner>')
    expect(part(banner, 'dismiss')).toBeNull()
  })

  test('dismissing asks rather than acts', async () => {
    // The consumer owns the markup: removing the node under them would put
    // their state and the document out of step.
    const banner = await mount('<helix-banner dismissible>Trial ending</helix-banner>')
    let heard: string | null = null
    banner.addEventListener('helix-dismiss', (event) => {
      heard = (event as CustomEvent<{ label: string }>).detail.label
    })

    part(banner, 'dismiss')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(heard).toBe('Trial ending')
    expect(banner.isConnected).toBe(true)
  })

  test('the dismiss control carries a name, and the glyph can be replaced', async () => {
    const banner = await mount(
      '<helix-banner dismiss-label="Close notice" dismissible><span slot="icon">x</span></helix-banner>',
    )
    expect(part(banner, 'dismiss')?.getAttribute('aria-label')).toBe('Close notice')
  })
})
