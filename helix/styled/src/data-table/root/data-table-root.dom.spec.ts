import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

/**
 * The styled tier, which is paint over the headless behavior.
 *
 * The ordering, the events and the controlled contract are the headless tier's
 * and are asserted there; repeating them here would be one suite testing another
 * suite's subject. What is left is the pair of claims the styled tier makes for
 * itself: that a `helix-data-table` is still a grid after the subclass, and that
 * it renders through the *styled* pagination rather than the headless one.
 *
 * That second one is the whole of `check:composed`'s subject and the reason
 * `tier` exists: a template naming a literal tag renders the wrong tier's
 * element, and the wrong tier's element is unstyled rather than absent, so
 * nothing throws and the table just looks broken in one corner.
 */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

const markup = `
  <helix-data-table label="Objects" page-size="2">
    <helix-table-column field="name" sortable>Name</helix-table-column>
    <helix-table-column field="size" align="end">Size</helix-table-column>
  </helix-data-table>`

const table = async () => {
  const element = (await mount(markup)) as HTMLElement & {
    rows: readonly Record<string, unknown>[]
    updateComplete: Promise<unknown>
  }
  element.rows = [
    { name: 'alpha', size: 30 },
    { name: 'bravo', size: 4 },
    { name: 'charlie', size: 1000 },
  ]
  await element.updateComplete
  return element
}

describe('the styled data table', () => {
  test('it is still a grid, and the roles survive the subclass', async () => {
    const element = await table()
    expect(role(element)).toBe('grid')
    expect(part(element, 'table')?.getAttribute('role')).toBe('rowgroup')
    expect(part(element, 'head')?.getAttribute('role')).toBe('row')
  })

  test('the columns a consumer declares are the styled ones', async () => {
    const element = await table()
    expect(element.querySelectorAll('helix-table-column')).toHaveLength(2)
    expect(part(element, 'cell')?.textContent?.trim()).toBe('alpha')
  })

  /**
   * `tier` is `helix-` on this class, so the interpolated tag is the styled
   * pagination. Rendered as `helix-headless-pagination` it would be an unstyled
   * control in the footer of a styled table, and nothing would throw.
   */
  test('the pagination it composes is the styled one', async () => {
    const element = await table()
    const pagination = part(element, 'pagination')
    expect(pagination).not.toBeNull()
    expect(pagination?.localName).toBe('helix-pagination')
  })

  test('the cells span every column when there is nothing to show', async () => {
    const element = (await mount(markup)) as HTMLElement & {
      rows: readonly Record<string, unknown>[]
      updateComplete: Promise<unknown>
    }
    element.rows = []
    await element.updateComplete
    expect(part(element, 'empty')).not.toBeNull()
  })
})
