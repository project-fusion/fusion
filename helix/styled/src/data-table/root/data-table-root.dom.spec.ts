import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

/**
 * The styled tier, which is paint over the headless behavior.
 *
 * The ordering, the events and the controlled contract are the headless tier's
 * and are asserted there; repeating them here would be one suite testing another
 * suite's subject. What is left is the pair of claims the styled tier makes for
 * itself: that a `helix-data-table` is still a grid after the subclass, and that
 * it renders through the *styled* pagination rather than the headless one.
 *
 * That second one is the reason `tier` exists: a template naming a literal tag renders the wrong tier's
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

/* Guarded, so these are honestly *absent* under `bun test` rather than passing
   without checking anything. Every claim below is about a box, and happy-dom has
   none: it reports zero for `clientHeight`, which makes a window of eight rows
   and a window of five thousand indistinguishable. Run them with
   `bun run specs:browser data-table`. */
const geometry = hasLayout() ? test : (): void => {}

describe('a windowed table, where there is layout to window', () => {
  const windowedMarkup = `
    <helix-data-table label="Assets" windowed>
      <helix-table-column field="name" sortable width="14rem">File</helix-table-column>
      <helix-table-column field="size" align="end">Size</helix-table-column>
    </helix-data-table>`

  /* Several cycles rather than one. A measured placement reads the rows it just
     drew and may move the window once more because of what it read, which is a
     second update the first `updateComplete` cannot have waited for. */
  const settle = async (element: { updateComplete: Promise<unknown> }): Promise<void> => {
    for (let pass = 0; pass < 4; pass++) {
      await element.updateComplete
    }
  }

  const windowed = async () => {
    const element = (await mount(windowedMarkup)) as HTMLElement & {
      rows: readonly Record<string, unknown>[]
      updateComplete: Promise<unknown>
    }
    element.rows = Array.from({ length: 5000 }, (_, index) => ({
      name: `asset-${String(index + 1).padStart(4, '0')}.webp`,
      size: 12_000 + index * 137,
    }))
    await settle(element)
    return element
  }

  const first = (element: HTMLElement) =>
    element.shadowRoot?.querySelector('[part="row"]') as HTMLElement | null

  geometry('scrolls the whole result while drawing a window of it', async () => {
    const element = await windowed()
    const box = part(element, 'table') as HTMLElement
    const drawn = element.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0

    expect(drawn).toBeGreaterThan(0)
    expect(drawn).toBeLessThan(100)
    /* The spacers carry the rows that were not drawn, so the scrollbar measures
       five thousand of them rather than the twenty on screen. Sized to the
       window instead, the thumb fills the track and dragging it means nothing. */
    expect(box.scrollHeight).toBeGreaterThan(box.clientHeight * 20)
  })

  geometry('draws other rows once scrolled, and the index follows the content', async () => {
    const element = await windowed()
    const box = part(element, 'table') as HTMLElement
    const before = first(element)?.textContent?.trim()

    box.scrollTop = Math.floor(box.scrollHeight / 2)
    box.dispatchEvent(new Event('scroll'))
    await settle(element)

    const row = first(element)
    expect(row?.textContent?.trim()).not.toBe(before)
    /* Each name carries its own number, so the index and the content are checked
       against each other rather than each against itself: row `n` of the result
       is `aria-rowindex` n + 2 counting the head, and is named n + 1. An index
       that drifts from the row it labels is what this is here to catch. */
    const at = Number(row?.getAttribute('aria-rowindex'))
    expect(at).toBeGreaterThan(2)
    expect(row?.textContent).toContain(String(at - 1).padStart(4, '0'))
  })

  geometry('holds the headings in place while the rows pass under them', async () => {
    const element = await windowed()
    const box = part(element, 'table') as HTMLElement
    const head = element.querySelector('helix-table-column') as HTMLElement
    const offset = () => head.getBoundingClientRect().top - box.getBoundingClientRect().top

    expect(Math.abs(offset())).toBeLessThan(2)

    box.scrollTop = 2_000
    box.dispatchEvent(new Event('scroll'))
    await settle(element)
    /* `position: sticky` on the column elements rather than on `[part="head"]`,
       which is `display: contents` and generates no box to stick. Written on the
       wrapper instead this reads about -2000, with the headings scrolled off the
       top of their own box. */
    expect(Math.abs(offset())).toBeLessThan(2)
  })
})
