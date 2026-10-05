import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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
    <helix-headless-notification>One</helix-headless-notification>
    <helix-headless-notification>Two</helix-headless-notification>
    <helix-headless-notification default-read>Three</helix-headless-notification>
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
        <helix-headless-notification>One</helix-headless-notification>
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
   * `@property({ reflect: true })` on a getter with no setter reflects once,
   * because nothing puts a derived getter into `changedProperties` after the
   * first update: the property answers 1 while the attribute still says 2, so a
   * badge reading the attribute shows a count for an item the reader has just
   * opened.
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

  /**
   * A region nobody filled is not laid out, and the element is what says so.
   *
   * A stylesheet cannot ask it: `:not(:has(> slot:has(*)))` never parses, since
   * `:has()` may not be nested inside `:has()`, and a slot's assigned nodes are
   * not its DOM children, so the inner test would be about fallback content
   * rather than the fill.
   */
  test('an empty region is hidden, and a filled one is not', async () => {
    const element = await feed()
    expect(part(element, 'footer')?.hasAttribute('data-empty')).toBe(true)
    expect(part(element, 'footer')?.hasAttribute('hidden')).toBe(true)
    /* The header holds no slotted content either, and is not empty: this element
       is drawing its own mark-all control into it. */
    expect(part(element, 'header')?.hasAttribute('data-empty')).toBe(false)
    element.markEveryoneRead()
    await element.updateComplete
    expect(part(element, 'header')?.hasAttribute('data-empty')).toBe(true)
  })

  /**
   * The empty feed is the one state where the header is all there is.
   *
   * `markEmpty` reads what is assigned and `assign` is what assigns it, in that
   * order. A feed with items is saved by its own `slotchange`, which schedules a
   * second update that asks again after the first assignment; a feed with no
   * items schedules nothing, so an answer from before anything was assigned
   * would stand for the life of the element.
   */
  test('a feed with a header and no items keeps its header', async () => {
    const element = await feed(`
      <helix-headless-notifications label="Activity">
        <h2 slot="header">Activity</h2>
      </helix-headless-notifications>`)
    expect(part(element, 'header')?.hasAttribute('hidden')).toBe(false)
    expect(part(element, 'empty')).not.toBeNull()
  })

  test('the control is drawn only while something is unread', async () => {
    const element = await feed()
    expect(part(element, 'mark-all')).not.toBeNull()
    element.markEveryoneRead()
    await element.updateComplete
    expect(part(element, 'mark-all')).toBeNull()
  })

  test('and it says what it does in the consumer’s words', async () => {
    /* The words are the whole of the control: it has no glyph, so this is both
       what a reader sees and what one hears. It cannot be asserted on the
       server, since the control is drawn from the unread count and counting
       items means reading children Lit SSR gives this element no tree for.

       A phrase the component does not default to, `markAllLabel` holding "Mark
       all as read", so a template writing that literal would not satisfy it. */
    const element = await feed(`
      <helix-headless-notifications label="Activity" mark-all mark-all-label="Clear the badge">
        <helix-headless-notification>One</helix-headless-notification>
      </helix-headless-notifications>`)
    expect(part(element, 'mark-all')?.textContent?.trim()).toBe('Clear the badge')
  })
})

/* Whether anything in the feed has media is the feed's to answer, because no
   item can: an item knows about its own media slot and nothing about its
   neighbors, and a row whose text starts further in than the row above it is a
   fault of the feed rather than of either row. The styled tier turns this into a
   reserved column; this tier ships no stylesheet and only has to be right. */
describe('the media column', () => {
  test('a feed where something has media says so', async () => {
    const element = await feed(`
      <helix-headless-notifications label="Activity">
        <helix-headless-notification>
          <span slot="media">A</span>
          One
        </helix-headless-notification>
        <helix-headless-notification>Two</helix-headless-notification>
      </helix-headless-notifications>`)
    expect(hasState(element, 'media')).toBe(true)
  })

  test('a feed where nothing does reserves nothing', async () => {
    const element = await feed()
    expect(hasState(element, 'media')).toBe(false)
  })
})

/* Folding is the group's state and the feed's command. These say the feed asks
   rather than writes, which is what keeps one answer to the question. */
describe('folding every group', () => {
  const grouped = `
    <helix-headless-notifications label="Activity">
      <helix-headless-notification-group collapsible label="Today" open>
        <helix-headless-notification>One</helix-headless-notification>
        <helix-headless-notification>Two</helix-headless-notification>
      </helix-headless-notification-group>
      <helix-headless-notification-group collapsible label="Yesterday" open>
        <helix-headless-notification>Three</helix-headless-notification>
        <helix-headless-notification>Four</helix-headless-notification>
      </helix-headless-notification-group>
      <helix-headless-notification-group label="Older">
        <helix-headless-notification>Five</helix-headless-notification>
      </helix-headless-notification-group>
    </helix-headless-notifications>`

  type Group = HTMLElement & { open: boolean; updateComplete: Promise<unknown> }

  type Folding = HTMLElement & {
    foldEveryGroup: (folded?: boolean) => number
    groups: Group[]
    updateComplete: Promise<unknown>
  }

  /* Each group renders on its own schedule, so the feed's own `updateComplete`
     says nothing about whether they have re-assigned their slots yet. */
  const settled = async (element: Folding): Promise<void> => {
    await element.updateComplete
    await Promise.all(element.groups.map((group) => group.updateComplete))
  }

  const withGroups = async (): Promise<Folding> => {
    const element = (await mount(grouped)) as Folding
    await element.updateComplete
    return element
  }

  test('every group is reachable, collapsible or not', async () => {
    expect((await withGroups()).groups.length).toBe(3)
  })

  /* A group that cannot fold was never asked, so it is left alone rather than
     counted as having refused. Its own `open` is not asserted, because `open` is
     inert for a group that is not collapsible: `assign` shows every row whatever
     it says, so reading it would be testing a value nothing acts on. */
  const rendered = (group: HTMLElement): number =>
    group.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')?.assignedElements()
      .length ?? -1

  /* **What the rows do is behind `hasLayout`, and the reason is happy-dom.**
   * `slot.assign()` there will grow an assignment and will not shrink one: a
   * group folded from open keeps every row assigned, so an assertion that folding
   * hides rows passes in Chromium and fails under `bun test` for a reason that has
   * nothing to do with this component. Measured both ways on the same code, three
   * rows and two: Chromium goes [3,2] to [1,1] and back to [3,2]; happy-dom stays
   * at [3,2] throughout while reporting `open` false and two groups moved.
   *
   * So the state and the count are asserted everywhere, and what is drawn is
   * asserted where there is a renderer that can draw it. */
  test('folding moves the ones that can and leaves the one that cannot', async () => {
    const element = await withGroups()
    expect(element.foldEveryGroup()).toBe(2)
    expect(element.groups.slice(0, 2).map((group) => group.open)).toEqual([false, false])
    if (hasLayout()) {
      await settled(element)
      expect(element.groups.map(rendered)).toEqual([1, 1, 1])
    }
  })

  test('and unfolding takes them back', async () => {
    const element = await withGroups()
    element.foldEveryGroup()
    expect(element.foldEveryGroup(false)).toBe(2)
    expect(element.groups.slice(0, 2).map((group) => group.open)).toEqual([true, true])
    if (hasLayout()) {
      await settled(element)
      expect(element.groups.map(rendered)).toEqual([2, 2, 1])
    }
  })

  test('asking twice moves nothing the second time', async () => {
    const element = await withGroups()
    expect(element.foldEveryGroup()).toBe(2)
    expect(element.foldEveryGroup()).toBe(0)
  })

  /* The reason this goes through each group's own request rather than writing
     `open`: one refusal refuses one group and the rest still move. */
  test('a group that refuses stays put, and the others do not', async () => {
    const element = await withGroups()
    element.groups[0]?.addEventListener('helix-before-close', (event) => event.preventDefault())
    expect(element.foldEveryGroup()).toBe(1)
    expect(element.groups.slice(0, 2).map((group) => group.open)).toEqual([true, false])
  })
})

/* What this family says where there is nothing in it, and while it is fetching.
 *
 * **The words, the moment they appear and which of the two beats the other
 * belong to `MixinCollection`**, which has its own spec beside it in
 * `helix/core`. What belongs here is the one thing the mixin cannot decide,
 * which is what *this* family counts as having rows: every host passes a
 * different expression, so one that got it wrong says "Nothing to show" over a
 * full set, or says nothing at all over an empty one, with the mixin behaving
 * perfectly either way.
 *
 * Words the mixin does not default to, since it holds "Nothing to show" and
 * "Loading": read against those, the assertion is satisfied by the mixin alone
 * and says nothing about the string reaching it from here. */
describe('an empty feed', () => {
  test('says the consumer’s words where there is nothing in it', async () => {
    const host = await mount(
      '<helix-headless-notifications label="Activity" empty-text="Nothing here yet"></helix-headless-notifications>',
    )
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nothing here yet')
  })

  test('and says it is fetching instead, which beats being empty', async () => {
    /* A set that has not arrived is not a set that is empty, so a reader is
       never told there is nothing while a request is still in flight. */
    const host = await mount(
      '<helix-headless-notifications label="Activity" loading loading-text="Still fetching"></helix-headless-notifications>',
    )
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Still fetching')
    expect(part(host, 'empty')).toBeNull()
  })
})

describe('focus after marking everything read', () => {
  /* The control shows only while something is unread, so the press that works
     takes away the button it was made on. Focus moves to the first row. */
  test('moves to the first row instead of falling to the body', async () => {
    const feed = (await mount(
      `<helix-headless-notifications mark-all>
        <helix-headless-notification dismissible>One</helix-headless-notification>
      </helix-headless-notifications>`,
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    const row = feed.querySelector('helix-headless-notification') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await row.updateComplete
    const button = feed.shadowRoot?.querySelector<HTMLElement>('[part="mark-all"]')
    button?.focus()
    if (feed.shadowRoot?.activeElement !== button) {
      return
    }
    button?.click()
    await feed.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(row.shadowRoot?.activeElement?.getAttribute('part')).toBe('dismiss')
  })
})
