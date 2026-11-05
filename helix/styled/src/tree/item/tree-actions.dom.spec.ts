import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'

/* How the styled row draws its actions. Where each box lands, and what
   `visibility` hides, only a browser computes, so run these with
   `bun run specs:browser tree`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../icon-button/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Item = HTMLElement & { updateComplete: Promise<unknown> }

const tree = async (attributes = ''): Promise<Item> => {
  const host = await mount(
    `<helix-tree label="Projects" ${attributes} style="inline-size: 20rem">
      <helix-tree-item value="atlas">Atlas
        <span slot="end">3</span>
        <helix-icon-button slot="actions" label="Actions for Atlas" emphasis="ghost">+</helix-icon-button>
      </helix-tree-item>
      <helix-tree-item value="beacon">Beacon</helix-tree-item>
    </helix-tree>`,
  )
  await settle(host)
  const item = host.querySelector('helix-tree-item') as Item
  await item.updateComplete
  return item
}

const box = (element: Element | null | undefined): DOMRect =>
  (element as Element).getBoundingClientRect()

const button = (item: Item): HTMLElement => item.querySelector('helix-icon-button') as HTMLElement

describe('the actions on a styled row', () => {
  geometry(
    'are hidden at rest and hold their room, so the label does not move as they show',
    async () => {
      const item = await tree()
      expect(getComputedStyle(button(item)).visibility).toBe('hidden')
      const label = box(part(item, 'label')).width
      const end = box(item.querySelector('[slot="end"]')).left
      part(item, 'row')?.dispatchEvent(new PointerEvent('pointerenter'))
      await item.updateComplete
      expect(getComputedStyle(button(item)).visibility).toBe('visible')
      expect(box(part(item, 'label')).width).toBe(label)
      expect(box(item.querySelector('[slot="end"]')).left).toBe(end)
    },
  )

  geometry('show while the row has focus', async () => {
    const item = await tree()
    ;(part(item, 'item') as HTMLElement).focus()
    await item.updateComplete
    expect(getComputedStyle(button(item)).visibility).toBe('visible')
  })

  geometry('sit after `end`, inside the row, and fit its height', async () => {
    const item = await tree()
    const row = box(part(item, 'row'))
    const action = box(button(item))
    expect(action.left).toBeGreaterThanOrEqual(box(item.querySelector('[slot="end"]')).right)
    expect(action.right).toBeLessThanOrEqual(row.right)
    expect(action.top).toBeGreaterThanOrEqual(row.top)
    expect(action.bottom).toBeLessThanOrEqual(row.bottom)
  })

  geometry('come before the grip in a reorderable tree', async () => {
    const item = await tree('reorderable')
    const grip = part(item, 'grip')
    expect(grip).not.toBeNull()
    expect(box(button(item)).right).toBeLessThanOrEqual(box(grip).left)
  })

  geometry(
    'give what they hold the hook color, and a control that sets its own keeps it',
    async () => {
      const item = await tree()
      item.style.setProperty('--tree-actions-color', 'rgb(9, 9, 9)')
      const plain = document.createElement('span')
      plain.slot = 'actions'
      plain.textContent = 'New'
      item.append(plain)
      await item.updateComplete
      expect(getComputedStyle(plain).color).toBe('rgb(9, 9, 9)')
      button(item).style.color = 'rgb(1, 2, 3)'
      expect(getComputedStyle(button(item)).color).toBe('rgb(1, 2, 3)')
    },
  )
})
