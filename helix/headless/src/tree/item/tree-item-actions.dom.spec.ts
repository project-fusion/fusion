import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
  settle,
} from '@fusion.dev/helix-testing/dom'

/* A row's own controls, such as a button that opens a menu of what you can do
   with the item. The tree took every press and key from inside a row, so a
   button there chose the row, opened the branch, or moved focus to the next
   row, and pages stopped the events themselves to keep them. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { open: boolean; selected: boolean; updateComplete: Promise<unknown> }

const tree = async (row = ''): Promise<HTMLElement> => {
  const host = await mount(
    `<helix-headless-tree label="Files">
      <helix-headless-tree-item value="src" ${row}>src
        <button slot="actions" id="more">More</button>
        <helix-headless-tree-item slot="children" value="app">app.ts
          <button slot="actions" id="inner">More</button>
        </helix-headless-tree-item>
      </helix-headless-tree-item>
      <helix-headless-tree-item value="readme">README
        <button slot="actions" id="other">More</button>
      </helix-headless-tree-item>
    </helix-headless-tree>`,
  )
  await settle(host)
  for (const item of host.querySelectorAll('helix-headless-tree-item')) {
    await (item as Item).updateComplete
  }
  return host
}

const itemOf = (host: HTMLElement, value: string): Item =>
  host.querySelector(`helix-headless-tree-item[value="${value}"]`) as Item

const actions = (item: Item): HTMLSlotElement => part(item, 'actions') as HTMLSlotElement

const key = (target: Element, name: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: name,
  })
  target.dispatchEvent(event)
  return event
}

describe('the actions slot', () => {
  test('is in the row after `end`, holds what is slotted, and is inert until shown', async () => {
    const host = await tree()
    const src = itemOf(host, 'src')
    const slot = actions(src)
    expect(slot.localName).toBe('slot')
    expect(slot.parentElement as Element | null).toBe(part(src, 'row') as Element)
    expect(slot.previousElementSibling?.getAttribute('name')).toBe('end')
    expect(slot.assignedElements().map((one) => one.id)).toEqual(['more'])
    expect(slot.hasAttribute('inert')).toBe(true)
    expect(hasState(src, 'actions-shown')).toBe(false)
  })

  test('a key pressed on an action stays with it, and the tree neither moves nor chooses', async () => {
    const host = await tree('default-open')
    const src = itemOf(host, 'src')
    const button = host.querySelector('#more') as HTMLButtonElement
    let chosen = 0
    host.addEventListener('helix-before-select', () => {
      chosen += 1
    })
    for (const name of ['ArrowDown', 'ArrowRight', 'ArrowLeft', 'Enter', ' ', 'Home', 'r']) {
      expect(key(button, name).defaultPrevented).toBe(false)
    }
    await src.updateComplete
    expect(chosen).toBe(0)
    expect(src.open).toBe(true)
  })

  test('the same keys on the row still move and open', async () => {
    const host = await tree()
    const src = itemOf(host, 'src')
    const row = part(src, 'item') as HTMLElement
    expect(key(row, 'ArrowRight').defaultPrevented).toBe(true)
    await src.updateComplete
    expect(src.open).toBe(true)
  })

  test('shows while the pointer is over the row, and not over a row nested under it', async () => {
    const host = await tree('default-open')
    const src = itemOf(host, 'src')
    const app = itemOf(host, 'app')
    part(app, 'row')?.dispatchEvent(new PointerEvent('pointerenter'))
    await app.updateComplete
    await src.updateComplete
    expect(hasState(app, 'actions-shown')).toBe(true)
    expect(hasState(src, 'actions-shown')).toBe(false)
    part(app, 'row')?.dispatchEvent(new PointerEvent('pointerleave'))
    await app.updateComplete
    expect(hasState(app, 'actions-shown')).toBe(false)
    expect(actions(app).hasAttribute('inert')).toBe(true)
  })

  test('shows while the row has focus or focus is in it, and not for a nested row', async () => {
    const host = await tree('default-open')
    const src = itemOf(host, 'src')
    const app = itemOf(host, 'app')
    ;(part(src, 'item') as HTMLElement).focus()
    await src.updateComplete
    expect(hasState(src, 'actions-shown')).toBe(true)
    expect(actions(src).hasAttribute('inert')).toBe(false)
    ;(host.querySelector('#more') as HTMLButtonElement).focus()
    await src.updateComplete
    expect(hasState(src, 'actions-shown')).toBe(true)
    ;(part(app, 'item') as HTMLElement).focus()
    await src.updateComplete
    await app.updateComplete
    expect(hasState(src, 'actions-shown')).toBe(false)
    expect(hasState(app, 'actions-shown')).toBe(true)
  })

  test('a row with actions is named by its label alone', async () => {
    const host = await tree()
    const readme = itemOf(host, 'readme')
    const row = part(readme, 'item') as HTMLElement
    const scope = row.getRootNode() as ShadowRoot
    expect(scope.getElementById(row.getAttribute('aria-labelledby') ?? '')).toBe(
      part(readme, 'label') as HTMLElement,
    )
  })

  test('a row without actions keeps the name its content gives it', async () => {
    const host = await mount(
      '<helix-headless-tree label="Files"><helix-headless-tree-item value="a">A</helix-headless-tree-item></helix-headless-tree>',
    )
    await settle(host)
    const item = host.querySelector('helix-headless-tree-item') as Item
    await item.updateComplete
    expect((part(item, 'item') as HTMLElement).hasAttribute('aria-labelledby')).toBe(false)
  })
})

/* What `inert` does, and a press routed through a slot to the row, are the
   browser's: happy-dom leaves the slot out of the path, so the row would never
   hear the press either way. Run with `bun run specs:browser tree`. */
if (hasLayout()) {
  describe('the actions in a browser', () => {
    test('a press on an action does not choose, open or close the row', async () => {
      const host = await tree('default-open')
      const src = itemOf(host, 'src')
      let chosen = 0
      host.addEventListener('helix-before-select', () => {
        chosen += 1
      })
      ;(host.querySelector('#more') as HTMLButtonElement).click()
      await src.updateComplete
      expect(chosen).toBe(0)
      expect(src.open).toBe(true)
      expect(src.selected).toBe(false)
      /* And the row beside it still hears its own press, so the spec runs where
         presses reach it. */
      ;(part(src, 'label') as HTMLElement).click()
      await src.updateComplete
      expect(src.open).toBe(false)
    })

    test("only the focused row's actions can take focus", async () => {
      const host = await tree()
      const src = itemOf(host, 'src')
      const readme = itemOf(host, 'readme')
      const other = host.querySelector('#other') as HTMLButtonElement
      other.focus()
      expect(document.activeElement).not.toBe(other)
      ;(part(readme, 'item') as HTMLElement).focus()
      await readme.updateComplete
      other.focus()
      expect(document.activeElement).toBe(other)
      expect(hasState(src, 'actions-shown')).toBe(false)
    })
  })

  describe('the actions of a link row', () => {
    const linked = async (action: string): Promise<{ host: HTMLElement; item: Item }> => {
      const host = await mount(
        `<helix-headless-tree label="Pages"><helix-headless-tree-item value="home" href="#home">Home${action}</helix-headless-tree-item></helix-headless-tree>`,
      )
      await settle(host)
      const item = host.querySelector('helix-headless-tree-item') as Item
      await item.updateComplete
      return { host, item }
    }

    test('a press on a control is left to the control, and the row is not chosen', async () => {
      const { host, item } = await linked('<button slot="actions">Pin to top</button>')
      let chosen = 0
      host.addEventListener('helix-before-select', () => {
        chosen += 1
      })
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      ;(host.querySelector('button') as HTMLButtonElement).dispatchEvent(click)
      await item.updateComplete
      expect(click.defaultPrevented).toBe(false)
      expect(chosen).toBe(0)
    })

    test('a press on no control in the actions does not follow the link', async () => {
      const { host } = await linked('<span slot="actions">3 new</span>')
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      ;(host.querySelector('span') as HTMLElement).dispatchEvent(click)
      expect(click.defaultPrevented).toBe(true)
    })

    test('the link row is named by its label alone', async () => {
      const { item } = await linked('<button slot="actions">Pin to top</button>')
      const row = part(item, 'row') as HTMLElement
      const scope = row.getRootNode() as ShadowRoot
      expect(scope.getElementById(row.getAttribute('aria-labelledby') ?? '')).toBe(
        part(item, 'label') as HTMLElement,
      )
    })
  })
}
