import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Section = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

const section = async (label = 'Products'): Promise<Section> => {
  const host = (await mount(
    `<helix-headless-megamenu label="${label}"><a href="/one">One</a></helix-headless-megamenu>`,
  )) as Section
  await host.updateComplete
  return host
}

const trigger = (host: Section) => part(host, 'trigger') as HTMLElement

/* `PointerEvent` is not in every DOM this runs in, and a plain `Event` carries
   no `pointerType`, which is the whole thing under test. */
const pointer = (type: string, pointerType: string): Event => {
  const event = new Event(type, { bubbles: false, cancelable: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}

const press = (host: Section, pointerType: string, detail = 1): void => {
  if (pointerType !== 'none') {
    host.dispatchEvent(pointer('pointerdown', pointerType))
  }
  trigger(host).dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
}

const settle = (ms: number): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, ms)
  })

describe('a megamenu taking a destination', () => {
  const opened = async (): Promise<Section> => {
    /* Its own row, at a fragment rather than a path. These dispatch a real
       click on it, and a real browser follows that and destroys the page the
       rest of the suite is running in. Under happy-dom nothing navigates and
       the difference never shows up. The handler under test cannot tell the
       two apart, so the fragment costs the spec nothing. */
    const host = (await mount(
      `<helix-headless-megamenu label="Products"><a href="#one">One</a></helix-headless-megamenu>`,
    )) as Section
    await host.updateComplete
    /* Detail 0, which is a keyboard press: a mouse click on the trigger is
       hover's business in the default mode and deliberately does not toggle. */
    press(host, 'none', 0)
    await host.updateComplete
    expect(host.open).toBe(true)
    return host
  }

  const clickItem = async (host: Section, init: MouseEventInit = {}): Promise<void> => {
    const item = host.querySelector('a') as HTMLElement
    /* `composed`, because the listener is on the panel inside the shadow root
       and the row is slotted light DOM: an uncomposed event stops at the host
       and never reaches it. A real click is composed, so leaving it off makes
       every case here pass by never running the handler under test. */
    item.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ...init }),
    )
    await host.updateComplete
  }

  test('shuts, rather than following the reader onto the page they chose', async () => {
    /* Nothing closed it before. With a router that navigates in place the panel
       stayed up, covering the page it had just been asked to go to. */
    const host = await opened()
    await clickItem(host)
    expect(host.open).toBe(false)
  })

  test('and does not pull focus back to the trigger on the way out', async () => {
    // The reader is going somewhere. `close()` would scroll them back to the bar.
    const host = await opened()
    const focused = host.ownerDocument.activeElement
    await clickItem(host)
    expect(host.ownerDocument.activeElement).toBe(focused)
  })

  for (const key of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) {
    test(`stays open under ${key}, because that click opened a tab behind this page`, async () => {
      /* The same position this element already takes on a middle click: the
         reader is still standing in the menu and collecting from it. */
      const host = await opened()
      await clickItem(host, { [key]: true })
      expect(host.open).toBe(true)
    })
  }

  test('stays open on a click that chose nothing', async () => {
    // A heading, a gap between rows, the panel's own padding.
    const host = await opened()
    const heading = host.ownerDocument.createElement('h3')
    host.append(heading)
    heading.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
    )
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('stays open when something already answered the click', async () => {
    /* A consumer calling `preventDefault()` has said the click was theirs, and
       a row that opens a submenu rather than navigating is the case. */
    const host = await opened()
    const item = host.querySelector('a') as HTMLElement
    item.addEventListener('click', (event) => {
      event.preventDefault()
    })
    await clickItem(host)
    expect(host.open).toBe(true)
  })
})

describe('a megamenu opening on hover', () => {
  test('waits for the pointer to mean it, then opens', async () => {
    /* Without the wait, a pointer crossing the bar on its way somewhere else
       opens every panel it passes. */
    const host = await section()
    host.dispatchEvent(pointer('pointerenter', 'mouse'))
    expect(host.open).toBe(false)

    await settle(200)
    await host.updateComplete
    expect(host.open).toBe(true)

    /* Closed before leaving, because `showing` is module state and the only
       thing that clears it is `disconnectedCallback`. A test that leaves its
       panel up hands the next one a page where another megamenu is the one
       showing, which changes the open delay from 120ms to 0 for whoever comes
       next. That is the cross-test coupling that made the touch test below
       fail on a runner and pass on every desk. */
    host.dispatchEvent(pointer('pointerleave', 'mouse'))
    await settle(300)
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('and a touch does not open it, because a tap has to', async () => {
    /* A touch screen synthesises an enter on tap. Acting on it would open the
       panel and let the click behind it close the panel again, so a tap would
       do nothing at all: the commonest way a hover nav is unusable on a phone. */
    const host = await section()
    /* Asserted before acting, so a page left dirty by something else fails
       here saying so, rather than at the assertion below saying a touch
       opened a panel it never touched. */
    expect(host.open).toBe(false)

    /* The `pointerType` a listener on this host actually receives, folded into
       the assertion because bun prints the compared value and nothing else.
       This failed on runners and nowhere else, reporting `expected true to be
       false`, which cannot say whether the guard ran and let a touch through
       or the synthetic `pointerType` did not survive dispatch in that browser.
       `Object.defineProperty` on a plain `Event` is what carries it, and that
       is a browser behavior rather than a component one. */
    let carried: unknown
    host.addEventListener('pointerenter', (event) => {
      carried = (event as PointerEvent).pointerType
    })

    host.dispatchEvent(pointer('pointerenter', 'touch'))
    await settle(200)
    await host.updateComplete
    expect(`open=${host.open} type=${String(carried)}`).toBe('open=false type=touch')

    press(host, 'touch')
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('a keyboard press opens it, having no pointer to hover with', async () => {
    const host = await section()
    press(host, 'none', 0)
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('and the mouse cannot click a hovered panel shut', async () => {
    /* Toggling on a mouse click would close the panel while the pointer is
       still on the trigger, and the pointer would open it again: a trigger that
       flickers and never closes. Hover governs on its own. */
    const host = await section()
    host.dispatchEvent(pointer('pointerenter', 'mouse'))
    await settle(200)
    await host.updateComplete
    expect(host.open).toBe(true)

    press(host, 'mouse')
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('leaving closes it, and later than entering opened it', async () => {
    /* The pointer has to get from the trigger down to the panel, and the line
       it takes is not the straight one. */
    const host = await section()
    host.dispatchEvent(pointer('pointerenter', 'mouse'))
    await settle(200)
    await host.updateComplete
    expect(host.open).toBe(true)

    host.dispatchEvent(pointer('pointerleave', 'mouse'))
    await host.updateComplete
    expect(host.open).toBe(true)

    await settle(300)
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('open-on="click" hears no pointer at all', async () => {
    const host = (await mount(
      `<helix-headless-megamenu open-on="click" label="Products"><a href="/one">One</a></helix-headless-megamenu>`,
    )) as Section
    await host.updateComplete

    host.dispatchEvent(pointer('pointerenter', 'mouse'))
    await settle(200)
    await host.updateComplete
    expect(host.open).toBe(false)

    press(host, 'mouse')
    await host.updateComplete
    expect(host.open).toBe(true)

    /* And there it toggles, because nothing else is going to close it. */
    press(host, 'mouse')
    await host.updateComplete
    expect(host.open).toBe(false)
  })
})

describe('a megamenu', () => {
  test('is a disclosure, not a menu, because its contents are destinations', async () => {
    /* `role="menu"` and `menuitem` are for an application's commands: they take
       the arrow keys, announce "menu" to a reader who asked for navigation, and
       put every link inside a role that is not a link. A button saying whether a
       region is showing is the pattern the APG gives for site navigation, and it
       leaves a middle click and a modified click working. */
    const host = await section()
    expect(role(part(host, 'surface') as HTMLElement)).not.toBe('menu')
    expect(trigger(host).tagName).toBe('BUTTON')
    expect(trigger(host).getAttribute('aria-expanded')).toBe('false')
    expect(trigger(host).getAttribute('aria-controls')).toBe('panel')
  })

  test('the trigger says what the panel is doing', async () => {
    const host = await section()
    trigger(host).click()
    await host.updateComplete
    expect(host.open).toBe(true)
    expect(trigger(host).getAttribute('aria-expanded')).toBe('true')

    trigger(host).click()
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('it renders no links, which is the same rule Navigation follows', async () => {
    // A router renders its own anchor and cannot render one inside this shadow
    // root, so the panel is a slot and its contents are the consumer's.
    const host = await section()
    expect(host.shadowRoot?.querySelector('a')).toBeNull()
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/one')
  })

  test('opening one closes the one already showing', async () => {
    /* A nav bar with two panels down is a nav bar with two panels over the page.
       Coordinated through module scope rather than a parent, so it holds in
       whatever container the consumer used. */
    const bar = (await mount(
      `<nav>
        <helix-headless-megamenu id="a" label="A"><a href="/a">A</a></helix-headless-megamenu>
        <helix-headless-megamenu id="b" label="B"><a href="/b">B</a></helix-headless-megamenu>
      </nav>`,
    )) as HTMLElement
    const first = bar.querySelector('#a') as Section
    const second = bar.querySelector('#b') as Section
    await first.updateComplete
    await second.updateComplete

    ;(part(first, 'trigger') as HTMLElement).click()
    await first.updateComplete
    expect(first.open).toBe(true)
    ;(part(second, 'trigger') as HTMLElement).click()
    await second.updateComplete
    await first.updateComplete
    expect(second.open).toBe(true)
    expect(first.open).toBe(false)
  })

  test('and asks rather than overrules, so a consumer holding one open is heard', async () => {
    // The other closes through `requestOpen`, which announces first.
    const bar = (await mount(
      `<nav>
        <helix-headless-megamenu id="a" label="A"><a href="/a">A</a></helix-headless-megamenu>
        <helix-headless-megamenu id="b" label="B"><a href="/b">B</a></helix-headless-megamenu>
      </nav>`,
    )) as HTMLElement
    const first = bar.querySelector('#a') as Section
    const second = bar.querySelector('#b') as Section
    await first.updateComplete
    await second.updateComplete
    first.addEventListener('helix-close', (event) => event.preventDefault())

    ;(part(first, 'trigger') as HTMLElement).click()
    await first.updateComplete
    ;(part(second, 'trigger') as HTMLElement).click()
    await second.updateComplete
    await first.updateComplete
    expect(first.open).toBe(true)
  })
})

describe('a megamenu whose trigger the consumer slotted', () => {
  const slotted = async (): Promise<Section> => {
    const host = (await mount(
      `<helix-headless-megamenu label="Products"><button slot="trigger" type="button">Products</button><a href="/one">One</a></helix-headless-megamenu>`,
    )) as Section
    await host.updateComplete
    return host
  }

  const own = (host: Section) => host.querySelector('button[slot="trigger"]') as HTMLButtonElement

  /* The reason the slot exists at all in this codebase: no declarative shadow
     DOM ships, so the default trigger's label lives only in the shadow root and
     a server-rendered page has no word in the bar until the element upgrades.
     Slotted content is light DOM and arrives with the HTML. */
  test('the trigger is light DOM, which is the reason to slot one at all', async () => {
    /* Not asserted by looking for the default button's absence: slot fallback
       content lives in the shadow root whether or not the slot is filled, and
       the platform simply stops rendering it.
     
       What matters is that the word is in the consumer's own tree. No
       declarative shadow DOM ships here, so a `label` on the host renders
       nothing until the element upgrades, and a server-rendered navigation had
       a hole where its first item should be. A slotted trigger arrives with the
       HTML.
     
       That the click reaches the panel is not asserted here and cannot be:
       happy-dom does not retarget events through a slot, so a press on this
       button never reaches the `@click` on the slot in the shadow root. It does
       in a browser, which is where that half was measured. */
    const host = await slotted()
    expect(own(host).textContent).toBe('Products')
    expect(own(host).isConnected).toBe(true)
  })

  test('the disclosure state reaches it, which is the whole contract', async () => {
    /* `render` writes `aria-expanded` onto the button it renders itself, and a
       slotted trigger replaces that button. Without this the panel opened and
       closed and nothing announced it: a reader was told the control was a
       plain button forever, and the failure was audible only. */
    const host = await slotted()
    expect(own(host).getAttribute('aria-controls')).toBe('panel')
    expect(own(host).getAttribute('aria-expanded')).toBe('false')

    host.open = true
    await host.updateComplete
    expect(own(host).getAttribute('aria-expanded')).toBe('true')

    host.open = false
    await host.updateComplete
    expect(own(host).getAttribute('aria-expanded')).toBe('false')
  })
})
