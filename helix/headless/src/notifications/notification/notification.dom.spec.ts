import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

/* One notification.
 *
 * What this element owns is read state, the dismiss, and which of the two things
 * the trailing column is showing. The reading of the timestamp is not its any
 * more: it hands the instant to `helix-format-date` and that family's specs
 * carry the rest. */

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
    `<helix-headless-notification ${attributes}>Something happened</helix-headless-notification>`,
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

/**
 * The timestamp is delegated whole, so what is asserted here is the delegation.
 *
 * **These tests read the child rather than a `time` part, and two of them passed
 * for the wrong reason before they were rewritten.** "an item with no `at` shows
 * no time" asked `part(element, 'time')` for null, and once the timestamp moved
 * into `helix-format-date` that lookup answers null for every item, timestamped
 * or not: an assertion that cannot fail. What the reading itself does, and when
 * it expires, is `format-date-root.dom.spec.ts` and `elapsed-time.pure.spec.ts`.
 */
describe('the timestamp', () => {
  const stamp = (element: HTMLElement) =>
    element.shadowRoot?.querySelector('helix-headless-format-date') as
      | (HTMLElement & { date: string; elapsed: boolean; locale: string })
      | null

  test('it is a format-date of this tier, not a time this element drew itself', async () => {
    const element = await item(`at="${new Date().toISOString()}"`)
    expect(stamp(element)).not.toBeNull()
    expect(part(element, 'time')).toBeNull()
  })

  test('the instant and the locale are handed down, and the mode is elapsed', async () => {
    const when = new Date(Date.now() - 120_000).toISOString()
    const element = await item(`at="${when}" locale="en-GB"`)
    expect(stamp(element)?.date).toBe(when)
    expect(stamp(element)?.locale).toBe('en-GB')
    expect(stamp(element)?.getAttribute('elapsed')).not.toBeNull()
  })

  test('changing `at` reaches the child', async () => {
    const element = await item(`at="${new Date().toISOString()}"`)
    const when = new Date(Date.now() - 7_200_000).toISOString()
    element.at = when
    await element.updateComplete
    expect(stamp(element)?.date).toBe(when)
  })

  /* An item with no timestamp still renders the child, which then renders
     nothing: the alternative is this element deciding what a valid date is,
     which is the child's job and is tested there. */
  test('an item with no `at` hands down an empty string rather than a guess', async () => {
    expect(stamp(await item())?.date).toBe('')
  })
})

/**
 * Whether there is anything for the time to make way for.
 *
 * The trailing column shows one of the two, so a row with nothing to do about it
 * would hide its timestamp on hover and put nothing in its place. `dismissible`
 * is known without a DOM; a filled actions slot is not, which is why this is a
 * state written after the render rather than a property.
 */
describe('the trailing swap', () => {
  test('a row with neither actions nor a dismiss has nothing to swap to', async () => {
    expect(hasState(await item(), 'controls')).toBe(false)
  })

  test('a dismiss is enough on its own', async () => {
    expect(hasState(await item('dismissible'), 'controls')).toBe(true)
  })

  test('so is an action a consumer slotted', async () => {
    const element = (await mount(
      `<helix-headless-notification>
        Something happened
        <button slot="actions">View</button>
      </helix-headless-notification>`,
    )) as Item
    await element.updateComplete
    expect(hasState(element, 'controls')).toBe(true)
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
