import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  at,
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
  role,
} from '@fusion.dev/helix-testing/dom'

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

/* React Aria's `selectedKeys` and `onSelectionChange`: the choices read and
   set in one place, and one event as a reader changes them. */
describe('the checked rows in one place', () => {
  const choices = async (): Promise<Menu & { checkedValues: string[] }> =>
    (await mount(
      `<helix-headless-menu label="View"><button slot="trigger">View</button>
        <helix-headless-menu-item value="wrap" checkable checked>Word wrap</helix-headless-menu-item>
        <helix-headless-menu-item value="small" exclusive checked>Small</helix-headless-menu-item>
        <helix-headless-menu-item value="large" exclusive>Large</helix-headless-menu-item>
        <helix-headless-menu-item value="close">Close</helix-headless-menu-item>
      </helix-headless-menu>`,
    )) as Menu & { checkedValues: string[] }

  test('`checkedValues` reads the checked rows and sets exactly those', async () => {
    const host = await choices()
    expect(host.checkedValues).toEqual(['wrap', 'small'])
    host.checkedValues = ['large']
    const row = (value: string) =>
      host.querySelector(`[value="${value}"]`) as HTMLElement & { checked: boolean }
    expect(row('wrap').checked).toBe(false)
    expect(row('small').checked).toBe(false)
    expect(row('large').checked).toBe(true)
  })

  test('a reader’s choice sends `change` once, and a command sends none', async () => {
    const host = await choices()
    host.open = true
    await host.updateComplete
    let heard = 0
    host.addEventListener('change', () => {
      heard += 1
    })
    const press = async (value: string): Promise<void> => {
      const row = host.querySelector(`[value="${value}"]`) as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      await row.updateComplete
      ;(part(row, 'item') as HTMLElement).click()
      await host.updateComplete
    }
    await press('large')
    expect(heard).toBe(1)
    expect(host.checkedValues).toEqual(['wrap', 'large'])
    host.open = true
    await host.updateComplete
    await press('close')
    expect(heard).toBe(1)
  })
})

/* Popover's two journeys, for a sheet that draws the panel's way in and out. */
describe('entering and exiting', () => {
  test('the panel showing is entering, and one hiding is exiting', async () => {
    const host = await menu()
    host.open = true
    await host.updateComplete
    expect(hasState(host, 'entering')).toBe(true)
    host.open = false
    await host.updateComplete
    expect(hasState(host, 'exiting')).toBe(true)
    expect(hasState(host, 'entering')).toBe(false)
  })
})

/* Data Table's and Web Awesome's status slots: the empty and loading lines
   take content of a page's own, with the text as the fallback. */
describe('the empty and loading lines', () => {
  test('are slots, with the text as their fallback', async () => {
    const empty = (await mount(
      `<helix-headless-menu label="Actions" empty-text="Nothing here"><button slot="trigger">Open</button></helix-headless-menu>`,
    )) as Menu
    empty.open = true
    await empty.updateComplete
    const slot = part(empty, 'empty')?.querySelector('slot[name="empty"]')
    expect(slot?.textContent?.trim()).toBe('Nothing here')
    const busy = (await mount(
      `<helix-headless-menu label="Actions" loading><button slot="trigger">Open</button></helix-headless-menu>`,
    )) as Menu
    busy.open = true
    await busy.updateComplete
    expect(part(busy, 'loading')?.querySelector('slot[name="loading"]')).not.toBeNull()
  })
})

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

  /* The APG's menus, React Aria's and Radix's move focus with the pointer.
     Measured in Chromium before this: in the default drill mode, hovering
     Paste left focus on Cut, so the keys then moved from a row the reader was
     not pointing at. */
  test('a mouse resting on a row moves focus to it', async () => {
    const { host, rows } = await opened()
    press(host, 'ArrowDown')
    expect(focused(at(rows, 0))).toBe(at(rows, 0))
    at(rows, 2).dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, composed: true, pointerType: 'mouse' }),
    )
    expect(focused(at(rows, 0))).toBe(at(rows, 2))
    press(host, 'ArrowUp')
    expect(focused(at(rows, 0))).toBe(at(rows, 1))
  })

  /* Measured in Chromium before this: removing the focused row sent focus to
     the body, and the menu then ignored every key. */
  test('removing the focused row moves focus to the row in its place', async () => {
    const { host, rows } = await opened()
    press(host, 'End')
    expect(focused(at(rows, 0))).toBe(at(rows, 2))
    at(rows, 2).remove()
    await new Promise((resolve) => setTimeout(resolve))
    expect(focused(at(rows, 0))).toBe(at(rows, 1))
    press(host, 'ArrowUp')
    expect(focused(at(rows, 0))).toBe(at(rows, 0))
    /* One from the middle gives focus to the row that took its place. */
    at(rows, 0).remove()
    await new Promise((resolve) => setTimeout(resolve))
    expect(focused(at(rows, 1))).toBe(at(rows, 1))
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

    /* On the top page Left goes nowhere, as the APG's menu button and React
       Aria's Menu have it. It closed the menu. */
    press(host, 'ArrowLeft')
    await host.updateComplete
    expect(host.open).toBe(true)
    expect(focused(share)).toBe(share)
  })

  /* The submenu's caret points left on a right-to-left page, so left is the way
     in there. The right arrow had opened a row whose caret pointed away from
     it, and the left one would not. */
  describe('on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    test('the pair turns round: left goes in and right comes back', async () => {
      document.documentElement.dir = 'rtl'
      const host = await menu(
        `<helix-headless-menu-item value="share">Share
           <helix-headless-menu-item slot="submenu" value="link">Copy link</helix-headless-menu-item>
         </helix-headless-menu-item>
         <helix-headless-menu-item value="rename">Rename</helix-headless-menu-item>`,
      )
      host.open = true
      await host.updateComplete
      const share = host.querySelector('helix-headless-menu-item[value="share"]') as Item
      const link = host.querySelector('helix-headless-menu-item[value="link"]') as Item
      await (share as unknown as { updateComplete: Promise<boolean> }).updateComplete

      press(host, 'ArrowDown')
      press(host, 'ArrowLeft')
      await host.updateComplete
      expect(focused(link)).toBe(link)

      press(host, 'ArrowRight')
      await host.updateComplete
      expect(focused(share)).toBe(share)
    })
  })
})

describe('what a row tells a reader it is', () => {
  const roleOf = async (attrs: string): Promise<string | null> => {
    const host = await menu(`<helix-headless-menu-item ${attrs}>Row</helix-headless-menu-item>`)
    host.open = true
    await host.updateComplete
    const item = host.querySelector('helix-headless-menu-item') as unknown as {
      renderRoot: ShadowRoot
      updateComplete: Promise<boolean>
    }
    await item.updateComplete
    return item.renderRoot.querySelector('[part="item"]')?.getAttribute('role') ?? null
  }

  test('a command, a choice, and one of a set are three different things', async () => {
    expect(await roleOf('value="go"')).toBe('menuitem')
    expect(await roleOf('checkable value="go"')).toBe('menuitemcheckbox')
    /* `menuitemcheckbox` on a run of comparisons tells a reader every one of
       them is independent, which for a set where only one can be on is the
       opposite of true. */
    expect(await roleOf('checkable exclusive value="go"')).toBe('menuitemradio')
  })

  test('and exclusive on its own is one of a set too, since a set is a choice', async () => {
    expect(await roleOf('exclusive value="go"')).toBe('menuitemradio')
  })
})

describe('what a choice does to the menu', () => {
  const opened = async (rows: string, attrs = ''): Promise<{ host: Menu; rows: Item[] }> => {
    const host = (await mount(
      `<helix-headless-menu label="View" ${attrs}><button slot="trigger">View</button>${rows}</helix-headless-menu>`,
    )) as Menu
    host.toggleOpen()
    await host.updateComplete
    const all = [...host.querySelectorAll('helix-headless-menu-item')] as Item[]
    for (const one of all) {
      await (one as unknown as { updateComplete: Promise<boolean> }).updateComplete
    }
    return { host, rows: all }
  }
  const press = async (host: Menu, row: Item, key: string): Promise<void> => {
    row.shadowRoot
      ?.querySelector('[part="item"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
    await null
    await host.updateComplete
  }
  const click = async (host: Menu, row: Item): Promise<void> => {
    row.shadowRoot?.querySelector<HTMLElement>('[part="item"]')?.click()
    await null
    await host.updateComplete
  }

  /* The APG's menu: Space on a menuitemcheckbox or a menuitemradio changes it
     and leaves the menu open, and Enter changes it and closes the menu. */
  test('Space ticks a choice and leaves the menu open, and Enter ticks and closes', async () => {
    const { host, rows } = await opened(
      '<helix-headless-menu-item checkable checked value="grid">Grid</helix-headless-menu-item>',
    )
    const [grid] = rows as [Item]
    await press(host, grid, ' ')
    expect(grid.checked).toBe(false)
    expect(host.open).toBe(true)
    await press(host, grid, 'Enter')
    expect(grid.checked).toBe(true)
    expect(host.open).toBe(false)
  })

  test('and Space on one of a set leaves it open as well', async () => {
    const { host, rows } = await opened(
      `<helix-headless-menu-item exclusive checked value="list">List</helix-headless-menu-item>
       <helix-headless-menu-item exclusive value="grid">Grid</helix-headless-menu-item>`,
    )
    const [list, grid] = rows as [Item, Item]
    await press(host, grid, ' ')
    expect([list.checked, grid.checked]).toEqual([false, true])
    expect(host.open).toBe(true)
  })

  test('Space on a command still closes the menu', async () => {
    const { host, rows } = await opened(
      '<helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>',
    )
    await press(host, rows[0] as Item, ' ')
    expect(host.open).toBe(false)
  })

  /* Ark UI's `closeOnSelect`, on the menu and on a row. */
  test('close-on-select="false" keeps the menu open after any choice', async () => {
    const { host, rows } = await opened(
      `<helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
       <helix-headless-menu-item checkable value="wrap">Wrap</helix-headless-menu-item>`,
      'close-on-select="false"',
    )
    await click(host, rows[0] as Item)
    expect(host.open).toBe(true)
    await press(host, rows[1] as Item, 'Enter')
    expect(host.open).toBe(true)
  })

  test('and a row says so for itself, over the menu', async () => {
    const { host, rows } = await opened(
      `<helix-headless-menu-item close-on-select="false" value="zoom">Zoom in</helix-headless-menu-item>
       <helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>`,
    )
    await click(host, rows[0] as Item)
    expect(host.open).toBe(true)
    await click(host, rows[1] as Item)
    expect(host.open).toBe(false)
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

  /* The menu closes on a choice from a capture listener on itself, which ran
     ahead of the consumer's: it shut before anybody could refuse the choice,
     and the page heard the close before the choice that caused it. */
  test('a choice is heard before the menu closes, and a refused one leaves it open', async () => {
    const el = await menu(`
      <helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
      <helix-headless-menu-item value="keep">Keep</helix-headless-menu-item>`)
    const heard: string[] = []
    el.addEventListener('helix-select', (event) => {
      heard.push(`select ${(event as CustomEvent<{ value: string }>).detail.value}`)
      if ((event as CustomEvent<{ value: string }>).detail.value === 'keep') {
        event.preventDefault()
      }
    })
    el.addEventListener('helix-before-close', () => heard.push('before-close'))
    const press = async (value: string): Promise<void> => {
      el.toggleOpen()
      await el.updateComplete
      el.querySelector(`[value="${value}"]`)
        ?.shadowRoot?.querySelector<HTMLElement>('[part="item"]')
        ?.click()
      await el.updateComplete
    }
    await press('keep')
    expect(el.open).toBe(true)
    el.toggleOpen()
    await el.updateComplete
    heard.length = 0
    await press('copy')
    expect(heard).toEqual(['select copy', 'before-close'])
    expect(el.open).toBe(false)
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

  /* What a consumer's sheet asks to take a divider off a submenu page: the
     divider is their child, and the surface's `data-drilled` is inside a shadow
     root their selectors cannot enter. */
  test('records drilled while a submenu page shows, and not on the menu itself', async () => {
    const host = await deep()
    host.open = true
    await host.updateComplete
    expect(hasState(host, 'drilled')).toBe(false)

    at(host, 'field').select()
    await host.updateComplete
    expect(hasState(host, 'drilled')).toBe(true)
  })

  /* React Aria and Radix name a submenu by the row that opens it. Measured
     before this: a reader drilled into a page was still in a menu named by
     the trigger. */
  test('a submenu page is named by its row, and the top page by its own name again', async () => {
    const host = await deep()
    host.open = true
    await host.updateComplete
    const surface = part(host, 'surface') as HTMLElement
    expect(surface.getAttribute('aria-label')).toBe('Filter')
    expect(surface.hasAttribute('aria-labelledby')).toBe(false)

    at(host, 'field').select()
    await host.updateComplete
    expect(surface.getAttribute('aria-labelledby')).toBe('title')
    const title = host.shadowRoot?.getElementById('title')
    expect(title?.textContent?.trim()).toBe('Disposition')
    expect(surface.contains(title as Node)).toBe(true)

    host.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    )
    await host.updateComplete
    expect(hasState(host, 'drilled')).toBe(false)
    expect(surface.hasAttribute('aria-labelledby')).toBe(false)
  })

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
  test('the way back is named, and exists only once there is somewhere to go back to', async () => {
    /* The header's control is a caret and nothing else, so `backLabel` is its
       whole accessible name: unnamed, a reader drilled two pages in hears
       "button" and has to press it to find out what it does.

       It cannot be asserted on the server, since a menu at its root has no way
       back and whether it is at the root is a fact about children Lit SSR gives
       this element no tree to read.

       A word the component does not default to, `backLabel` holding "Back", so
       that a template writing the literal would not satisfy this. */
    const host = await deep()
    host.setAttribute('back-label', 'Up one')
    host.open = true
    await host.updateComplete
    expect(part(host, 'back')).toBeNull()

    at(host, 'field').select()
    await host.updateComplete
    expect(part(host, 'back')?.getAttribute('aria-label')).toBe('Up one')
  })

  test('the way back is a menu item, since a menu holds menu items and nothing else', async () => {
    const host = await deep()
    host.open = true
    await host.updateComplete
    at(host, 'field').select()
    await host.updateComplete
    const back = part(host, 'back') as HTMLElement
    expect([back.getAttribute('role'), back.getAttribute('tabindex')]).toEqual(['menuitem', '-1'])
  })

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

  test('a section decides its own leading column, apart from the others', async () => {
    const el = await menu(`
      <helix-headless-menu-section label="Show">
        <helix-headless-menu-item value="all"><span slot="start">A</span>All</helix-headless-menu-item>
        <helix-headless-menu-item value="chats">Chats</helix-headless-menu-item>
      </helix-headless-menu-section>
      <helix-headless-menu-section label="Group by">
        <helix-headless-menu-item value="date">Date</helix-headless-menu-item>
      </helix-headless-menu-section>
      <helix-headless-menu-item value="archived">Archived</helix-headless-menu-item>`)
    const [show, group] = [...el.querySelectorAll('helix-headless-menu-section')]
    await (show as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(show && hasState(show as HTMLElement, 'start')).toBe(true)
    expect(group && hasState(group as HTMLElement, 'start')).toBe(false)
    expect(hasState(el, 'start')).toBe(false)
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

/* What a menu says where there is nothing on the page, and while it is
 * fetching.
 *
 * **The words, the moment they appear and which of the two beats the other
 * belong to `MixinCollection`**, which has its own spec beside it in
 * `helix/core`. What belongs here is the one thing the mixin cannot decide,
 * which is what a menu counts as having rows: every host passes a different
 * expression, so one that got it wrong says "Nothing to show" over a full page,
 * or says nothing at all over an empty one, with the mixin behaving perfectly
 * either way.
 *
 * Words the mixin does not default to, since it holds "Nothing to show" and
 * "Loading": read against those, the assertion is satisfied by the mixin alone
 * and says nothing about the string reaching it from here. */
describe('a menu with nothing on its page', () => {
  test('says the consumer’s words once it has looked', async () => {
    const host = (await mount(
      '<helix-headless-menu label="Actions" empty-text="Nothing here yet"><button slot="trigger">Open</button></helix-headless-menu>',
    )) as Menu
    host.open = true
    await host.updateComplete
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nothing here yet')
  })

  test('and says it is fetching instead, which beats being empty', async () => {
    const host = (await mount(
      '<helix-headless-menu label="Actions" loading loading-text="Still fetching"><button slot="trigger">Open</button></helix-headless-menu>',
    )) as Menu
    host.open = true
    await host.updateComplete
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Still fetching')
    expect(part(host, 'empty')).toBeNull()
  })
})

describe('the trigger of a menu', () => {
  const rows = `<helix-headless-menu-item value="rename">Rename</helix-headless-menu-item>
    <helix-headless-menu-item value="duplicate">Duplicate</helix-headless-menu-item>
    <helix-headless-menu-item value="delete">Delete</helix-headless-menu-item>`

  const pressOn = (target: Element, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
    })
    target.dispatchEvent(event)
    return event
  }

  const settleRows = async (host: Menu): Promise<Item[]> => {
    await host.updateComplete
    const items = [...host.querySelectorAll('helix-headless-menu-item')] as Item[]
    for (const one of items) {
      await (one as unknown as { updateComplete: Promise<boolean> }).updateComplete
    }
    await host.updateComplete
    return items
  }

  /* A dialog around the menu closes on Escape, and the trigger is where focus
     rests after every use of the menu. */
  test('lets Escape through while the menu is closed', async () => {
    const host = await menu(rows)
    const trigger = host.querySelector('[slot="trigger"]') as HTMLElement
    let heard = false
    host.parentElement?.addEventListener('keydown', () => {
      heard = true
    })
    const event = pressOn(trigger, 'Escape')
    expect(event.defaultPrevented).toBe(false)
    expect(heard).toBe(true)
  })

  test('opens on Down with the first row, and on Up with the last', async () => {
    const host = await menu(rows)
    const trigger = host.querySelector('[slot="trigger"]') as HTMLElement
    pressOn(trigger, 'ArrowDown')
    let items = await settleRows(host)
    await host.updateComplete
    expect(host.open).toBe(true)
    expect(items[0]?.ownerDocument.activeElement).toBe(at(items, 0))

    host.open = false
    items = await settleRows(host)
    pressOn(trigger, 'ArrowUp')
    items = await settleRows(host)
    await host.updateComplete
    expect(host.open).toBe(true)
    expect(items[0]?.ownerDocument.activeElement).toBe(at(items, 2))
  })

  test('moves to the next row that starts with a typed letter', async () => {
    const host = await menu(rows)
    host.open = true
    const items = await settleRows(host)
    at(items, 0).focus()
    pressOn(host, 'd')
    expect(items[0]?.ownerDocument.activeElement).toBe(at(items, 1))
    pressOn(host, 'd')
    expect(items[0]?.ownerDocument.activeElement).toBe(at(items, 2))
  })

  test('names the surface after the trigger unless a name is given', async () => {
    const host = (await mount(
      `<helix-headless-menu><button slot="trigger">Actions</button>${rows}</helix-headless-menu>`,
    )) as Menu
    const surface = part(host, 'surface') as HTMLElement & { ariaLabelledByElements?: Element[] }
    expect(surface.hasAttribute('aria-label')).toBe(false)
    /* happy-dom implements no element reflection, so the reference is read
       only where the engine has it. */
    if ('ariaLabelledByElements' in surface) {
      expect(surface.ariaLabelledByElements).toEqual([
        host.querySelector('[slot="trigger"]') as Element,
      ])
    }
  })

  test('takes its name from an aria-label on the host', async () => {
    const host = (await mount(
      `<helix-headless-menu aria-label="File actions"><button slot="trigger">Open</button>${rows}</helix-headless-menu>`,
    )) as Menu
    expect(part(host, 'surface')?.getAttribute('aria-label')).toBe('File actions')
  })
})

describe('a menu inside another component', () => {
  test('returns focus to its trigger on Escape', async () => {
    const outer = await mount('<div></div>')
    const root = outer.attachShadow({ mode: 'open' })
    root.innerHTML = `<helix-headless-menu label="Inner"><button slot="trigger">Open</button>
      <helix-headless-menu-item value="one">One</helix-headless-menu-item>
      <helix-headless-menu-item value="two">Two</helix-headless-menu-item></helix-headless-menu>`
    const host = root.querySelector('helix-headless-menu') as Menu
    const trigger = host.querySelector('[slot="trigger"]') as HTMLElement
    host.open = true
    await host.updateComplete
    const items = [...host.querySelectorAll('helix-headless-menu-item')] as Item[]
    for (const one of items) {
      await (one as unknown as { updateComplete: Promise<boolean> }).updateComplete
    }
    at(items, 0).focus()
    expect((at(items, 0) as unknown as { selected: boolean }).selected).toBe(true)
    at(items, 0).dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Escape',
      }),
    )
    await host.updateComplete
    expect(host.open).toBe(false)
    expect(root.activeElement).toBe(trigger)
  })
})

describe('a context menu', () => {
  /* Radix's ContextMenu: the trigger is an area, a right-click over it opens
     the menu where the pointer is, and a plain press does not. */
  const area = async (): Promise<Menu> =>
    (await mount(`<helix-headless-menu context label="File">
      <div slot="trigger" tabindex="0">Area</div>
      <helix-headless-menu-item value="open">Open</helix-headless-menu-item>
    </helix-headless-menu>`)) as Menu

  test('opens on a context menu request over the area, at the pointer', async () => {
    const host = await area()
    const zone = host.querySelector('[slot="trigger"]') as HTMLElement
    zone.click()
    await host.updateComplete
    expect(host.open).toBe(false)
    const ask = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 60,
      composed: true,
    })
    zone.dispatchEvent(ask)
    await host.updateComplete
    expect(ask.defaultPrevented).toBe(true)
    expect(host.open).toBe(true)
    expect(host.shadowRoot?.getElementById('point')?.getAttribute('style')).toContain(
      'translate: 40px 60px',
    )
  })

  test('a context request anywhere else is left to the page', async () => {
    const host = await area()
    const ask = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    host.querySelector('helix-headless-menu-item')?.dispatchEvent(ask)
    expect(ask.defaultPrevented).toBe(false)
  })
})

/* A pointer event on an element in the light DOM, which reaches the host by
   bubbling where happy-dom carries nothing through a slot. */
const pointer = (target: Element, type: string, init: PointerEventInit = {}): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: 30,
      clientY: 50,
      composed: true,
      pointerType: 'touch',
      ...init,
    }),
  )
}
const held = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 560))

describe('a context menu held open', () => {
  /* Radix's ContextMenu opens on its own touch long press, since iOS sends no
     `contextmenu` for one. */
  test('opens on a touch held still on the area, where the touch is', async () => {
    const host = (await mount(`<helix-headless-menu context label="File">
      <div slot="trigger" tabindex="0">Area</div>
      <helix-headless-menu-item value="open">Open</helix-headless-menu-item>
    </helix-headless-menu>`)) as Menu
    const zone = host.querySelector('[slot="trigger"]') as HTMLElement
    pointer(zone, 'pointerdown')
    await held()
    await host.updateComplete
    expect(host.open).toBe(true)
    expect(host.shadowRoot?.getElementById('point')?.getAttribute('style')).toContain(
      'translate: 30px 50px',
    )
    pointer(zone, 'pointerup')
  })

  test('a touch that moves, or a mouse held down, does not open it', async () => {
    const host = (await mount(`<helix-headless-menu context label="File">
      <div slot="trigger" tabindex="0">Area</div>
      <helix-headless-menu-item value="open">Open</helix-headless-menu-item>
    </helix-headless-menu>`)) as Menu
    const zone = host.querySelector('[slot="trigger"]') as HTMLElement
    pointer(zone, 'pointerdown')
    pointer(zone, 'pointermove', { clientX: 30, clientY: 80 })
    pointer(zone, 'pointerdown', { pointerType: 'mouse' })
    await held()
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('opens on Shift+F10 from the area', async () => {
    const host = (await mount(`<helix-headless-menu context label="File">
      <div slot="trigger" tabindex="0">Area</div>
      <helix-headless-menu-item value="open">Open</helix-headless-menu-item>
    </helix-headless-menu>`)) as Menu
    const zone = host.querySelector('[slot="trigger"]') as HTMLElement
    const key = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'F10',
      shiftKey: true,
    })
    zone.dispatchEvent(key)
    await host.updateComplete
    expect(key.defaultPrevented).toBe(true)
    expect(host.open).toBe(true)
  })
})

/* React Aria's menu trigger takes `trigger="longPress"`: a press is the
   trigger's own action and a held one opens the menu. */
describe('a menu opened by a long press', () => {
  const held_ = async (): Promise<{ host: Menu; trigger: HTMLButtonElement }> => {
    const host = (await mount(`<helix-headless-menu label="Undo" open-on="long-press">
      <button slot="trigger">Undo</button>
      <helix-headless-menu-item value="one">Undo typing</helix-headless-menu-item>
    </helix-headless-menu>`)) as Menu
    return { host, trigger: host.querySelector('button') as HTMLButtonElement }
  }

  test('leaves a quick press to the trigger, and opens on a held one without its click', async () => {
    const { host, trigger } = await held_()
    const own: string[] = []
    trigger.addEventListener('click', () => own.push('own'))

    pointer(trigger, 'pointerdown', { pointerType: 'mouse' })
    pointer(trigger, 'pointerup', { pointerType: 'mouse' })
    trigger.click()
    await host.updateComplete
    expect(host.open).toBe(false)
    expect(own).toEqual(['own'])

    pointer(trigger, 'pointerdown', { pointerType: 'mouse' })
    await held()
    await host.updateComplete
    expect(host.open).toBe(true)
    pointer(trigger, 'pointerup', { pointerType: 'mouse' })
    /* The click the release makes is the long press's. */
    trigger.click()
    await host.updateComplete
    expect(host.open).toBe(true)
    expect(own).toEqual(['own'])
  })

  test('opens on Alt+Down from the keyboard, which a plain arrow does not', async () => {
    const { host, trigger } = await held_()
    const key = (altKey: boolean) =>
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { altKey, bubbles: true, cancelable: true, key: 'ArrowDown' }),
      )
    key(false)
    await host.updateComplete
    expect(host.open).toBe(false)
    key(true)
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('describes a plain trigger once a reader reaches it, by the host and its words', async () => {
    const { host, trigger } = await held_()
    let described: Element[] | null = null
    Object.defineProperty(trigger, 'ariaDescribedByElements', {
      configurable: true,
      get: () => described,
      set: (value: Element[] | null) => {
        described = value
      },
    })
    await host.updateComplete
    expect(described).toBeNull()
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    expect(described?.[0] === host).toBe(true)
    expect((host as unknown as { internals: ElementInternals }).internals.ariaLabel).toContain(
      'Alt+Down',
    )
  })
})

/* React Aria's SubmenuTrigger and Radix's Sub open a submenu beside its row. */
describe('a menu with flyout submenus', () => {
  type Row = HTMLElement & {
    expanded: boolean
    onPage: boolean
    updateComplete: Promise<boolean>
  }
  const flyout = async (): Promise<Menu> => {
    const host = (await mount(`<helix-headless-menu label="Actions" submenus="flyout">
      <button slot="trigger">Open</button>
      <helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
      <helix-headless-menu-item value="share">Share
        <helix-headless-menu-item slot="submenu" value="mail">Mail</helix-headless-menu-item>
        <helix-headless-menu-item slot="submenu" value="sms">SMS</helix-headless-menu-item>
      </helix-headless-menu-item>
    </helix-headless-menu>`)) as Menu
    host.open = true
    await host.updateComplete
    await settled(host)
    return host
  }
  const settled = async (host: Menu): Promise<void> => {
    for (let round = 0; round < 3; round += 1) {
      await host.updateComplete
      for (const one of host.querySelectorAll('helix-headless-menu-item')) {
        await (one as Row).updateComplete
      }
      await new Promise((done) => setTimeout(done, 0))
    }
  }
  const rowOf = (host: Menu, value: string): Row => host.querySelector(`[value="${value}"]`) as Row
  const key = (host: Menu, name: string): void => {
    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: name }))
  }
  const focusedValue = (host: Menu): string | null => {
    let at: Element | null = host.ownerDocument.activeElement
    while (at?.shadowRoot?.activeElement) {
      at = at.shadowRoot.activeElement
    }
    const root = at?.getRootNode()
    return root instanceof ShadowRoot ? root.host.getAttribute('value') : null
  }

  test('keeps the top page showing, with no way back drawn', async () => {
    const host = await flyout()
    expect(rowOf(host, 'copy').onPage).toBe(true)
    expect(rowOf(host, 'mail').onPage).toBe(false)
    key(host, 'ArrowDown')
    key(host, 'ArrowDown')
    key(host, 'ArrowRight')
    await settled(host)
    expect(rowOf(host, 'copy').onPage).toBe(true)
    expect(rowOf(host, 'mail').onPage).toBe(true)
    expect(part(host, 'back')).toBeNull()
    expect(hasState(host, 'drilled')).toBe(false)
  })

  test('Right opens a row’s submenu beside it on its first row, and Left closes it back to the row', async () => {
    const host = await flyout()
    key(host, 'ArrowDown')
    key(host, 'ArrowDown')
    expect(focusedValue(host)).toBe('share')
    const share = rowOf(host, 'share')
    expect(part(share, 'item')?.getAttribute('aria-expanded')).toBe('false')
    key(host, 'ArrowRight')
    await settled(host)
    expect(share.expanded).toBe(true)
    expect(part(share, 'item')?.getAttribute('aria-expanded')).toBe('true')
    const panel = part(share, 'surface')
    expect(panel?.getAttribute('role')).toBe('menu')
    expect(panel?.hasAttribute('hidden')).toBe(false)
    expect(focusedValue(host)).toBe('mail')
    key(host, 'ArrowDown')
    expect(focusedValue(host)).toBe('sms')
    key(host, 'ArrowLeft')
    await settled(host)
    expect(share.expanded).toBe(false)
    expect(focusedValue(host)).toBe('share')
    expect(host.open).toBe(true)
  })

  test('Escape in a submenu closes it alone, and on the top page closes the menu', async () => {
    const host = await flyout()
    key(host, 'ArrowDown')
    key(host, 'ArrowDown')
    key(host, 'ArrowRight')
    await settled(host)
    key(host, 'Escape')
    await settled(host)
    expect(rowOf(host, 'share').expanded).toBe(false)
    expect(host.open).toBe(true)
    key(host, 'Escape')
    await settled(host)
    expect(host.open).toBe(false)
  })

  test('a row of a submenu is chosen as a row of the top page is', async () => {
    const host = await flyout()
    key(host, 'ArrowDown')
    key(host, 'ArrowDown')
    key(host, 'ArrowRight')
    await settled(host)
    const chosen: string[] = []
    host.addEventListener('helix-select', (event) => {
      chosen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    ;(part(rowOf(host, 'sms'), 'item') as HTMLElement).click()
    await settled(host)
    expect(chosen).toEqual(['sms'])
    expect(host.open).toBe(false)
  })
})

/* The side the panel landed on was a data attribute inside the shadow root,
   where no sheet outside can read it. Popover and Select say it as a state. */
if (hasLayout()) {
  describe('the side the menu opens on', () => {
    test('is a state on the host', async () => {
      const host = await menu()
      host.open = true
      await host.updateComplete
      for (let attempt = 0; attempt < 50 && !hasState(host, 'placed-bottom'); attempt += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      expect(hasState(host, 'placed-bottom')).toBe(true)
      expect(hasState(host, 'placed-top')).toBe(false)
    })
  })
}
