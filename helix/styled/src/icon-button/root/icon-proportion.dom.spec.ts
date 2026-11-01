import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await Promise.all([
    import('../index.js'),
    import('../../announcement/index.js'),
    import('../../breadcrumbs/index.js'),
    import('../../callout/index.js'),
    import('../../carousel/index.js'),
    import('../../code-block/index.js'),
    import('../../combobox/index.js'),
    import('../../copy-button/index.js'),
    import('../../data-table/index.js'),
    import('../../date-input/index.js'),
    import('../../date-picker/index.js'),
    import('../../filter-input/index.js'),
    import('../../icon/index.js'),
    import('../../input/index.js'),
    import('../../list/index.js'),
    import('../../map/index.js'),
    import('../../menu/index.js'),
    import('../../pagination/index.js'),
    import('../../select/index.js'),
    import('../../speed-dial/index.js'),
    import('../../table/index.js'),
    import('../../tag/index.js'),
    import('../../time-input/index.js'),
    import('../../toggle/index.js'),
  ])
})

/* Every svg drawn under a root, through shadow roots, with the button that holds
   it. Nothing is reached by part, so a family that moves its mark stays covered. */
const marks = (root: Element | ShadowRoot, found: SVGElement[] = []): SVGElement[] => {
  if (root instanceof Element && root.shadowRoot) {
    marks(root.shadowRoot, found)
  }
  for (const element of root.querySelectorAll('*')) {
    if (element.shadowRoot) {
      marks(element.shadowRoot, found)
    }
    if (element instanceof SVGSVGElement && element.getBoundingClientRect().width > 0) {
      found.push(element)
    }
  }
  return found
}

const buttonOf = (mark: Element): Element | null => {
  let node: Element | null = mark
  while (node) {
    if (node.matches('button, a[href]')) {
      return node
    }
    const next: Element | null =
      node.assignedSlot ?? node.parentElement ?? (node.getRootNode() as ShadowRoot).host ?? null
    node = next
  }
  return null
}

/* A button 32 tall or less takes the small icon, since the default 20 outweighs
   the small type such a button stands beside. Nothing fills more than three
   quarters of its button at any size: 12 in 16 is the smallest pair that reads
   as a mark in a well. Half a pixel for a size written in `em`. */
const proportioned = (
  markup: string,
  name: string,
  setup?: (host: HTMLElement & Record<string, unknown>) => void,
): void => {
  test(name, async () => {
    const host = await mount(markup)
    setup?.(host as HTMLElement & Record<string, unknown>)
    await (host as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const drawn = marks(host)
    expect(drawn.length).toBeGreaterThan(0)
    for (const mark of drawn) {
      /* Map's compass needle stands at 20 in its 32 button on purpose: a compass is
         read at a glance, and its needle is the control's whole face. */
      if (mark.getAttribute('part') === 'needle') {
        continue
      }
      const button = buttonOf(mark)
      if (!button) {
        continue
      }
      const icon = mark.getBoundingClientRect().height
      const height = button.getBoundingClientRect().height
      expect(icon).toBeLessThanOrEqual(height * 0.75 + 0.5)
      if (height <= 32) {
        expect(icon).toBeLessThanOrEqual(16.5)
      }
    }
  })
}

if (hasLayout()) {
  describe('an icon in a button is in proportion to it', () => {
    proportioned(
      '<helix-icon-button label="Add"><helix-icon name="plus"></helix-icon></helix-icon-button>',
      'Icon Button',
    )
    proportioned('<helix-copy-button value="x"></helix-copy-button>', 'Copy Button')
    proportioned('<helix-code-block>const a = 1</helix-code-block>', 'Code Block')
    proportioned(
      '<helix-code-block label="a.ts">const a = 1</helix-code-block>',
      'Code Block header',
    )
    proportioned('<helix-callout dismissible>Saved</helix-callout>', 'Callout')
    proportioned('<helix-announcement dismissible>Saved</helix-announcement>', 'Announcement')
    proportioned('<helix-tag dismissible>Label</helix-tag>', 'Tag')
    proportioned(
      '<helix-filter-chip dismissible label="Owner">Ada</helix-filter-chip>',
      'Filter Chip',
    )
    proportioned('<helix-input clearable value="x"></helix-input>', 'Input')
    proportioned('<helix-pagination default-page="4" pages="12"></helix-pagination>', 'Pagination')
    proportioned('<helix-carousel><div>One</div><div>Two</div></helix-carousel>', 'Carousel')
    proportioned('<helix-date-picker></helix-date-picker>', 'Date Picker')
    proportioned('<helix-date-input label="Due"></helix-date-input>', 'Date Input')
    proportioned('<helix-time-input label="Start"></helix-time-input>', 'Time Input')
    proportioned('<helix-map label="City"></helix-map>', 'Map')
    proportioned(
      '<helix-toggle-group default-value="a"><helix-toggle value="a"><helix-icon name="sun" slot="start"></helix-icon>Light</helix-toggle></helix-toggle-group>',
      'Toggle',
    )
    proportioned(
      '<helix-list label="Steps" reorderable><helix-list-item value="a">One</helix-list-item></helix-list>',
      'List grip',
    )
    proportioned(
      `<helix-table label="Queue" reorderable>
        <helix-table-column>Document</helix-table-column>
        <helix-table-row value="a"><helix-table-cell>One</helix-table-cell></helix-table-row>
      </helix-table>`,
      'Table row grip',
    )
    proportioned(
      `<helix-data-table label="Queue" reorderable-rows row-key="id">
        <helix-table-column field="name">Document</helix-table-column>
      </helix-data-table>`,
      'Data Table row grip',
      (host) => {
        host.rows = [{ id: 'a', name: 'One' }]
      },
    )
    proportioned(
      `<helix-data-table label="Queue" reorderable row-key="id">
        <helix-table-column field="name">Document</helix-table-column>
      </helix-data-table>`,
      'Table column grip',
      (host) => {
        host.rows = [{ id: 'a', name: 'One' }]
      },
    )
    proportioned(
      `<helix-speed-dial label="Actions">
        <helix-speed-dial-item value="a"><helix-icon name="plus"></helix-icon></helix-speed-dial-item>
      </helix-speed-dial>`,
      'Speed Dial item',
      (host) => {
        host.open = true
      },
    )
    proportioned(
      `<helix-breadcrumbs aria-label="Trail">
        <helix-breadcrumb href="#a"><helix-icon name="house" slot="start"></helix-icon>Home</helix-breadcrumb>
        <helix-breadcrumb>
          <helix-menu label="Hidden">
            <helix-icon-button label="Hidden" slot="trigger"><helix-icon name="dots-three"></helix-icon></helix-icon-button>
            <helix-menu-item>One</helix-menu-item>
          </helix-menu>
        </helix-breadcrumb>
      </helix-breadcrumbs>`,
      'Breadcrumbs',
    )
  })

  /* A caret the page hands in is drawn as the field's own is, so a swap changes
     the glyph and not the weight of the field. */
  describe('a slotted caret is the size of the default', () => {
    for (const tag of ['helix-select', 'helix-combobox']) {
      test(tag, async () => {
        const plain = await mount(
          `<${tag} label="Plain"></${tag}>
          <${tag} label="Own"><helix-icon name="caret-down" slot="indicator"></helix-icon></${tag}>`,
        )
        const own = plain.nextElementSibling as HTMLElement & { updateComplete: Promise<unknown> }
        await own.updateComplete
        const drawn = plain.shadowRoot?.querySelector('[part="indicator"]')
        const slotted = own.querySelector('helix-icon')
        expect(slotted?.getBoundingClientRect().height).toBe(drawn?.getBoundingClientRect().height)
      })
    }
  })
}
