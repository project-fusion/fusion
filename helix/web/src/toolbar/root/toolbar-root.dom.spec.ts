import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

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
    const controls = [...toolbar.children] as HTMLElement[]
    expect(controls.map((control) => control.tabIndex)).toEqual([0, -1, -1])
  })

  test('arrows move the tab stop and wrap', async () => {
    const toolbar = await mount(markup)
    const controls = [...toolbar.children] as HTMLElement[]
    const press = (from: HTMLElement, key: string) =>
      from.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))

    press(controls[0] as HTMLElement, 'ArrowRight')
    expect(controls.map((control) => control.tabIndex)).toEqual([-1, 0, -1])

    press(controls[1] as HTMLElement, 'ArrowLeft')
    press(controls[0] as HTMLElement, 'ArrowLeft')
    expect(controls.map((control) => control.tabIndex)).toEqual([-1, -1, 0])
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
    const controls = [...toolbar.children] as HTMLElement[]
    controls[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    )
    // Only one control participates, so the stop stays where it was.
    expect(controls[0]?.tabIndex).toBe(0)
  })
})
