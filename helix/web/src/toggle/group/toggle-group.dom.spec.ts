import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-toggle-group label="Color mode" value="light">
  <helix-toggle value="system">System</helix-toggle>
  <helix-toggle value="light">Light</helix-toggle>
  <helix-toggle value="dark">Dark</helix-toggle>
</helix-toggle-group>`

const items = (group: HTMLElement) =>
  [...group.querySelectorAll('helix-toggle')] as (HTMLElement & {
    selected: boolean
    value: string
  })[]

describe('toggle group', () => {
  test('is a radio group, named on internals rather than on the host', async () => {
    const group = await mount(markup)
    expect(role(group)).toBe('radiogroup')
    expect(group.hasAttribute('role')).toBe(false)
  })

  test('the value selects the matching item and no other', async () => {
    const group = await mount(markup)
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['light'])
  })

  test('choosing an item moves the selection and reports the new value', async () => {
    const group = await mount(markup)
    let seen = ''
    group.addEventListener('helix-select', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
    })

    const dark = items(group)[2] as HTMLElement & { select: () => void }
    dark.select()
    await Promise.resolve()

    expect(seen).toBe('dark')
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['dark'])
  })

  test('the indicator is hidden from assistive technology', async () => {
    // It repeats the selection a radio group already announces.
    const group = await mount(markup)
    expect(part(group, 'indicator')?.getAttribute('aria-hidden')).toBe('true')
  })
})
