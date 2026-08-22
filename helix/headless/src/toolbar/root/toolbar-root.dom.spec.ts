import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

const markup = `
  <helix-toolbar label="Actions">
    <helix-button>One</helix-button>
    <helix-button>Two</helix-button>
    <helix-button>Three</helix-button>
  </helix-toolbar>`

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
      <helix-toolbar label="Actions">
        <helix-button>One</helix-button>
        <helix-button disabled>Two</helix-button>
      </helix-toolbar>`)
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
