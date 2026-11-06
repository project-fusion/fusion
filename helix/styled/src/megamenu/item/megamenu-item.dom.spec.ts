import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settled } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../icon/index.js')
  await import('../../navigation/index.js')
  await import('../../text/index.js')
})

type Section = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

/* A column of your own markup through the recipes, and the same column of
   Megamenu Items in a Megamenu Group, which have to draw as the recipes draw:
   the heading, a row with an icon, a row with a dot, and a plain link. */
const RECIPE = `<div data-megamenu-group>
  <helix-text as="h3" data-megamenu-heading variant="title">Work</helix-text>
  <a data-megamenu-item href="#a"><helix-icon name="cube"></helix-icon><strong>Projects</strong><span>Plan and track work.</span></a>
  <a data-megamenu-item href="#b" aria-current="page"><strong>Documents</strong><span>Write and share files.</span></a>
  <a href="#c">Changelog</a>
</div>`

const ITEMS = `<helix-megamenu-group label="Work">
  <helix-megamenu-item href="#a"><helix-icon name="cube" slot="icon"></helix-icon>Projects<helix-text slot="description">Plan and track work.</helix-text></helix-megamenu-item>
  <helix-megamenu-item href="#b" current="page">Documents<helix-text slot="description">Write and share files.</helix-text></helix-megamenu-item>
  <helix-megamenu-item href="#c">Changelog</helix-megamenu-item>
</helix-megamenu-group>`

/** A megamenu holding `column`, opened, in a navigation. */
const opened = async (column: string): Promise<Section> => {
  const bar = await mount(
    `<helix-navigation label="Main"><helix-megamenu label="Products" open-on="click">${column}</helix-megamenu></helix-navigation>`,
  )
  const host = bar.querySelector('helix-megamenu') as Section
  host.open = true
  await host.updateComplete
  await settled(part(host, 'surface'))
  return host
}

/** A box's size and its place in the panel, to the pixel. */
const boxIn = (panel: DOMRect, element: Element): readonly number[] => {
  const box = element.getBoundingClientRect()
  return [box.x - panel.x, box.y - panel.y, box.width, box.height].map(Math.round)
}

/** The boxes a column draws, in reading order: its heading, each row, and each row's words. */
const drawn = (host: Section, recipe: boolean): readonly (readonly number[])[] => {
  const panel = (part(host, 'surface') as HTMLElement).getBoundingClientRect()
  if (recipe) {
    const rows = [...host.querySelectorAll('a')]
    return [
      boxIn(panel, host.querySelector('[data-megamenu-heading]') as Element),
      ...rows.map((row) => boxIn(panel, row)),
      ...rows.flatMap((row) =>
        [...row.querySelectorAll('strong, span')].map((one) => boxIn(panel, one)),
      ),
    ]
  }
  const group = host.querySelector('helix-megamenu-group') as HTMLElement
  const items = [...host.querySelectorAll('helix-megamenu-item')] as HTMLElement[]
  return [
    boxIn(panel, part(group, 'label') as Element),
    ...items.map((item) => boxIn(panel, part(item, 'link') as Element)),
    ...items.flatMap((item) =>
      item.querySelector('[slot="description"]') === null
        ? []
        : [
            boxIn(panel, part(item, 'name') as Element),
            boxIn(panel, item.querySelector('[slot="description"]') as Element),
          ],
    ),
  ]
}

if (hasLayout()) {
  describe('a column of Megamenu Items', () => {
    test('draws its heading, its rows, and their words where the recipes draw them', async () => {
      const recipe = drawn(await opened(RECIPE), true)
      const items = drawn(await opened(ITEMS), false)
      expect(items).toEqual(recipe)
    })

    test('marks the page with a dot before its name, where it has no icon', async () => {
      const host = await opened(ITEMS)
      const page = host.querySelectorAll('helix-megamenu-item')[1] as HTMLElement
      const dot = getComputedStyle(part(page, 'link') as Element, '::before')
      expect(dot.content).toBe('""')
      expect(dot.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    })
  })
}
