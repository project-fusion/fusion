import { beforeAll, describe, expect, test } from 'bun:test'
import { at, hasState, mount, registerDom, role } from '@fusion.dev/helix-testing/dom'

/* happy-dom before the element, and the import dynamic for that reason:
   `@customElement` runs on import, static imports are hoisted, and an element
   registered against the `customElements` happy-dom then replaces never
   upgrades. It mounts as a bare `HTMLElement` and every read comes back
   undefined, which a spec written defensively reports as a pass. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Menu = HTMLElement & {
  open: boolean
  toggleOpen(): boolean
  updateComplete: Promise<boolean>
}
type Item = HTMLElement & { checked: boolean; disabled: boolean; value: string }

const menu = async (
  rows = '<helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>',
): Promise<Menu> =>
  (await mount(
    `<helix-headless-menu label="Actions"><button slot="trigger">Open</button>${rows}</helix-headless-menu>`,
  )) as Menu

describe('moving through a menu with the keyboard', () => {
  /* The arrow keys are a shared controller's business, and these say what the
     menu asks of it. */
  const opened = async (): Promise<{ host: Menu; rows: Item[] }> => {
    const host = await menu(
      `<helix-headless-menu-item value="cut">Cut</helix-headless-menu-item>
       <helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
       <helix-headless-menu-item value="paste">Paste</helix-headless-menu-item>`,
    )
    host.open = true
    await host.updateComplete
    const rows = [...host.querySelectorAll('helix-headless-menu-item')] as Item[]
    for (const one of rows) {
      await (one as unknown as { updateComplete: Promise<boolean> }).updateComplete
    }
    return { host, rows }
  }

  const press = (host: Menu, key: string) => {
    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
  }

  /* Focus lands on a control inside the row, and the platform retargets it: from
     the document, `activeElement` is the row itself. Asked of the row's own
     document rather than the global one, which several spec files replace. */
  const focused = (row: Item) => row.ownerDocument.activeElement

  test('Down and Up walk the rows, and the ends join up', async () => {
    const { host, rows } = await opened()
    press(host, 'ArrowDown')
    expect(focused(at(rows, 0))).toBe(at(rows, 0))

    press(host, 'ArrowDown')
    expect(focused(at(rows, 0))).toBe(at(rows, 1))

    press(host, 'ArrowUp')
    expect(focused(at(rows, 0))).toBe(at(rows, 0))

    /* Back off the top lands on the bottom. */
    press(host, 'ArrowUp')
    expect(focused(at(rows, 0))).toBe(at(rows, 2))
  })

  test('Home and End go to the ends', async () => {
    const { host, rows } = await opened()
    press(host, 'End')
    expect(focused(at(rows, 0))).toBe(at(rows, 2))

    press(host, 'Home')
    expect(focused(at(rows, 0))).toBe(at(rows, 0))
  })

  test('and arriving at a row does not choose it', async () => {
    /* The difference between a menu and a radio group, and the reason the
       controller takes `selects`. A reader arrowing past Delete has not asked
       for Delete. */
    const { host } = await opened()
    const chosen: string[] = []
    host.addEventListener('helix-select', (event) => {
      chosen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    press(host, 'ArrowDown')
    press(host, 'ArrowDown')
    press(host, 'End')
    expect(chosen).toEqual([])
  })

  test('the horizontal pair is the submenu, not another way to move', async () => {
    /* Reserved rather than released: right goes in and left comes back, which
       are the platform's bindings for a menu that drills. Were the shared
       controller to take them first, a submenu could not be opened from the
       keyboard at all. */
    const host = await menu(
      `<helix-headless-menu-item value="share">Share
         <helix-headless-menu-item slot="submenu" value="link">Copy link</helix-headless-menu-item>
       </helix-headless-menu-item>
       <helix-headless-menu-item value="rename">Rename</helix-headless-menu-item>`,
    )
    host.open = true
    await host.updateComplete
    /* By value, not by index. `querySelectorAll` returns the submenu's own row
       too, nested inside the row that opens it, so the second element in
       document order is the child rather than the next row along: an assertion
       written against `rows[1]` is asking about the wrong element and reads a
       correct submenu entry as a failure. */
    const share = host.querySelector('helix-headless-menu-item[value="share"]') as Item
    const link = host.querySelector('helix-headless-menu-item[value="link"]') as Item
    await (share as unknown as { updateComplete: Promise<boolean> }).updateComplete

    press(host, 'ArrowDown')
    expect(focused(share)).toBe(share)

    press(host, 'ArrowRight')
    await host.updateComplete
    /* Inside, and on the first row of the page just opened. */
    expect(focused(link)).toBe(link)

    /* And back out again, which is the other half of the pair. */
    press(host, 'ArrowLeft')
    await host.updateComplete
    expect(focused(share)).toBe(share)
  })
})

describe('a menu row that navigates', () => {
  const row = async (attrs: string) => {
    const host = await menu(`<helix-headless-menu-item ${attrs}>Docs</helix-headless-menu-item>`)
    host.open = true
    await host.updateComplete
    const item = host.querySelector('helix-headless-menu-item') as unknown as Item & {
      renderRoot: ShadowRoot
      updateComplete: Promise<boolean>
    }
    await item.updateComplete
    return item.renderRoot.querySelector('[part="item"]') as HTMLElement
  }

  /* A fragment, not a path. These specs also run in a real browser through
     `bun run specs:browser`, where pressing Space really does click the anchor
     and a path really does navigate, taking the whole browser run down. A
     fragment proves the same press and goes nowhere. */
  test('the anchor is the row, carrying the role and the tab stop', async () => {
    /* Not an anchor inside the row. A `menuitem` cannot contain a link:
       measured in Chromium, the row loses its accessible name entirely and the
       link is exposed as a child of it. `Tree.Item` makes the same move for
       `treeitem`, and `Option` cannot, because a listbox has to say which option
       is current with `aria-activedescendant` and that reference reaches only
       the option's host. */
    const linked = await row('href="#docs" value="docs"')
    expect(linked.localName).toBe('a')
    expect(linked.getAttribute('role')).toBe('menuitem')
    expect(linked.getAttribute('tabindex')).toBe('-1')
    expect(linked.querySelector('a')).toBeNull()
  })

  test('and a row with no href is still a div', async () => {
    const plain = await row('value="copy"')
    expect(plain.localName).toBe('div')
    expect(plain.getAttribute('role')).toBe('menuitem')
  })

  test('a disabled row renders no href, since a disabled anchor is not a thing', async () => {
    // `aria-disabled` alone would announce it as unavailable and navigate anyway.
    const off = await row('disabled href="#docs" value="docs"')
    expect(off.localName).toBe('div')
    expect(off.hasAttribute('href')).toBe(false)
  })

  test('Enter goes back to the browser, and Space presses the row', async () => {
    /* An anchor answers Enter itself, so preventing it would mean re-issuing
       the navigation by hand. It ignores Space, so that one is ours. */
    const linked = await row('href="#docs" value="docs"')
    const press = (key: string) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
      linked.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(press('Enter')).toBe(false)
    expect(press(' ')).toBe(true)

    const plain = await row('value="copy"')
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
    plain.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})

describe('menu', () => {
  test('the menu role is on the surface, not on the host', async () => {
    // The host holds the trigger as well as the panel, so it is not the menu:
    // it is the thing a menu hangs off. A role on it would tell a screen reader
    // the button was one of the commands.
    const el = await menu()
    expect(el.hasAttribute('role')).toBe(false)
    expect(role(el)).toBeNull()
    expect(el.shadowRoot?.querySelector('[part="surface"]')?.getAttribute('role')).toBe('menu')
  })

  test('asking to open is announced first, so it can be refused', async () => {
    // Through `toggleOpen`, which is the request. Assigning `open` is the
    // controlled path and is the consumer stating the answer rather than asking
    // for it, so there is nothing there to refuse.
    const el = await menu()
    el.addEventListener('helix-before-open', (event) => event.preventDefault())
    el.toggleOpen()
    await el.updateComplete
    expect(hasState(el, 'open')).toBe(false)
  })

  test('a consumer that states open is obeyed rather than asked', async () => {
    const el = await menu()
    el.open = true
    await el.updateComplete
    expect(hasState(el, 'open')).toBe(true)
  })

  test('a row announces its choice rather than acting on it', async () => {
    // The row dispatches and the consumer decides. A row that closed the menu
    // itself would be a second source of truth for whether it is open.
    const el = await menu()
    const item = el.querySelector('helix-headless-menu-item') as Item
    let chosen = ''
    el.addEventListener('helix-select', (event) => {
      chosen = (event as CustomEvent<{ value: string }>).detail.value
    })
    // The row inside the shadow root, because that is what carries the handler.
    // A click on the host is a click on a wrapper and reaches nothing.
    item.shadowRoot?.querySelector<HTMLElement>('[part="item"]')?.click()
    expect(chosen).toBe('copy')
  })

  test('a disabled row says nothing at all', async () => {
    const el = await menu(
      '<helix-headless-menu-item disabled value="copy">Copy</helix-headless-menu-item>',
    )
    const item = el.querySelector('helix-headless-menu-item') as Item
    let heard = false
    el.addEventListener('helix-select', () => {
      heard = true
    })
    item.shadowRoot?.querySelector<HTMLElement>('[part="item"]')?.click()
    expect(heard).toBe(false)
  })

  test('a checkable row is a checkbox to a screen reader, not a command', async () => {
    const el = await menu(
      '<helix-headless-menu-item checkable value="wrap">Wrap</helix-headless-menu-item>',
    )
    const item = el.querySelector('helix-headless-menu-item') as Item
    const row = item.shadowRoot?.querySelector('[part="item"]')
    expect(row?.getAttribute('role')).toBe('menuitemcheckbox')
    expect(row?.getAttribute('aria-checked')).toBe('false')
  })
})

describe('menu submenus, coming and going', () => {
  const nested = async (): Promise<Menu> =>
    (await mount(
      `<helix-headless-menu label="Settings"><button slot="trigger">Open</button>
        <helix-headless-menu-item value="environment">Environment
          <helix-headless-menu-item slot="submenu" value="html">HTML</helix-headless-menu-item>
          <helix-headless-menu-item slot="submenu" value="tsx">TSX</helix-headless-menu-item>
        </helix-headless-menu-item>
      </helix-headless-menu>`,
    )) as Menu

  const row = (host: Menu): HTMLElement & { hasSubmenu: boolean; showingSubmenu: boolean } =>
    host.querySelector('helix-headless-menu-item') as HTMLElement & {
      hasSubmenu: boolean
      showingSubmenu: boolean
    }

  test('a row with rows under it says so', async () => {
    const host = await nested()
    await (row(host) as unknown as Menu).updateComplete
    expect(row(host).hasSubmenu).toBe(true)
  })

  /* **Drilling in and back out cannot be asserted here, and a spec that says it
     can is worse than none.** The fault it would cover is that the row renders a
     `slot[name="submenu"]` in two template branches, so moving between them
     makes Lit build a new slot and discard the old one, and the discarded slot
     fires `slotchange` on its way out with nothing assigned. A listener bound
     once at first render is still on that slot and sets `hasSubmenu` false for
     good: every caret goes and every row stops opening.
   *
     Written as a spec it passes against the broken build as readily as the
     fixed one, measured both ways, because happy-dom neither rebuilds the slot
     nor fires the departing `slotchange`. Bind the listener in the template,
     and check the behavior in a browser. */

  /* Which row holds which page is not that. It is properties the menu sets on
     every update, so it reads the same here as in a browser, and the failure it
     covers was invisible until something wanted three levels: the top row was
     neither on a page nor the page, rendered nothing, and took the slot the
     middle row lived in. The reader got a header over an empty panel. */
  const deep = async (): Promise<Menu> =>
    (await mount(
      `<helix-headless-menu label="Filter"><button slot="trigger">Open</button>
        <helix-headless-menu-item value="field">Disposition
          <helix-headless-menu-item slot="submenu" value="comparison">is any of
            <helix-headless-menu-item slot="submenu" value="any">is any of</helix-headless-menu-item>
            <helix-headless-menu-item slot="submenu" value="none">is none of</helix-headless-menu-item>
          </helix-headless-menu-item>
          <helix-headless-menu-item slot="submenu" value="refunded">Refunded</helix-headless-menu-item>
        </helix-headless-menu-item>
      </helix-headless-menu>`,
    )) as Menu

  interface Row extends HTMLElement {
    hasSubmenu: boolean
    onPage: boolean
    select: () => void
    showingSubmenu: boolean
    updateComplete: Promise<unknown>
  }

  const at = (host: Menu, value: string): Row => host.querySelector(`[value="${value}"]`) as Row

  /**
   * The `slotchange` a browser fires and this harness does not.
   *
   * A row that is not on the page renders nothing, so a nested one has no slot
   * until the reader drills in, and it learns it has a submenu from that slot's
   * first `slotchange`. happy-dom never fires it, so the row goes on believing
   * it has no submenu and choosing it closes the menu rather than opening a
   * page. Handing it the event puts the harness where a browser already is, and
   * leaves the thing under test, which is the marking, untouched.
   */
  const settleSubmenu = async (row: Row): Promise<void> => {
    row.shadowRoot?.querySelector('slot[name="submenu"]')?.dispatchEvent(new Event('slotchange'))
    await row.updateComplete
  }

  test('every row on the way to the open page keeps its own slot', async () => {
    const host = await deep()
    // `open`, which is how every other block here opens a menu.
    host.open = true
    await host.updateComplete

    at(host, 'field').select()
    await host.updateComplete
    expect(at(host, 'field').showingSubmenu).toBe(true)
    expect(at(host, 'comparison').onPage).toBe(true)
    expect(at(host, 'refunded').onPage).toBe(true)
    expect(at(host, 'any').onPage).toBe(false)

    await settleSubmenu(at(host, 'comparison'))
    at(host, 'comparison').select()
    await host.updateComplete
    // The one the fix is about: two levels up, and still holding a slot.
    expect(at(host, 'field').showingSubmenu).toBe(true)
    expect(at(host, 'comparison').showingSubmenu).toBe(true)
    expect(at(host, 'any').onPage).toBe(true)
    expect(at(host, 'none').onPage).toBe(true)
    expect(at(host, 'refunded').onPage).toBe(false)
  })

  /* A row takes itself off a page it is not on; anything else slotted into a
     submenu has no such idea, and painted on the page above. Measured before the
     fix: a `Divider` inside a submenu drew its rule between two rows of the
     parent menu, which is `Menu`'s own `::slotted` rule one shadow root out of
     reach. Structural rather than measured, so it reads the same here as in a
     browser: the slot a row keeps while its own page is showing is inside a
     hidden box, and the one it renders *as* the page is not. */
  test('a submenu keeps its slot on the page above, and paints nothing there', async () => {
    const host = await deep()
    host.open = true
    await host.updateComplete
    const top = at(host, 'field')
    await top.updateComplete

    const held = top.shadowRoot?.querySelector('[hidden] slot[name="submenu"]')
    expect(held).not.toBeNull()

    top.select()
    await host.updateComplete
    await top.updateComplete
    // Showing its own page now, so the slot is what it draws rather than a store.
    expect(top.shadowRoot?.querySelector('[hidden] slot[name="submenu"]')).toBeNull()
    expect(top.shadowRoot?.querySelector('slot[name="submenu"]')).not.toBeNull()
  })
})

/* Which columns a page reserves is the menu's to answer, because no row can: a
   row knows about its own slots and nothing about its neighbors. The styled tier
   turns these two states into widths; this tier ships no stylesheet and only has
   to get the fact right. */
describe('the columns either side of a label', () => {
  test('a page of plain rows reserves neither', async () => {
    const el = await menu(`
      <helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
      <helix-headless-menu-item value="cut">Cut</helix-headless-menu-item>`)
    expect(hasState(el, 'start')).toBe(false)
    expect(hasState(el, 'mark')).toBe(false)
  })

  test('one row with a mark before its label holds the column open for all of them', async () => {
    const el = await menu(`
      <helix-headless-menu-item value="copy"><span slot="start">C</span>Copy</helix-headless-menu-item>
      <helix-headless-menu-item value="cut">Cut</helix-headless-menu-item>`)
    expect(hasState(el, 'start')).toBe(true)
  })

  /* Checkable and not checked, which is the case an empty box used to cover: a
     filter page whose labels step sideways as the reader ticks their way down it
     is the whole reason the column is reserved rather than drawn per row. */
  test('a row that can be ticked reserves the trailing column while it is not', async () => {
    const el = await menu(
      '<helix-headless-menu-item value="wrap" checkable>Wrap</helix-headless-menu-item>',
    )
    expect(hasState(el, 'mark')).toBe(true)
  })

  test('and so does a row that opens a page', async () => {
    const el = await menu(`
      <helix-headless-menu-item value="more">More
        <helix-headless-menu-item slot="submenu" value="deep">Deep</helix-headless-menu-item>
      </helix-headless-menu-item>`)
    expect(hasState(el, 'mark')).toBe(true)
  })
})
