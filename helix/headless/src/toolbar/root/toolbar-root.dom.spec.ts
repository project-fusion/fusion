import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../divider/index.js')
  await import('../../menu/index.js')
  await import('../../toggle/index.js')
})

const markup = `
  <helix-headless-toolbar label="Actions">
    <helix-headless-button>One</helix-headless-button>
    <helix-headless-button>Two</helix-headless-button>
    <helix-headless-button>Three</helix-headless-button>
  </helix-headless-toolbar>`

/**
 * Where the tab stop actually sits, one entry per control.
 *
 * On the inner control rather than the host: writing `tabindex` onto a child is
 * a change to markup the consumer rendered, which a React consumer's hydration
 * reports. `in` is the control that Tab reaches, `out` the ones it skips.
 */
const stops = (toolbar: HTMLElement): string[] =>
  [...toolbar.children].map((control) =>
    part(control as HTMLElement, 'button')?.getAttribute('tabindex') === '-1' ? 'out' : 'in',
  )

/**
 * Waits for the toolbar's deferred first pass and the re-render it causes.
 *
 * The first tab stop is set only once every custom control has upgraded, since
 * before that there is no `focusable` property to set.
 */
const settle = async (toolbar: HTMLElement): Promise<void> => {
  await (toolbar as Updatable).updateComplete
  await Promise.resolve()
  await Promise.all([...toolbar.children].map((child) => (child as Updatable).updateComplete))
}

describe('toolbar', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  test('is announced as a toolbar with its orientation', async () => {
    const toolbar = await mount(markup)
    const inner = part(toolbar, 'toolbar')
    expect(inner?.getAttribute('role')).toBe('toolbar')
    expect(inner?.getAttribute('aria-label')).toBe('Actions')
    expect(inner?.getAttribute('aria-orientation')).toBe('horizontal')
  })

  test('the whole bar is one tab stop', async () => {
    // Three toolbars on a page should cost three presses of Tab to get past,
    // not thirty.
    const toolbar = await mount(markup)
    await settle(toolbar)
    expect(stops(toolbar)).toEqual(['in', 'out', 'out'])
  })

  test('the stop is inside the control, not an attribute on the host', async () => {
    // The host is markup the consumer wrote. An attribute this element adds to
    // it after upgrading is one a React consumer's server HTML never had, and
    // hydration reports it rather than patching it up.
    const toolbar = await mount(markup)
    await settle(toolbar)
    for (const control of toolbar.children) {
      expect(control.hasAttribute('tabindex')).toBe(false)
    }
  })

  test('arrows move the tab stop and wrap', async () => {
    const toolbar = await mount(markup)
    await settle(toolbar)
    const controls = [...toolbar.children] as HTMLElement[]
    const press = (from: HTMLElement, key: string) =>
      from.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))

    press(controls[0] as HTMLElement, 'ArrowRight')
    await settle(toolbar)
    expect(stops(toolbar)).toEqual(['out', 'in', 'out'])

    press(controls[1] as HTMLElement, 'ArrowLeft')
    press(controls[0] as HTMLElement, 'ArrowLeft')
    await settle(toolbar)
    expect(stops(toolbar)).toEqual(['out', 'out', 'in'])
  })

  /* The first control is on the right of a right-to-left page, so the left
     arrow points at the second. The right arrow had moved to it, away from
     where it points. */
  test('on a right-to-left page the left arrow moves on and the right one back', async () => {
    document.documentElement.dir = 'rtl'
    const toolbar = await mount(markup)
    await settle(toolbar)
    const controls = [...toolbar.children] as HTMLElement[]
    const press = (from: HTMLElement, key: string) =>
      from.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))

    press(controls[0] as HTMLElement, 'ArrowLeft')
    await settle(toolbar)
    expect(stops(toolbar)).toEqual(['out', 'in', 'out'])

    press(controls[1] as HTMLElement, 'ArrowRight')
    await settle(toolbar)
    expect(stops(toolbar)).toEqual(['in', 'out', 'out'])
  })

  test('an arrow along the other axis is left to the page', async () => {
    const toolbar = await mount(markup)
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowDown',
    })
    ;(toolbar.children[0] as HTMLElement).dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('a disabled control is skipped rather than trapping the tab stop', async () => {
    const toolbar = await mount(`
      <helix-headless-toolbar label="Actions">
        <helix-headless-button>One</helix-headless-button>
        <helix-headless-button disabled>Two</helix-headless-button>
      </helix-headless-toolbar>`)
    await settle(toolbar)
    const controls = [...toolbar.children] as HTMLElement[]
    controls[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    )
    await settle(toolbar)
    // Only one control participates, so the stop stays where it was.
    expect(stops(toolbar)[0]).toBe('in')
  })
})

describe('what a toolbar moves between', () => {
  type Stop = HTMLElement & { focusable: boolean; updateComplete: Promise<unknown> }

  const press = (from: Element, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
    })
    from.dispatchEvent(event)
    return event
  }

  /** What Tab stops at inside `node`, in order, through shadow roots and slots. */
  const tabStops = (node: Element | ShadowRoot): string[] =>
    (node instanceof HTMLSlotElement ? node.assignedElements() : [...node.children]).flatMap(
      (child) => [
        ...(child.matches(
          'button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        )
          ? [((child.getRootNode() as ShadowRoot).host as HTMLElement).id]
          : []),
        ...tabStops(child.shadowRoot ?? child),
      ],
    )

  /* The group kept the stop on its chosen toggle while the toolbar held its
     own, so Tab from before the toolbar stopped on the first button and again
     on the toggle. */
  test('a toggle group inside is not a second tab stop', async () => {
    const toolbar = await mount(`
      <helix-headless-toolbar label="Format">
        <helix-headless-button id="b1">Bold</helix-headless-button>
        <helix-headless-toggle-group label="Align" default-value="c">
          <helix-headless-toggle id="l" value="l">Left</helix-headless-toggle>
          <helix-headless-toggle id="c" value="c">Center</helix-headless-toggle>
        </helix-headless-toggle-group>
        <helix-headless-button id="b3">Link</helix-headless-button>
      </helix-headless-toolbar>`)
    await settle(toolbar)
    const group = toolbar.querySelector('helix-headless-toggle-group') as Stop & { value: string }
    await settle(group)
    expect(tabStops(toolbar)).toEqual(['b1'])

    press(toolbar.querySelector('#b1') as Element, 'ArrowRight')
    await settle(group)
    expect(tabStops(toolbar)).toEqual(['c'])

    /* The arrows across the toolbar still move inside the group. */
    press(toolbar.querySelector('#c') as Element, 'ArrowUp')
    await settle(group)
    expect(group.value).toBe('l')
    expect(tabStops(toolbar)).toEqual(['l'])

    press(toolbar.querySelector('#l') as Element, 'ArrowRight')
    await settle(group)
    expect(tabStops(toolbar)).toEqual(['b3'])
  })

  test('skips a divider, passes a toggle group as one stop, and reaches a menu at its trigger', async () => {
    const toolbar = await mount(`
      <helix-headless-toolbar label="Format">
        <helix-headless-button id="b1">Bold</helix-headless-button>
        <helix-headless-divider></helix-headless-divider>
        <helix-headless-toggle-group label="Align" default-value="l">
          <helix-headless-toggle value="l">Left</helix-headless-toggle>
          <helix-headless-toggle value="c">Center</helix-headless-toggle>
        </helix-headless-toggle-group>
        <helix-headless-menu><helix-headless-button id="more" slot="trigger">More</helix-headless-button>
          <helix-headless-menu-item value="x">X</helix-headless-menu-item></helix-headless-menu>
        <helix-headless-button id="b3">Link</helix-headless-button>
      </helix-headless-toolbar>`)
    await settle(toolbar)
    const b1 = toolbar.querySelector('#b1') as Stop
    const left = toolbar.querySelector('helix-headless-toggle[value="l"]') as Stop
    const more = toolbar.querySelector('#more') as Stop
    const b3 = toolbar.querySelector('#b3') as Stop
    await left.updateComplete

    press(b1, 'ArrowRight')
    expect(b1.focusable).toBe(false)
    expect(left.ownerDocument.activeElement).toBe(left)

    /* Along the toolbar from inside the group moves past it, and the group
       does not move as well. */
    const out = press(left, 'ArrowRight')
    await settle(toolbar)
    expect(out.defaultPrevented).toBe(true)
    expect(more.focusable).toBe(true)
    expect(
      (toolbar.querySelector('helix-headless-toggle-group') as HTMLElement & { value: string })
        .value,
    ).toBe('l')

    press(more, 'ArrowRight')
    await settle(toolbar)
    expect([more.focusable, b3.focusable]).toEqual([false, true])

    press(b3, 'ArrowRight')
    await settle(toolbar)
    expect(b1.focusable).toBe(true)
  })

  /* After the first focus every native button carries `tabindex="-1"` but
     the one holding the stop, so losing that one has to hand the stop on. */
  for (const loses of ['removed', 'disabled'] as const) {
    test(`a native stop that is ${loses} hands the stop to the first button left`, async () => {
      const toolbar = await mount(`
        <helix-headless-toolbar label="Native">
          <button id="n1">One</button><button id="n2">Two</button><button id="n3">Three</button>
        </helix-headless-toolbar>`)
      await settle(toolbar)
      const [n1, , n3] = [...toolbar.querySelectorAll('button')] as HTMLButtonElement[]
      ;(n3 as HTMLButtonElement).focus()
      n3?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
      expect(n1?.tabIndex).toBe(-1)
      if (loses === 'removed') {
        n3?.remove()
      } else {
        ;(n3 as HTMLButtonElement).disabled = true
      }
      await new Promise((resolve) => setTimeout(resolve, 0))
      await settle(toolbar)
      expect(n1?.tabIndex).toBe(0)
    })
  }

  test('takes its name from an aria-label on the host', async () => {
    const toolbar = await mount(
      '<helix-headless-toolbar aria-label="Formatting"><helix-headless-button>B</helix-headless-button></helix-headless-toolbar>',
    )
    expect(part(toolbar, 'toolbar')?.getAttribute('aria-label')).toBe('Formatting')
  })
})
