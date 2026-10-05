import { beforeAll, describe, expect, test } from 'bun:test'
import { at, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { open: boolean; requestOpen(next: boolean): boolean }

const items = (host: HTMLElement): Item[] =>
  [...host.querySelectorAll('helix-headless-accordion-item')] as Item[]

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
  <helix-headless-accordion>
    <helix-headless-accordion-item><span slot="summary">One</span>1</helix-headless-accordion-item>
    <helix-headless-accordion-item><span slot="summary">Two</span>2</helix-headless-accordion-item>
    <helix-headless-accordion-item><span slot="summary">Three</span>3</helix-headless-accordion-item>
  </helix-headless-accordion>`

const single = three.replace(
  '<helix-headless-accordion>',
  '<helix-headless-accordion mode="single-collapsible">',
)

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
      three.replace('<helix-headless-accordion>', '<helix-headless-accordion mode="single">'),
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

    const added = document.createElement('helix-headless-accordion-item') as Item
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
      <helix-headless-accordion mode="single-collapsible">
        <helix-headless-accordion-item><span slot="summary">One</span>
          <helix-headless-accordion mode="single-collapsible">
            <helix-headless-accordion-item><span slot="summary">Inner</span>i</helix-headless-accordion-item>
          </helix-headless-accordion>
        </helix-headless-accordion-item>
        <helix-headless-accordion-item><span slot="summary">Two</span>2</helix-headless-accordion-item>
      </helix-headless-accordion>`)
    const [outer] = items(accordion)
    click(outer as Item)
    const inner = (outer as HTMLElement).querySelector('helix-headless-accordion-item') as Item
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
    expect<HTMLElement | null>(focused).toBe(at(list, 1) as HTMLElement)

    press(list[0] as HTMLElement, 'ArrowUp')
    expect<HTMLElement | null>(focused).toBe(at(list, 2) as HTMLElement)

    press(list[1] as HTMLElement, 'End')
    expect<HTMLElement | null>(focused).toBe(at(list, 2) as HTMLElement)

    press(list[2] as HTMLElement, 'Home')
    expect<HTMLElement | null>(focused).toBe(at(list, 0) as HTMLElement)
  })

  test('an unrelated key is left alone, so the page still scrolls', async () => {
    const accordion = await mount(three)
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'PageDown' })
    ;(items(accordion)[0] as HTMLElement).dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  /* The shared controller's rule, which the hand-written copy did not follow:
     a reader who guesses the wrong axis and gets nothing concludes the set does
     not answer the keyboard. */
  test('the other axis moves too, since a trigger has no use for it', async () => {
    const accordion = await mount(three)
    const list = items(accordion)
    let focused: HTMLElement | null = null
    for (const item of list) {
      ;(item as unknown as { focusTrigger(): void }).focusTrigger = () => {
        focused = item
      }
    }
    press(list[0] as HTMLElement, 'ArrowRight')
    expect<HTMLElement | null>(focused).toBe(at(list, 1) as HTMLElement)
  })

  /* An item holds its content as well as its trigger, and a control in an open
     section owns its own arrow keys: a caret that stopped moving because the
     accordion took the press would be the shared controller applied one level
     too wide. Only a press that arrives as the item's own, which is what a
     trigger's press retargets to, moves between triggers. */
  test('a press from inside a section is the section’s, not the accordion’s', async () => {
    const accordion = await mount(three.replace('>1<', '><input id="inside" />1<'))
    const list = items(accordion)
    let moved = false
    for (const item of list) {
      ;(item as unknown as { focusTrigger(): void }).focusTrigger = () => {
        moved = true
      }
    }
    const inside = accordion.querySelector('#inside') as HTMLElement
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowDown',
    })
    inside.dispatchEvent(event)
    expect([moved, event.defaultPrevented]).toEqual([false, false])
  })
})

describe('a single accordion however its sections open', () => {
  type Updating = Item & { toggleOpen(): boolean; updateComplete: Promise<unknown> }

  const settled = async (host: HTMLElement): Promise<Updating[]> => {
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    const found = items(host) as Updating[]
    for (const item of found) {
      await item.updateComplete
    }
    for (const item of found) {
      await item.updateComplete
    }
    return found
  }

  const state = (found: Item[]): boolean[] => found.map((item) => item.open)

  test('keeps the first section written open, and only that one', async () => {
    const host = await mount(`
      <helix-headless-accordion mode="single">
        <helix-headless-accordion-item><span slot="summary">One</span>1</helix-headless-accordion-item>
        <helix-headless-accordion-item default-open><span slot="summary">Two</span>2</helix-headless-accordion-item>
        <helix-headless-accordion-item default-open><span slot="summary">Three</span>3</helix-headless-accordion-item>
      </helix-headless-accordion>`)
    expect(state(await settled(host))).toEqual([false, true, false])
  })

  test('opens the first section where none is written open', async () => {
    const host = await mount(
      three.replace('<helix-headless-accordion>', '<helix-headless-accordion mode="single">'),
    )
    expect(state(await settled(host))).toEqual([true, false, false])
  })

  test('closes the others when a script opens one', async () => {
    const host = await mount(
      three.replace('<helix-headless-accordion>', '<helix-headless-accordion mode="single">'),
    )
    const found = await settled(host)
    at(found, 2).open = true
    await settled(host)
    expect(state(found)).toEqual([false, false, true])
    at(found, 1).toggleOpen()
    await settled(host)
    expect(state(found)).toEqual([false, true, false])
  })
})

describe('the heading around each trigger', () => {
  const heading = (item: Item): Element | null | undefined =>
    item.shadowRoot?.querySelector('[part="heading"]')

  test('holds the trigger at level 3 unless the accordion or the item says otherwise', async () => {
    const host = await mount(`
      <helix-headless-accordion heading-level="2">
        <helix-headless-accordion-item><span slot="summary">One</span>1</helix-headless-accordion-item>
        <helix-headless-accordion-item heading-level="4"><span slot="summary">Two</span>2</helix-headless-accordion-item>
      </helix-headless-accordion>`)
    const found = items(host)
    for (const item of found) {
      await (item as Item & { updateComplete: Promise<unknown> }).updateComplete
    }
    const [one, two] = found as [Item, Item]
    expect(heading(one)?.getAttribute('role')).toBe('heading')
    expect(heading(one)?.querySelector('[part="trigger"]')).not.toBeNull()
    expect(heading(one)?.getAttribute('aria-level')).toBe('2')
    expect(heading(two)?.getAttribute('aria-level')).toBe('4')

    const alone = (await mount(
      '<helix-headless-accordion-item><span slot="summary">Alone</span>A</helix-headless-accordion-item>',
    )) as Item
    expect(heading(alone)?.getAttribute('aria-level')).toBe('3')
  })
})

describe('a disabled section', () => {
  test('cannot be pressed, and the arrows pass over it', async () => {
    const host = await mount(`
      <helix-headless-accordion>
        <helix-headless-accordion-item><span slot="summary">One</span>1</helix-headless-accordion-item>
        <helix-headless-accordion-item disabled><span slot="summary">Two</span>2</helix-headless-accordion-item>
        <helix-headless-accordion-item><span slot="summary">Three</span>3</helix-headless-accordion-item>
      </helix-headless-accordion>`)
    const [one, two, three] = items(host) as [Item, Item, Item]
    for (const item of [one, two, three]) {
      await (item as Item & { updateComplete: Promise<unknown> }).updateComplete
    }
    click(two)
    expect(two.open).toBe(false)
    expect(two.shadowRoot?.querySelector('[part="trigger"]')?.hasAttribute('disabled')).toBe(true)
    one.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }),
    )
    expect(three.shadowRoot?.activeElement?.getAttribute('part')).toBe('trigger')
  })
})
