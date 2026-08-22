import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { open: boolean; requestOpen(next: boolean): boolean }

const items = (host: HTMLElement): Item[] =>
  [...host.querySelectorAll('helix-accordion-item')] as Item[]

/**
 * Clicks an item's trigger.
 *
 * Coordination lives on the click path, not in `requestOpen`: the item that was
 * pressed is the one that enforces the mode, and `requestOpen` is the raw state
 * change underneath it. Calling that directly would test the wrong thing.
 */
const click = (item: Item): void => {
  item.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]')?.click()
}

const three = `
  <helix-accordion>
    <helix-accordion-item><span slot="summary">One</span>1</helix-accordion-item>
    <helix-accordion-item><span slot="summary">Two</span>2</helix-accordion-item>
    <helix-accordion-item><span slot="summary">Three</span>3</helix-accordion-item>
  </helix-accordion>`

const single = three.replace('<helix-accordion>', '<helix-accordion mode="single-collapsible">')

describe('accordion exclusivity', () => {
  test('nothing closes unexpectedly by default', async () => {
    // Absent mode is `multiple`, which is the forgiving default: opening one
    // section never takes another away.
    const accordion = await mount(three)
    const [first, second] = items(accordion)
    click(first as Item)
    click(second as Item)
    expect(first?.open).toBe(true)
    expect(second?.open).toBe(true)
  })

  test('single-collapsible closes the others', async () => {
    const accordion = await mount(single)
    const [first, second] = items(accordion)
    click(first as Item)
    expect(first?.open).toBe(true)

    click(second as Item)
    expect(second?.open).toBe(true)
    expect(first?.open).toBe(false)
  })

  test('single-collapsible lets the last one close', async () => {
    const accordion = await mount(single)
    const [first] = items(accordion)
    click(first as Item)
    click(first as Item)
    expect(first?.open).toBe(false)
  })

  test('single refuses to close the last one', async () => {
    // The difference between the two single modes, and the only difference.
    const accordion = await mount(
      three.replace('<helix-accordion>', '<helix-accordion mode="single">'),
    )
    const [first] = items(accordion)
    click(first as Item)
    click(first as Item)
    expect(first?.open).toBe(true)
  })

  test('closing an item does not disturb the others', async () => {
    const accordion = await mount(three)
    const [first, second] = items(accordion)
    click(first as Item)
    click(second as Item)
    click(second as Item)
    expect(first?.open).toBe(true)
  })

  test('membership is resolved on demand, so an item added later coordinates', async () => {
    // Nothing registers children, so there is no registry to fall out of step.
    const accordion = await mount(single)
    const [first] = items(accordion)
    click(first as Item)

    const added = document.createElement('helix-accordion-item') as Item
    accordion.appendChild(added)
    await (added as unknown as { updateComplete: Promise<unknown> }).updateComplete
    click(added)

    expect(added.open).toBe(true)
    expect(first?.open).toBe(false)
  })

  test('a nested accordion is a separate set', async () => {
    // An item inside another item's content finds the same accordion through
    // `closest`, so only being a *direct* child is what makes it a peer.
    const accordion = await mount(`
      <helix-accordion mode="single-collapsible">
        <helix-accordion-item><span slot="summary">One</span>
          <helix-accordion mode="single-collapsible">
            <helix-accordion-item><span slot="summary">Inner</span>i</helix-accordion-item>
          </helix-accordion>
        </helix-accordion-item>
        <helix-accordion-item><span slot="summary">Two</span>2</helix-accordion-item>
      </helix-accordion>`)
    const [outer] = items(accordion)
    click(outer as Item)
    const inner = (outer as HTMLElement).querySelector('helix-accordion-item') as Item
    click(inner)
    expect(inner.open).toBe(true)
    expect(outer?.open).toBe(true)
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
