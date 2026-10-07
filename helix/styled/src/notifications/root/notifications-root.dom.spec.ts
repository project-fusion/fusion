import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
  role,
  settle,
} from '@fusion.dev/helix-testing/dom'

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
    <helix-notification>One</helix-notification>
    <helix-notification default-read>Two</helix-notification>
  </helix-notifications>`

describe('the styled feed', () => {
  test('it is still a named region holding a list', async () => {
    const element = await mount(markup)
    expect(role(element)).toBe('region')
    expect(part(element, 'list')?.getAttribute('role')).toBe('list')
  })

  test('unread is a custom state, which is how a stylesheet knows', async () => {
    /* And not an attribute on the item, which is what `:host(:not([read]))`
       would need. The host is the consumer's markup, and an item served
       `default-read` may not grow anything it was not sent. */
    const element = await mount(markup)
    const items = element.querySelectorAll('helix-notification')
    expect(hasState(items[0] as Element, 'read')).toBe(false)
    expect(hasState(items[1] as Element, 'read')).toBe(true)
    expect(items[1]?.hasAttribute('read')).toBe(false)
  })

  test('the count reaches the host, so a badge can read it without counting', async () => {
    const element = await mount(markup)
    expect(element.getAttribute('unread')).toBe('1')
  })
})

describe('a row that arrives after the render', () => {
  test('prepended to a feed that rendered empty, is drawn and hides the empty line', async () => {
    const element = (await mount(
      '<helix-notifications label="Activity"></helix-notifications>',
    )) as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await element.updateComplete
    expect(part(element, 'empty')).not.toBeNull()
    const row = document.createElement('helix-notification')
    row.textContent = 'New'
    element.prepend(row)
    /* The feed hears the row from a `MutationObserver`, a task after this one. */
    await new Promise((done) => setTimeout(done, 0))
    await settle(element)
    const list = element.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="items"]')
    const drawn = list?.assignedElements() ?? []
    expect(drawn.length === 1 && drawn[0] === row).toBe(true)
    expect(part(element, 'empty')).toBeNull()
    expect(hasState(element, 'empty')).toBe(false)
  })
})

/* The feed's stylesheet as text: happy-dom resolves no cascade, so here is
   held that the rule exists, and the pictures that it applies. */
const feedSheet = (): string => {
  const declared = (customElements.get('helix-notifications') as unknown as { styles: unknown })
    .styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('separation on the feed', () => {
  const feed = async (separation: string): Promise<HTMLElement & { separation?: string }> => {
    const element = (await mount(`
      <helix-notifications label="Activity" ${separation}>
        <h2 slot="header">Activity</h2>
        <helix-notification>One</helix-notification>
        <helix-notification separation="plain">Two</helix-notification>
        <helix-notification-group label="Earlier">
          <helix-notification>Three</helix-notification>
        </helix-notification-group>
      </helix-notifications>`)) as HTMLElement & { separation?: string }
    await settle(element)
    return element
  }
  const rows = (element: HTMLElement): Element[] => [
    ...element.querySelectorAll('helix-notification'),
  ]

  test('makes every row that sets none a box, grouped rows included, and a row keeps its own', async () => {
    const element = await feed('separation="filled"')
    const [one, two, three] = rows(element) as [Element, Element, Element]
    expect(hasState(one, 'feed-filled')).toBe(true)
    expect(hasState(three, 'feed-filled')).toBe(true)
    expect(hasState(two, 'feed-filled')).toBe(false)
    /* Said as a state, so the row's markup stays the page's. */
    expect(one.hasAttribute('separation')).toBe(false)
  })

  test('follows a change, and plain or none leaves every row as it was', async () => {
    const element = await feed('separation="outlined"')
    const [one] = rows(element) as [Element]
    expect(hasState(one, 'feed-outlined')).toBe(true)
    element.separation = 'plain'
    await settle(element)
    await settle(one as HTMLElement)
    expect(hasState(one, 'feed-outlined')).toBe(false)
    expect(hasState(one, 'feed-filled')).toBe(false)
    const bare = await feed('')
    expect(
      rows(bare).some((row) => hasState(row, 'feed-filled') || hasState(row, 'feed-outlined')),
    ).toBe(false)
    expect(bare.hasAttribute('separation')).toBe(false)
  })

  test('takes the rule under the header away and puts the gap between boxes before the first', () => {
    const text = feedSheet()
    expect(text).toContain(
      ':host([separation="filled"]) [part="header"],\n:host([separation="outlined"]) [part="header"] {border-block-end: none;}',
    )
    expect(text).toContain(
      ':host([separation="filled"]) [part="list"],\n:host([separation="outlined"]) [part="list"] {padding-block-start: var(--notifications-item-gap, var(--helix-space-xs));}',
    )
  })
})

/* Browser only: happy-dom computes no style from a shadow sheet. */
const geometry = hasLayout() ? test : (): void => {}

describe('the row controls', () => {
  geometry('fade in where they rest, so the dismiss control holds still', async () => {
    const element = await mount(`
      <helix-notifications label="Activity">
        <helix-notification dismissible>One</helix-notification>
      </helix-notifications>`)
    const item = element.querySelector('helix-notification') as HTMLElement
    const controls = part(item, 'controls') as Element
    expect(getComputedStyle(controls).translate).toBe('none')
    // Focus within the row swaps the controls in, as the pointer does.
    const dismiss = part(item, 'dismiss') as HTMLElement
    dismiss.focus()
    expect(item.matches(':focus-within')).toBe(true)
    expect(getComputedStyle(controls).translate).toBe('none')
  })
})
