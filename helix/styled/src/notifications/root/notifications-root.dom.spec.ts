import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, role } from '@helix-io/testing/dom'

/* The styled tier, which is paint over the headless behavior.
 *
 * The read contract, the count and the timestamp are the headless tier's and are
 * asserted there. What is left is the pair the styled tier owns: that the roles
 * survive the subclass, and that unread is a state a stylesheet can actually
 * reach, which is the whole reason the item records one. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `
  <helix-notifications label="Activity" mark-all>
    <helix-notifications-item>One</helix-notifications-item>
    <helix-notifications-item default-read>Two</helix-notifications-item>
  </helix-notifications>`

describe('the styled feed', () => {
  test('it is still a named region holding a list', async () => {
    const element = await mount(markup)
    expect(role(element)).toBe('region')
    expect(part(element, 'list')?.getAttribute('role')).toBe('list')
  })

  test('unread is a custom state, which is how a stylesheet knows', async () => {
    /* And not an attribute on the item, which is what `:host(:not([read]))`
       selected on until the state moved into `ElementInternals`. The host is
       the consumer's markup and an item served `default-read` may not grow
       anything it was not sent. */
    const element = await mount(markup)
    const items = element.querySelectorAll('helix-notifications-item')
    expect(hasState(items[0] as Element, 'read')).toBe(false)
    expect(hasState(items[1] as Element, 'read')).toBe(true)
    expect(items[1]?.hasAttribute('read')).toBe(false)
  })

  test('the count reaches the host, so a badge can read it without counting', async () => {
    const element = await mount(markup)
    expect(element.getAttribute('unread')).toBe('1')
  })
})
