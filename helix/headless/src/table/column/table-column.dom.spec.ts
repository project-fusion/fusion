import { beforeAll, describe, expect, test } from 'bun:test'
import { label, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Column = HTMLElement & {
  isTableColumn: boolean
  sortable: boolean
  textAlign?: string
  track: string
  updateComplete: Promise<boolean>
  width: string
}

const column = async (attributes = ''): Promise<Column> =>
  (await mount(
    `<helix-headless-table-column ${attributes}>Appearance</helix-headless-table-column>`,
  )) as Column

/**
 * One column, and the contract that is the column's rather than the table's.
 *
 * **The table already proves that the tracks add up.** What the column owns
 * alone is the track it contributes when nobody said, and that default is not a
 * detail: it decides whether a table with more content than room destroys its
 * values or scrolls.
 */
describe('one table column', () => {
  /* The floor is `max-content`, and neither smaller value works. A zero floor
     lets a track shrink under its own content, which at 375 squeezed three
     columns to 75px and wrapped `eu-central-1` across lines; `min-content` still
     breaks the value, a hyphen being a wrap opportunity. The table scrolls its
     own box, so a column asks for its longest cell and the overflow has
     somewhere to go. */
  test('grows to fit its longest cell rather than shrinking under it', async () => {
    expect((await column()).track).toBe('minmax(max-content, 1fr)')
  })

  /* Anything valid in a track list works, and the column hands it through
     untouched: the table composes the list and does not parse the parts. */
  test('hands through whatever track it was given', async () => {
    expect((await column('width="16rem"')).track).toBe('16rem')
    expect((await column('width="auto"')).track).toBe('auto')
    expect((await column('width="minmax(0, 2fr)"')).track).toBe('minmax(0, 2fr)')
  })

  /* The heading is a grid item of the table rather than something in a wrapper
     that has to be kept the same width as the cells under it, and the role is on
     the host beside its siblings' for the same reason theirs are: the flat tree
     is where the table's structure is read from. A column and a cell marked
     `header` both come out `columnheader`, which is deliberate: a table whose
     headings carry widths uses one, and a plain one uses the other. */
  test('draws its heading, and is the heading on its host', async () => {
    const host = await column()
    expect(part(host, 'column')?.querySelector('slot')).not.toBeNull()
    expect(role(host)).toBe('columnheader')
    expect(host.shadowRoot?.querySelector('[role]')).toBeNull()
  })

  /* The table finds its columns across the light DOM by this flag rather than by
     `instanceof`, which is cheaper and survives two copies of the module. */
  test('is identifiable by its parent without an instanceof', async () => {
    expect((await column()).isTableColumn).toBe(true)
  })

  /* The heading is placed by whatever sheet draws it, and a sheet reads an
     attribute. Set as a property, which is how React sets it, an edge that did
     not reflect left nothing to select on, so the heading sat at the start over
     a column of digits at the end. Unset, it writes nothing: a column nobody
     aligned carries no attribute a server did not send. */
  test('says which edge it is set to on its host, however that was set', async () => {
    const host = await column()
    expect(host.hasAttribute('text-align')).toBe(false)
    host.textAlign = 'end'
    await host.updateComplete
    expect(host.getAttribute('text-align')).toBe('end')
  })

  /* The same fault on the next property: a data table's sheet gives a sortable
     heading its pointer by the attribute, and a column React made sortable had
     none. Taken away, it goes, so the pointer does not outlive the sort. */
  test('says it is sortable on its host, however that was set', async () => {
    const host = await column()
    expect(host.hasAttribute('sortable')).toBe(false)
    host.sortable = true
    await host.updateComplete
    expect(host.hasAttribute('sortable')).toBe(true)
    host.sortable = false
    await host.updateComplete
    expect(host.hasAttribute('sortable')).toBe(false)
  })
})

describe('table column with no heading words', () => {
  test('its grip and its separator still say what they move', async () => {
    const host = (await mount(
      '<helix-headless-table-column resizable></helix-headless-table-column>',
    )) as Column & { movable: boolean }
    // Written by the table that lets its columns move.
    host.movable = true
    await host.updateComplete
    expect(part(host, 'grip')?.getAttribute('aria-label')).toBe('Move column')
    expect(part(host, 'resizer')?.getAttribute('aria-label')).toBe('Resize column')
  })
})

describe('table column holding controls', () => {
  /* A header takes its name from its content, and the grip and the separator
     are content: the cells under a resizable column were read with "Status 544
     pixels" as their header, and a reorderable one with "Move File File". */
  test('is named by its words alone, and the controls keep their own names', async () => {
    const host = (await mount(
      '<helix-headless-table-column resizable>Status</helix-headless-table-column>',
    )) as Column & { movable: boolean }
    host.movable = true
    await host.updateComplete
    expect(label(host)).toBe('Status')
    expect(part(host, 'grip')?.getAttribute('aria-label')).toBe('Move Status')
    expect(part(host, 'resizer')?.getAttribute('aria-label')).toBe('Resize Status')
  })

  test('is named by its content where it holds none', async () => {
    const host = await column()
    expect(label(host)).toBeNull()
  })
})

describe('a column resized', () => {
  /* `helix-before-resize` asked and nothing said once the width had moved,
     where every other request in the family has its notification. */
  test('says so after the width moves, and not when the request is refused', async () => {
    const host = await column('resizable')
    const heard: string[] = []
    host.addEventListener('helix-resized', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const resizer = part(host, 'resizer') as HTMLElement
    resizer.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }))
    await host.updateComplete
    expect(host.width).toBe('48px')
    expect(heard).toEqual(['48px'])
    host.addEventListener('helix-before-resize', (event) => event.preventDefault())
    resizer.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
    await host.updateComplete
    expect(heard).toEqual(['48px'])
  })
})
