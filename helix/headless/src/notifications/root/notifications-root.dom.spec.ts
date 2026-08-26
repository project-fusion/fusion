import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

/* The feed, after hydration.
 *
 * What is here is the part a list owns rather than an item: that the items
 * declared as children become the list, that the unread count follows them
 * without anybody counting, and that marking everything read goes through each
 * item's own request so one refusal refuses one item. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Feed extends HTMLElement {
  items: Array<HTMLElement & { markRead: (next?: boolean) => boolean; read: boolean }>
  markEveryoneRead: () => number
  unread: number
  updateComplete: Promise<unknown>
}

const markup = `
  <helix-headless-notifications label="Activity" mark-all>
    <helix-headless-notifications-item>One</helix-headless-notifications-item>
    <helix-headless-notifications-item>Two</helix-headless-notifications-item>
    <helix-headless-notifications-item default-read>Three</helix-headless-notifications-item>
  </helix-headless-notifications>`

const feed = async (source = markup) => {
  const element = (await mount(source)) as Feed
  await element.updateComplete
  return element
}

describe('the list', () => {
  test('the host is a named region holding a list', async () => {
    const element = await feed()
    expect(role(element)).toBe('region')
    expect(part(element, 'list')?.getAttribute('role')).toBe('list')
  })

  test('the items declared as children are the list', async () => {
    const element = await feed()
    expect(element.items).toHaveLength(3)
  })

  test('a child that is not a notification is not in the list', async () => {
    const element = await feed(`
      <helix-headless-notifications>
        <helix-headless-notifications-item>One</helix-headless-notifications-item>
        <div>Not a notification</div>
      </helix-headless-notifications>`)
    expect(element.items).toHaveLength(1)
  })

  test('an empty feed says so rather than showing a blank box', async () => {
    const element = await feed('<helix-headless-notifications></helix-headless-notifications>')
    expect(part(element, 'empty')).not.toBeNull()
  })
})

describe('the count', () => {
  /**
   * Derived rather than settable. A count a consumer could write is a second
   * source of truth for something the items already know, and the first time
   * the two disagree the badge is right and the list is not.
   */
  test('unread counts the items, and nobody has to keep it', async () => {
    const element = await feed()
    expect(element.unread).toBe(2)
  })

  /**
   * **The bug this replaced.** `@property({ reflect: true })` on a getter with
   * no setter reflects once, because nothing puts a derived getter into
   * `changedProperties` after the first update. Measured before the fix: the
   * property answered 1 and the attribute still said 2, so a badge reading the
   * attribute showed a count for an item the reader had just opened.
   */
  test('the attribute follows too, rather than being right once', async () => {
    const element = await feed()
    expect(element.getAttribute('unread')).toBe('2')
    element.items[0]?.markRead(true)
    await element.updateComplete
    await new Promise((done) => {
      queueMicrotask(() => done(undefined))
    })
    await element.updateComplete
    expect(element.getAttribute('unread')).toBe('1')
  })

  test('it follows an item being marked read', async () => {
    const element = await feed()
    element.items[0]?.markRead(true)
    await element.updateComplete
    expect(element.unread).toBe(1)
  })
})

describe('marking everything read', () => {
  test('every unread item moves, and the read one is left alone', async () => {
    const element = await feed()
    expect(element.markEveryoneRead()).toBe(2)
    await element.updateComplete
    expect(element.unread).toBe(0)
  })

  /**
   * Through each item's own request rather than by writing its property, which
   * is what makes one refusal refuse one item: a consumer who owns some items
   * and not others gets the right answer for each.
   */
  test('an item that refuses stays unread while the rest move', async () => {
    const element = await feed()
    element.items[1]?.addEventListener('helix-read', (event) => event.preventDefault())
    element.markEveryoneRead()
    await element.updateComplete
    expect(element.items[0]?.read).toBe(true)
    expect(element.items[1]?.read).toBe(false)
    expect(element.unread).toBe(1)
  })

  test('refusing the list-level event stops the whole thing', async () => {
    const element = await feed()
    element.addEventListener('helix-read', (event) => {
      if (event.target === element) {
        event.preventDefault()
      }
    })
    expect(element.markEveryoneRead()).toBe(0)
    expect(element.unread).toBe(2)
  })

  test('the control is drawn only while something is unread', async () => {
    const element = await feed()
    expect(part(element, 'mark-all')).not.toBeNull()
    element.markEveryoneRead()
    await element.updateComplete
    expect(part(element, 'mark-all')).toBeNull()
  })
})
