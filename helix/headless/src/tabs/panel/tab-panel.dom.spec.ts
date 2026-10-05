import { beforeAll, describe, expect, test } from 'bun:test'
import { label, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Panel = HTMLElement & { label: string; selected: boolean; updateComplete: Promise<boolean> }

const panel = async (attributes = ''): Promise<Panel> =>
  (await mount(
    `<helix-headless-tab-panel value="one" ${attributes}>Body</helix-headless-tab-panel>`,
  )) as Panel

/**
 * One panel, and the contract that is the panel's rather than the tabs'.
 *
 * **The root already proves the pairing**, which is that selecting a tab reveals
 * the panel of the same value. What the panel owns alone is how it carries its
 * own name, and that is worth its own spec because the obvious markup is wrong
 * in a way nothing reports: `aria-labelledby="tab-${value}"` names an id inside
 * the *tab's* shadow root, and an IDREF resolves only in the tree it is written
 * in, so the panel ends up with no accessible name at all.
 */
describe('one tab panel', () => {
  /* A name rather than a reference, because a name is the one form that crosses
     a shadow boundary. An element reference cannot reach a sibling shadow tree
     either, that being neither the same tree nor an ancestor of it. */
  test('carries its name as a name, which is the only form that crosses', async () => {
    const host = await panel('selected')
    host.label = 'First'
    await host.updateComplete

    expect(label(host)).toBe('First')
    expect(part(host, 'panel')?.hasAttribute('aria-labelledby')).toBe(false)
  })

  /* And no empty name where it was never told one, which would be worse than
     none: an `aria-label=""` is a name a reader is given and cannot use. */
  test('claims no name at all before the root has told it one', async () => {
    expect(label(await panel())).toBeNull()
  })

  /* The panel is hidden in its markup rather than by a stylesheet, and it stays
     focusable, which is the tabpanel pattern: a panel of prose with nothing
     tabbable in it has to be reachable from the tab. */
  test('is hidden in its markup, and is a tab stop when it is showing', async () => {
    const host = await panel('selected')
    const showing = part(host, 'panel')
    expect(showing?.hasAttribute('hidden')).toBe(false)
    expect(role(host)).toBe('tabpanel')
    expect(showing?.getAttribute('tabindex')).toBe('0')

    const other = await panel()
    expect(part(other, 'panel')?.hasAttribute('hidden')).toBe(true)
    expect(role(other)).toBeNull()
  })
})
