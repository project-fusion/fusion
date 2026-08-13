import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { isOpen: boolean; setOpen(next: boolean): void }

const items = (host: HTMLElement): Item[] =>
  [...host.querySelectorAll('helix-accordion-item')] as Item[]

const three = `
  <helix-accordion>
    <helix-accordion-item><span slot="summary">One</span>1</helix-accordion-item>
    <helix-accordion-item><span slot="summary">Two</span>2</helix-accordion-item>
    <helix-accordion-item><span slot="summary">Three</span>3</helix-accordion-item>
  </helix-accordion>`

describe('accordion exclusivity', () => {
  test('opening one closes the others', async () => {
    const accordion = await mount(three)
    const [first, second] = items(accordion)
    first?.setOpen(true)
    expect(first?.isOpen).toBe(true)

    second?.setOpen(true)
    expect(second?.isOpen).toBe(true)
    expect(first?.isOpen).toBe(false)
  })

  test('multiple lets them coexist', async () => {
    const accordion = await mount(three.replace('<helix-accordion>', '<helix-accordion multiple>'))
    const [first, second] = items(accordion)
    first?.setOpen(true)
    second?.setOpen(true)
    expect(first?.isOpen).toBe(true)
    expect(second?.isOpen).toBe(true)
  })

  test('closing an item does not disturb the others', async () => {
    const accordion = await mount(three.replace('<helix-accordion>', '<helix-accordion multiple>'))
    const [first, second] = items(accordion)
    first?.setOpen(true)
    second?.setOpen(true)
    second?.setOpen(false)
    expect(first?.isOpen).toBe(true)
  })

  test('coordination is by event, so an item added later is covered too', async () => {
    // Nothing registers children, so there is no registry to fall out of step.
    const accordion = await mount(three)
    const [first] = items(accordion)
    first?.setOpen(true)

    const added = document.createElement('helix-accordion-item') as Item
    accordion.appendChild(added)
    await (added as unknown as { updateComplete: Promise<unknown> }).updateComplete
    added.setOpen(true)

    expect(added.isOpen).toBe(true)
    expect(first?.isOpen).toBe(false)
  })
})

describe('accordion keyboard navigation', () => {
  const press = (target: HTMLElement, key: string): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
  }

  test('arrows move between triggers and wrap', async () => {
    const accordion = await mount(three)
    const list = items(accordion)
    let focused: HTMLElement | null = null
    for (const item of list) {
      ;(item as unknown as { focusTrigger(): void }).focusTrigger = () => {
        focused = item
      }
    }

    press(list[0] as HTMLElement, 'ArrowDown')
    expect(focused).toBe(list[1] as HTMLElement)

    press(list[0] as HTMLElement, 'ArrowUp')
    expect(focused).toBe(list[2] as HTMLElement)

    press(list[1] as HTMLElement, 'End')
    expect(focused).toBe(list[2] as HTMLElement)

    press(list[2] as HTMLElement, 'Home')
    expect(focused).toBe(list[0] as HTMLElement)
  })

  test('an unrelated key is left alone, so the page still scrolls', async () => {
    const accordion = await mount(three)
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'PageDown' })
    ;(items(accordion)[0] as HTMLElement).dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
