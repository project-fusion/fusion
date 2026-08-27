import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, role } from '@helix-io/testing/dom'

/* One notification.
 *
 * The timestamp is the part worth the most attention here: it is correct on
 * first render whatever the code does, and the failure is that it stays that way
 * for the life of the page. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Item extends HTMLElement {
  at: string
  markRead: (next?: boolean) => boolean
  read: boolean
  updateComplete: Promise<unknown>
}

const item = async (attributes = '') =>
  (await mount(
    `<helix-headless-notifications-item ${attributes}>Something happened</helix-headless-notifications-item>`,
  )) as Item

describe('read state', () => {
  test('an item is unread until something says otherwise', async () => {
    expect((await item()).read).toBe(false)
  })

  test('`default-read` seeds a state the element then owns', async () => {
    const element = await item('default-read')
    expect(element.read).toBe(true)
    expect(element.markRead(false)).toBe(true)
    expect(element.read).toBe(false)
  })

  test('the state is recorded, since unread is a visual state a stylesheet must see', async () => {
    /* And recorded rather than reflected. `read` was a reflected property until
       27 Aug 2026, so an item served `default-read` grew the attribute on its
       first update: a hydration mismatch, and an attribute a copy-paste then
       re-reads as a declaration. */
    const element = await item()
    element.markRead(true)
    await element.updateComplete
    expect(hasState(element, 'read')).toBe(true)
    expect(element.hasAttribute('read')).toBe(false)
  })

  /**
   * Marking read is usually a round trip, and a component that flips its own
   * state and then hears the request failed has told the reader something
   * untrue.
   */
  test('refusing `helix-read` leaves the item unread', async () => {
    const element = await item()
    element.addEventListener('helix-read', (event) => event.preventDefault())
    expect(element.markRead(true)).toBe(false)
    expect(element.read).toBe(false)
  })

  test('a declared `read` is a seed, and the element still marks itself', async () => {
    /* Asserted the opposite until 26 Aug 2026, when declaring the property was a
       claim of ownership and the element announced without moving. Control is
       an action now: it applies, and a consumer refuses to take the decision.
       See 294. */
    const element = await item('read')
    element.markRead(false)
    expect(element.read).toBe(false)
  })

  test('and refusing is what keeps it read', async () => {
    const element = await item('read')
    element.addEventListener('helix-read', (event: Event) => {
      event.preventDefault()
    })
    element.markRead(false)
    expect(element.read).toBe(true)
  })

  test('asking for the state it already has is not a request', async () => {
    const element = await item()
    let heard = 0
    element.addEventListener('helix-read', () => {
      heard += 1
    })
    expect(element.markRead(false)).toBe(false)
    expect(heard).toBe(0)
  })
})

describe('the timestamp', () => {
  test('an item with no `at` shows no time rather than the epoch', async () => {
    expect(part(await item(), 'time')).toBeNull()
  })

  test('an unparseable `at` shows no time rather than "Invalid Date"', async () => {
    expect(part(await item('at="not a date"'), 'time')).toBeNull()
  })

  /**
   * `datetime` carries the exact instant whatever the text says, so a screen
   * reader and a copy-paste both get the real time rather than "yesterday".
   */
  test('the exact instant is in `datetime`, and the reading is the text', async () => {
    const when = new Date(Date.now() - 120_000).toISOString()
    const element = await item(`at="${when}"`)
    const time = part(element, 'time')
    expect(time?.getAttribute('datetime')).toBe(when)
    expect(time?.textContent).toContain('2 minutes ago')
  })

  test('a fresh item reads as now rather than counting seconds at the reader', async () => {
    const element = await item(`at="${new Date().toISOString()}"`)
    expect(part(element, 'time')?.textContent).toContain('now')
  })

  test('changing `at` redraws the reading', async () => {
    const element = await item(`at="${new Date().toISOString()}"`)
    element.at = new Date(Date.now() - 7_200_000).toISOString()
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toContain('2 hours ago')
  })
})

describe('structure', () => {
  test('the item is a list item, so the list it sits in is a real list', async () => {
    expect(role(await item())).toBe('listitem')
  })

  test('dismiss is drawn only when it is offered', async () => {
    expect(part(await item(), 'dismiss')).toBeNull()
    expect(part(await item('dismissible'), 'dismiss')).not.toBeNull()
  })

  test('refusing `helix-dismiss` keeps the item in the list', async () => {
    const element = await item('dismissible')
    element.addEventListener('helix-dismiss', (event) => event.preventDefault())
    ;(part(element, 'dismiss') as HTMLElement).click()
    expect(element.isConnected).toBe(true)
  })

  test('dismissing removes it', async () => {
    const element = await item('dismissible')
    ;(part(element, 'dismiss') as HTMLElement).click()
    expect(element.isConnected).toBe(false)
  })
})
