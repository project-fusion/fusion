import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, label, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const markup = `
  <helix-headless-tabs default-active="one">
    <helix-headless-tab value="one">One</helix-headless-tab>
    <helix-headless-tab value="two">Two</helix-headless-tab>
    <helix-headless-tab disabled value="three">Three</helix-headless-tab>
    <helix-headless-tab-panel slot="panels" value="one">First</helix-headless-tab-panel>
    <helix-headless-tab-panel slot="panels" value="two">Second</helix-headless-tab-panel>
    <helix-headless-tab-panel slot="panels" value="three">Third</helix-headless-tab-panel>
  </helix-headless-tabs>`

const tabs = (host: HTMLElement) => [...host.querySelectorAll('helix-headless-tab')] as Updatable[]
const panels = (host: HTMLElement) =>
  [...host.querySelectorAll('helix-headless-tab-panel')] as Updatable[]

describe('tabs selection', () => {
  test('shows the panel matching the selected tab', async () => {
    const host = await mount(markup)
    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(true)
    expect(hasState(panels(host)[0] as Element, 'selected')).toBe(true)
    expect(hasState(panels(host)[1] as Element, 'selected')).toBe(false)
  })

  test('choosing a tab moves the panel with it', async () => {
    const host = (await mount(markup)) as Updatable
    const second = tabs(host)[1] as Updatable & { select(): void }
    second.select()
    await host.updateComplete

    expect(hasState(second, 'selected')).toBe(true)
    expect(hasState(panels(host)[1] as Element, 'selected')).toBe(true)
    expect(hasState(panels(host)[0] as Element, 'selected')).toBe(false)
  })

  test('and refusing the tab`s own event leaves the strip where it was', async () => {
    /* `helix-select` is cancelable and the tab documents it as refusable. This
       element is the one thing that acts on it, so a refusal it ignored was a
       veto that did nothing anywhere: valid code, no error, and the selection
       happening regardless. Bound on the tab, which is the position that can
       refuse a bubbling event before the strip sees it. */
    const host = (await mount(markup)) as Updatable & { active: string }
    const second = tabs(host)[1] as Updatable & { select(): void }
    second.addEventListener('helix-select', (event) => event.preventDefault())
    second.select()
    await host.updateComplete

    expect(host.active).toBe('one')
    expect(hasState(second, 'selected')).toBe(false)
    expect(hasState(panels(host)[0] as Element, 'selected')).toBe(true)
  })

  test('a disabled tab cannot be chosen', async () => {
    const host = (await mount(markup)) as Updatable
    const third = tabs(host)[2] as Updatable & { select(): void }
    third.select()
    await host.updateComplete
    expect(hasState(third, 'selected')).toBe(false)
  })

  test('the panel is named by its tab, since an IDREF cannot reach one', async () => {
    /* An IDREF resolves only in the tree it is written in, and a tab's control
       is inside its own shadow root, which no reference from the light DOM can
       reach. A name is the one form that crosses, so the root reads the tab's
       words and hands them to the panel, whose host is the `tabpanel`. The tab
       writes no IDREF `aria-controls`: it is an element reference instead. */
    const host = await mount(markup)
    const tab = part(tabs(host)[0] as HTMLElement, 'tab')
    expect(label(panels(host)[0] as HTMLElement)).toBe('One')
    expect(tab?.hasAttribute('aria-controls')).toBe(false)
    expect(part(panels(host)[0] as HTMLElement, 'panel')?.hasAttribute('aria-labelledby')).toBe(
      false,
    )
  })

  test('content stays mounted when its tab is not the current one', async () => {
    // So anything typed into a panel is still there on return, and so the
    // content is in the markup for a crawler whichever tab is open.
    const host = await mount(markup)
    expect(host.textContent).toContain('Second')
  })
})

describe('tabs keyboard', () => {
  /* From a named element, not from "whichever is selected".
   *
   * In `manual` focus and selection diverge after the first press, so a helper
   * that presses from the selection re-runs the first press forever, and the
   * manual-mode spec below passes without touching what it is about. */
  const pressFrom = (from: HTMLElement, key: string) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
    from.dispatchEvent(event)
    return event
  }
  const press = (host: HTMLElement, key: string) =>
    pressFrom(tabs(host).find((tab) => hasState(tab, 'selected')) as HTMLElement, key)

  test('arrows move selection and wrap past the ends', async () => {
    const host = (await mount(markup)) as Updatable
    press(host, 'ArrowRight')
    await host.updateComplete
    expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(true)

    // Three is disabled, so right from two wraps to one rather than stopping.
    press(host, 'ArrowRight')
    await host.updateComplete
    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(true)
  })

  /* The strip starts on the right of a right-to-left page, so the left arrow
     points at the next tab. The shared controller asks the host which way the
     line runs, so this is every set built on it, and Tabs is the one a reader
     meets first. */
  test('on a right-to-left page the left arrow is the next tab', async () => {
    document.documentElement.dir = 'rtl'
    try {
      /* From the middle of three, so neither press can arrive by wrapping. */
      const host = (await mount(
        markup.replace('default-active="one"', 'default-active="two"').replace(' disabled', ''),
      )) as Updatable
      press(host, 'ArrowLeft')
      await host.updateComplete
      expect(hasState(tabs(host)[2] as Element, 'selected')).toBe(true)
      press(host, 'ArrowRight')
      await host.updateComplete
      expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(true)
    } finally {
      document.documentElement.removeAttribute('dir')
    }
  })

  test('both axes move the row, not only the one it is laid out on', async () => {
    /* `KeyboardNavigationController` binds both axes on purpose: a reader who
       guesses the wrong axis gets nothing, and `variant` is presentation. Down
       reads as Right, Up as Left. */
    const host = (await mount(markup)) as Updatable
    press(host, 'ArrowDown')
    await host.updateComplete
    expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(true)

    press(host, 'ArrowUp')
    await host.updateComplete
    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(true)
  })

  test('Home and End reach the ends', async () => {
    const host = (await mount(markup)) as Updatable
    press(host, 'End')
    await host.updateComplete
    expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(true)

    press(host, 'Home')
    await host.updateComplete
    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(true)
  })

  test('manual holds selection until the tab is chosen', async () => {
    const host = (await mount(
      markup.replace('<helix-headless-tabs ', '<helix-headless-tabs manual '),
    )) as Updatable
    press(host, 'ArrowRight')
    await host.updateComplete
    // Focus moved; selection did not.
    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(true)
  })

  test('manual can be traversed, because a move starts from focus', async () => {
    /* Two presses from where focus actually is. Starting from the selection
       instead, the second press would compute from tab one again and land on
       tab two a second time, so the set past the first neighbor is
       unreachable by keyboard. */
    const host = (await mount(
      markup.replace('<helix-headless-tabs ', '<helix-headless-tabs manual '),
    )) as Updatable
    /* Focus is what moves in `manual`, and selection is what does not, so the
       assertion has to be on focus. Recorded rather than read back from
       `activeElement`, which cannot see into a shadow root here. */
    const reached: string[] = []
    for (const tab of tabs(host)) {
      ;(tab as unknown as { focusItem: () => void }).focusItem = () => {
        reached.push(tab.getAttribute('value') ?? '')
      }
    }

    pressFrom(tabs(host)[0] as HTMLElement, 'ArrowRight')
    await host.updateComplete
    pressFrom(tabs(host)[1] as HTMLElement, 'ArrowRight')
    await host.updateComplete

    // Two moves, and the second wrapped past the disabled third.
    expect(reached).toEqual(['two', 'one'])
    // And nothing was chosen on the way.
    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(true)
    expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(false)
  })

  test('an arrow pressed while reading a panel leaves the tabs alone', async () => {
    /* A panel is its own tab stop and the listener is on the whole component,
       so a press from inside one would move the row out from under the reader.
       `origin: 'focus'` is what makes it identifiable: the press came from no
       tab, so there is nothing to move. */
    const host = (await mount(markup)) as Updatable
    const event = pressFrom(panels(host)[0] as HTMLElement, 'ArrowRight')
    await host.updateComplete

    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(true)
    expect(event.defaultPrevented).toBe(false)
  })

  test('an unrelated key is left to the page', async () => {
    const host = await mount(markup)
    expect(press(host, 'PageDown').defaultPrevented).toBe(false)
  })
})

describe('tabs selection can be refused', () => {
  test('a listener that refuses keeps the tab where it was', async () => {
    /* Whether a selection can be refused should not depend on which component
       is being looked at: `Radio.Group` two folders away can be. */
    const host = (await mount(markup)) as Updatable & { active: string }
    await host.updateComplete
    const started = host.active

    host.addEventListener('helix-before-activate', (event) => event.preventDefault())
    const other = [...host.querySelectorAll('helix-headless-tab')].find(
      (tab) => tab.getAttribute('value') !== started,
    ) as HTMLElement
    other.dispatchEvent(
      new CustomEvent('helix-select', {
        bubbles: true,
        composed: true,
        detail: { value: other.getAttribute('value') },
      }),
    )
    await host.updateComplete

    expect(host.active).toBe(started)
  })

  test('a disabled first tab is not made current by default', async () => {
    // A fallback of `?? tabs[0]` takes whatever is first, so a set opening on
    // a disabled tab shows it as current and brings its panel with it.
    document.body.innerHTML = `<helix-headless-tabs label="Set">
      <helix-headless-tab disabled value="a">A</helix-headless-tab>
      <helix-headless-tab value="b">B</helix-headless-tab>
      <helix-headless-tab-panel slot="panels" value="a">A</helix-headless-tab-panel>
      <helix-headless-tab-panel slot="panels" value="b">B</helix-headless-tab-panel>
    </helix-headless-tabs>`
    const host = document.body.firstElementChild as Updatable
    await host.updateComplete

    const tabs = [...host.querySelectorAll('helix-headless-tab')] as (HTMLElement & {
      selected: boolean
    })[]
    expect(tabs[0]?.selected).toBe(false)
    expect(tabs[1]?.selected).toBe(true)
  })
})

describe('tabs, controlled and uncontrolled', () => {
  test('writing active seeds the set, and selecting still moves it', async () => {
    const host = (await mount(
      `<helix-headless-tabs active="one">
        <helix-headless-tab value="one">One</helix-headless-tab>
        <helix-headless-tab value="two">Two</helix-headless-tab>
      </helix-headless-tabs>`,
    )) as Updatable & { active: string }
    await host.updateComplete
    ;(tabs(host)[1] as unknown as { select(): void }).select()
    await host.updateComplete

    // Announced and applied: a declared `active` is a seed.
    expect(host.active).toBe('two')
    expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(true)
  })

  test('the change is still announced, so the consumer knows what to set', async () => {
    const host = (await mount(
      `<helix-headless-tabs active="one">
        <helix-headless-tab value="one">One</helix-headless-tab>
        <helix-headless-tab value="two">Two</helix-headless-tab>
      </helix-headless-tabs>`,
    )) as Updatable & { active: string }
    await host.updateComplete
    let asked = ''
    host.addEventListener('helix-before-activate', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    ;(tabs(host)[1] as unknown as { select(): void }).select()
    await host.updateComplete
    expect(asked).toBe('two')
  })

  test('default-active seeds instead, and the set then owns itself', async () => {
    const host = (await mount(
      `<helix-headless-tabs default-active="one">
        <helix-headless-tab value="one">One</helix-headless-tab>
        <helix-headless-tab value="two">Two</helix-headless-tab>
      </helix-headless-tabs>`,
    )) as Updatable & { active: string }
    await host.updateComplete
    ;(tabs(host)[1] as unknown as { select(): void }).select()
    await host.updateComplete
    expect(host.active).toBe('two')
  })

  test('reading active always gives the real tab, in either mode', async () => {
    // The point of one property rather than two: nobody has to ask which.
    const host = (await mount(
      `<helix-headless-tabs default-active="two">
        <helix-headless-tab value="one">One</helix-headless-tab>
        <helix-headless-tab value="two">Two</helix-headless-tab>
      </helix-headless-tabs>`,
    )) as Updatable & { active: string }
    await host.updateComplete
    expect(host.active).toBe('two')
  })
})

describe('tabs and the markup a server sent', () => {
  test('a set served on its third tab is still on it after upgrade', async () => {
    /* This element cannot choose a tab on the server, having no children to
       count, so a consumer whose first paint is right wrote `selected` on the
       tab and the panel themselves. Resolving over the top of that moved the
       set to the first tab one frame after it painted, which is the promise
       broken at first paint the server specs exist to catch and which no server
       spec can see, the move happening after hydration. `Steps` returns early
       on the same question. */
    const host = (await mount(
      `<helix-headless-tabs>
        <helix-headless-tab value="one">One</helix-headless-tab>
        <helix-headless-tab value="two">Two</helix-headless-tab>
        <helix-headless-tab selected value="three">Three</helix-headless-tab>
        <helix-headless-tab-panel slot="panels" value="one">First</helix-headless-tab-panel>
        <helix-headless-tab-panel selected slot="panels" value="three">Third</helix-headless-tab-panel>
      </helix-headless-tabs>`,
    )) as Updatable
    await host.updateComplete

    expect(hasState(tabs(host)[2] as Element, 'selected')).toBe(true)
    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(false)
    expect(hasState(panels(host)[1] as Element, 'selected')).toBe(true)
  })

  test('a written active still overrules it, a declared property being a correction', async () => {
    const host = (await mount(
      `<helix-headless-tabs active="one">
        <helix-headless-tab value="one">One</helix-headless-tab>
        <helix-headless-tab selected value="two">Two</helix-headless-tab>
      </helix-headless-tabs>`,
    )) as Updatable
    await host.updateComplete
    expect(hasState(tabs(host)[0] as Element, 'selected')).toBe(true)
    expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(false)
  })

  test('a set that says nothing at all still opens on the first enabled tab', async () => {
    const host = (await mount(
      `<helix-headless-tabs>
        <helix-headless-tab disabled value="one">One</helix-headless-tab>
        <helix-headless-tab value="two">Two</helix-headless-tab>
      </helix-headless-tabs>`,
    )) as Updatable
    await host.updateComplete
    expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(true)
  })
})

describe('tabs modes are decided once', () => {
  test('a script may move a seeded set without taking it over', async () => {
    /* The mode is read at the first update, from what declared one then. A
       write afterwards moves the set and leaves it owning itself, which is what
       both a native control and anyone reading this code would expect. */
    const host = (await mount(
      `<helix-headless-tabs default-active="one">
        <helix-headless-tab value="one">One</helix-headless-tab>
        <helix-headless-tab value="two">Two</helix-headless-tab>
      </helix-headless-tabs>`,
    )) as Updatable & { active: string }
    await host.updateComplete

    host.active = 'two'
    await host.updateComplete
    expect(host.active).toBe('two')

    ;(tabs(host)[0] as unknown as { select(): void }).select()
    await host.updateComplete
    expect(host.active).toBe('one')
  })
})

describe('tabs and what is inside a panel', () => {
  /* `helix-select` bubbles and is composed, and a tree, a menu or another tab
     set inside a panel sends it. Only this set's own tabs may move it. */
  test('a choice from inside a panel leaves the tab set where it is', async () => {
    const host = (await mount(markup)) as Updatable & { active: string }
    ;(tabs(host)[1] as Updatable & { select(): void }).select()
    await host.updateComplete
    const inside = document.createElement('div')
    panels(host)[1]?.append(inside)
    inside.dispatchEvent(
      new CustomEvent('helix-select', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { value: 'elsewhere' },
      }),
    )
    await host.updateComplete
    expect(host.active).toBe('two')
    expect(hasState(panels(host)[1] as Element, 'selected')).toBe(true)
  })

  test('takes its name from an aria-label on the host', async () => {
    const host = (await mount(
      '<helix-headless-tabs aria-label="Account sections"><helix-headless-tab value="a">A</helix-headless-tab></helix-headless-tabs>',
    )) as Updatable
    expect(part(host, 'tabs')?.getAttribute('aria-label')).toBe('Account sections')
  })
})

describe('vertical tabs', () => {
  /* React Aria's orientation: a column of tabs beside the panels, and a screen
     reader told the list runs down rather than across. */
  test('say so on the tab list, and say nothing while horizontal', async () => {
    const host = await mount(
      markup.replace('default-active="one"', 'default-active="one" orientation="vertical"'),
    )
    expect(part(host, 'tabs')?.getAttribute('aria-orientation')).toBe('vertical')
    const row = await mount(markup)
    expect(part(row, 'tabs')?.hasAttribute('aria-orientation')).toBe(false)
  })
})

describe('each tab and the panel it shows', () => {
  /* The pattern's aria-controls, which no id could carry across two sibling
     shadow roots. The set hands each tab its panel's host. */
  test('are paired by the set, for an element reference', async () => {
    const host = (await mount(markup)) as Updatable
    await host.updateComplete
    const [one, two] = tabs(host) as (Updatable & { controls?: Element })[]
    expect(one?.controls).toBe(panels(host)[0])
    expect(two?.controls).toBe(panels(host)[1])
  })
})

describe('tabs that are links', () => {
  const links = `
    <helix-headless-tabs>
      <helix-headless-tab value="home" href="/home" selected>Home</helix-headless-tab>
      <helix-headless-tab value="docs" href="/docs">Docs</helix-headless-tab>
    </helix-headless-tabs>`

  test('draw an anchor carrying the tab role', async () => {
    const host = await mount(links)
    const anchor = part(tabs(host)[1] as HTMLElement, 'tab')
    expect(anchor?.tagName).toBe('A')
    expect(anchor?.getAttribute('role')).toBe('tab')
    expect(anchor?.getAttribute('href')).toBe('/docs')
  })

  /* Arriving chose the tab, which for a link would have moved the mark to a
     page the reader never went to. */
  test('the arrow keys move focus and choose nothing', async () => {
    const host = (await mount(links)) as Updatable & { active: string }
    const [home, docs] = tabs(host)
    home?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
    await host.updateComplete
    expect(document.activeElement).toBe(docs ?? null)
    expect(hasState(docs as Element, 'selected')).toBe(false)
  })

  test('a refused choice keeps the browser from following the link', async () => {
    const host = await mount(links)
    const docs = tabs(host)[1] as Updatable
    docs.addEventListener('helix-select', (event) => event.preventDefault())
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
    part(docs, 'tab')?.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })
})
