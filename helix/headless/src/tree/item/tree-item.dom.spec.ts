import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** A tree of one branch holding one leaf, plus a leaf beside the branch. */
const mixed = `
  <helix-headless-tree label="Files">
    <helix-headless-tree-item default-open value="branch">Branch
      <helix-headless-tree-item slot="children" value="child">Child</helix-headless-tree-item>
    </helix-headless-tree-item>
    <helix-headless-tree-item value="leaf">Leaf</helix-headless-tree-item>
  </helix-headless-tree>`

const items = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('helix-headless-tree-item'),
]

describe('tree item structure', () => {
  /* An item nested with no `slot="children"` was read as words in its
     parent's label, "src app.ts", and drawn as a leaf, and nothing said so. */
  test('says in development that an item nested without its slot is read as the label', async () => {
    const warnings: string[] = []
    const warn = console.warn
    console.warn = (message: string) => warnings.push(String(message))
    try {
      await mount(mixed)
      expect(warnings.filter((one) => one.includes('slot="children"'))).toEqual([])
      await mount(
        '<helix-headless-tree label="Files"><helix-headless-tree-item>src<helix-headless-tree-item>app.ts</helix-headless-tree-item></helix-headless-tree-item></helix-headless-tree>',
      )
      expect(warnings.filter((one) => one.includes('slot="children"'))).toHaveLength(1)
    } finally {
      console.warn = warn
    }
  })

  test('a branch draws a chevron and a leaf does not', async () => {
    const tree = await mount(mixed)
    const [branch, , leaf] = items(tree)
    expect([
      !!part(branch as HTMLElement, 'toggle'),
      !!part(leaf as HTMLElement, 'toggle'),
    ]).toEqual([true, false])
  })

  /* A glyph written as text, such as "+", joined the row's name. */
  test('keeps what is slotted as the chevron out of the row name', async () => {
    const tree = await mount(mixed)
    const [branch] = items(tree)
    const slot = (branch as HTMLElement).shadowRoot?.querySelector('slot[name="chevron"]')
    expect(slot?.getAttribute('aria-hidden')).toBe('true')
  })

  test('the row is the treeitem, and the group is inside it', async () => {
    const tree = await mount(mixed)
    const [branch] = items(tree)
    const row = part(branch as HTMLElement, 'item')
    expect(row?.getAttribute('role')).toBe('treeitem')
    expect(row?.querySelector('[part="group"]')).not.toBeNull()
  })

  test('a closed branch hides its children until found, and opens on a match among them', async () => {
    const tree = await mount(`
      <helix-headless-tree label="Files">
        <helix-headless-tree-item value="branch">Branch
          <helix-headless-tree-item slot="children" value="child">Child</helix-headless-tree-item>
        </helix-headless-tree-item>
      </helix-headless-tree>`)
    const [branch] = items(tree) as Array<
      HTMLElement & { open: boolean; updateComplete: Promise<unknown> }
    >
    await branch?.updateComplete
    const group = part(branch as HTMLElement, 'group') as HTMLElement
    expect(group.getAttribute('hidden')).toBe('until-found')
    expect(group.hasAttribute('role')).toBe(false)
    group.dispatchEvent(new Event('beforematch', { bubbles: true }))
    await branch?.updateComplete
    expect(branch?.open).toBe(true)
    expect(group.hasAttribute('hidden')).toBe(false)
    expect(group.getAttribute('role')).toBe('group')
  })

  /* `href` hands the row to an anchor and the wrapper drops to `none`: an anchor
     cannot contain the group, because the group holds more anchors and nesting
     them is markup no assistive technology reads the way it looks. */
  test('a link row is an anchor, and stops claiming to be the treeitem', async () => {
    const tree = await mount(
      `<helix-headless-tree label="Nav"><helix-headless-tree-item href="/a" value="a">A</helix-headless-tree-item></helix-headless-tree>`,
    )
    const [item] = items(tree)
    const row = part(item as HTMLElement, 'row')
    expect(row?.tagName).toBe('A')
    expect(part(item as HTMLElement, 'item')?.getAttribute('role')).toBe('none')
  })

  test('writes target and rel only when asked', async () => {
    const tree = await mount(
      `<helix-headless-tree label="Nav"><helix-headless-tree-item href="/a" value="a">A</helix-headless-tree-item></helix-headless-tree>`,
    )
    const row = part(items(tree)[0] as HTMLElement, 'row') as HTMLElement
    expect([row.hasAttribute('target'), row.hasAttribute('rel')]).toEqual([false, false])
  })
})
