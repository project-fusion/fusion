import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const markup = `
  <helix-headless-tabs default-active="one">
    <helix-headless-tabs-tab value="one">One</helix-headless-tabs-tab>
    <helix-headless-tabs-tab value="two">Two</helix-headless-tabs-tab>
    <helix-headless-tabs-tab disabled value="three">Three</helix-headless-tabs-tab>
    <helix-headless-tabs-panel slot="panels" value="one">First</helix-headless-tabs-panel>
    <helix-headless-tabs-panel slot="panels" value="two">Second</helix-headless-tabs-panel>
    <helix-headless-tabs-panel slot="panels" value="three">Third</helix-headless-tabs-panel>
  </helix-headless-tabs>`

const tabs = (host: HTMLElement) =>
  [...host.querySelectorAll('helix-headless-tabs-tab')] as Updatable[]
const panels = (host: HTMLElement) =>
  [...host.querySelectorAll('helix-headless-tabs-panel')] as Updatable[]

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

  test('a disabled tab cannot be chosen', async () => {
    const host = (await mount(markup)) as Updatable
    const third = tabs(host)[2] as Updatable & { select(): void }
    third.select()
    await host.updateComplete
    expect(hasState(third, 'selected')).toBe(false)
  })

  test('the panel is named by its tab, since an IDREF cannot reach one', async () => {
    /* This spec used to assert the two IDREFs existed, and they did: `tab-one`
       and `panel-one`, derived from the value so they would survive server
       rendering. What it never asserted is that either one *reached* anything,
       and neither did. Both ids were rendered inside their own element's shadow
       root, an IDREF resolves only in the tree it is written in, and a sibling
       shadow tree is not that tree. So the panel had no accessible name at all
       and the tab controlled nothing, on every set, while this passed.

       No element reference can fix it either: a reference is valid into the
       same tree or a shadow-including ancestor, and these are siblings. A name
       is the one form that crosses, so the root reads the tab's words and hands
       them to the panel. */
    const host = await mount(markup)
    const tab = part(tabs(host)[0] as HTMLElement, 'tab')
    const panel = part(panels(host)[0] as HTMLElement, 'panel')
    expect(panel?.getAttribute('aria-label')).toBe('One')
    expect(tab?.hasAttribute('aria-controls')).toBe(false)
    expect(panel?.hasAttribute('aria-labelledby')).toBe(false)
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
   * The helper used to find the selected tab and press from there, which made
   * the manual-mode spec below pass without touching what it is about: in
   * `manual` focus and selection diverge after the first press, so pressing
   * from the selection every time re-runs the first press forever. Traversal
   * being impossible in `manual` was a real bug, and this is the only shape of
   * helper that can see it. */
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

  test('both axes move the row, not only the one it is laid out on', async () => {
    /* The tab list bound Left and Right alone until it moved onto
       `KeyboardNavigationController`, which binds both axes on purpose: a
       reader who guesses the wrong axis gets nothing, and `variant` is
       presentation. Down reads as Right, Up as Left. */
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
       so a press from inside one used to move the row out from under the
       reader. `origin: 'focus'` is what makes it identifiable: the press came
       from no tab, so there is nothing to move. */
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
    /* It could not be refused before: the value was written straight from the
       item's event, so `helix-change` was an announcement nobody could answer,
       while `Radio.Group` two folders away could be. Whether a selection can be
       refused should not depend on which component is being looked at. */
    const host = (await mount(markup)) as Updatable & { active: string }
    await host.updateComplete
    const started = host.active

    host.addEventListener('helix-before-activate', (event) => event.preventDefault())
    const other = [...host.querySelectorAll('helix-headless-tabs-tab')].find(
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
    // The hand-written fallback was `?? tabs[0]`, which took whatever was
    // first, so a set opening on a disabled tab showed it as current and
    // brought its panel with it.
    document.body.innerHTML = `<helix-headless-tabs label="Set">
      <helix-headless-tabs-tab disabled value="a">A</helix-headless-tabs-tab>
      <helix-headless-tabs-tab value="b">B</helix-headless-tabs-tab>
      <helix-headless-tabs-panel slot="panels" value="a">A</helix-headless-tabs-panel>
      <helix-headless-tabs-panel slot="panels" value="b">B</helix-headless-tabs-panel>
    </helix-headless-tabs>`
    const host = document.body.firstElementChild as Updatable
    await host.updateComplete

    const tabs = [...host.querySelectorAll('helix-headless-tabs-tab')] as (HTMLElement & {
      selected: boolean
    })[]
    expect(tabs[0]?.selected).toBe(false)
    expect(tabs[1]?.selected).toBe(true)
  })
})

describe('tabs, controlled and uncontrolled', () => {
  /* The reason all four mixins changed shape. A consumer who wrote `value="one"`
     and then clicked another tab read back "two": the set overwrote them, so a
     tab strip could not be owned by the thing rendering it. */
  test('writing active seeds the set, and selecting still moves it', async () => {
    const host = (await mount(
      `<helix-headless-tabs active="one">
        <helix-headless-tabs-tab value="one">One</helix-headless-tabs-tab>
        <helix-headless-tabs-tab value="two">Two</helix-headless-tabs-tab>
      </helix-headless-tabs>`,
    )) as Updatable & { active: string }
    await host.updateComplete
    ;(tabs(host)[1] as unknown as { select(): void }).select()
    await host.updateComplete

    // Announced and applied: a declared `active` is a seed. See 294.
    expect(host.active).toBe('two')
    expect(hasState(tabs(host)[1] as Element, 'selected')).toBe(true)
  })

  test('the change is still announced, so the consumer knows what to set', async () => {
    const host = (await mount(
      `<helix-headless-tabs active="one">
        <helix-headless-tabs-tab value="one">One</helix-headless-tabs-tab>
        <helix-headless-tabs-tab value="two">Two</helix-headless-tabs-tab>
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
        <helix-headless-tabs-tab value="one">One</helix-headless-tabs-tab>
        <helix-headless-tabs-tab value="two">Two</helix-headless-tabs-tab>
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
        <helix-headless-tabs-tab value="one">One</helix-headless-tabs-tab>
        <helix-headless-tabs-tab value="two">Two</helix-headless-tabs-tab>
      </helix-headless-tabs>`,
    )) as Updatable & { active: string }
    await host.updateComplete
    expect(host.active).toBe('two')
  })
})

describe('tabs modes are decided once', () => {
  test('a script may move a seeded set without taking it over', async () => {
    /* The mode is read at the first update, from what declared one then. A
       write afterwards moves the set and leaves it owning itself, which is what
       both a native control and anyone reading this code would expect. */
    const host = (await mount(
      `<helix-headless-tabs default-active="one">
        <helix-headless-tabs-tab value="one">One</helix-headless-tabs-tab>
        <helix-headless-tabs-tab value="two">Two</helix-headless-tabs-tab>
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
