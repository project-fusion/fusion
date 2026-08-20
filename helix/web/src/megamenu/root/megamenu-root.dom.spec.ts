import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Section = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

const section = async (label = 'Products'): Promise<Section> => {
  const host = (await mount(
    `<helix-megamenu label="${label}"><a href="/one">One</a></helix-megamenu>`,
  )) as Section
  await host.updateComplete
  return host
}

const trigger = (host: Section) => part(host, 'trigger') as HTMLElement

describe('a megamenu', () => {
  test('is a disclosure, not a menu, because its contents are destinations', async () => {
    /* `role="menu"` and `menuitem` are for an application's commands: they take
       the arrow keys, announce "menu" to a reader who asked for navigation, and
       put every link inside a role that is not a link. A button saying whether a
       region is showing is the pattern the APG gives for site navigation, and it
       leaves a middle click and a modified click working. */
    const host = await section()
    expect(role(part(host, 'panel') as HTMLElement)).not.toBe('menu')
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
        <helix-megamenu id="a" label="A"><a href="/a">A</a></helix-megamenu>
        <helix-megamenu id="b" label="B"><a href="/b">B</a></helix-megamenu>
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
        <helix-megamenu id="a" label="A"><a href="/a">A</a></helix-megamenu>
        <helix-megamenu id="b" label="B"><a href="/b">B</a></helix-megamenu>
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

if (hasLayout()) {
  describe('a megamenu panel, once there is a page under it', () => {
    const opened = async (): Promise<HTMLElement> => {
      const bar = (await mount(
        `<nav style="padding:40px">
          <helix-megamenu label="Products"><a href="/one">One</a></helix-megamenu>
        </nav>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete
      /* And a frame, because placing it is asynchronous: `computePosition`
         measures the anchor and resolves later, so a panel read on the same
         tick it opened is showing and still sitting where the top layer put it
         before anyone said where it goes. */
      await new Promise((done) => requestAnimationFrame(() => done(null)))
      return host
    }

    test('is in the top layer, so a header cannot clip it', async () => {
      /* A nav bar lives in a header, and a header is exactly the kind of
         ancestor that carries `overflow` or a `transform`: the first clips a
         positioned panel and the second re-anchors it entirely. `popover` is
         what escapes both, and nothing else does. */
      const host = await opened()
      const panel = part(host, 'panel') as HTMLElement
      expect(panel.matches(':popover-open')).toBe(true)
    })

    test('and hangs under the trigger rather than off the page', async () => {
      const host = await opened()
      const panel = (part(host, 'panel') as HTMLElement).getBoundingClientRect()
      const trigger = (part(host, 'trigger') as HTMLElement).getBoundingClientRect()
      expect(panel.width).toBeGreaterThan(0)
      expect(panel.top).toBeGreaterThanOrEqual(trigger.bottom - 1)
    })

    test('the host takes a box, so a nav can measure its marker against it', async () => {
      /* `Navigation` measures against every element assigned to its slot, and
         `display: contents` generates none: a section holding the current page
         would have had the marker measured against a zero rect. `Menu` is
         `display: contents` and is right to be, being a wrapper around somebody
         else's trigger rather than an item in the row. */
      const host = await opened()
      expect(host.getBoundingClientRect().width).toBeGreaterThan(0)
    })
  })
}
