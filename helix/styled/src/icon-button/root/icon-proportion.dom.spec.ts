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
    import('../../date-picker/index.js'),
    import('../../filter-input/index.js'),
    import('../../icon/index.js'),
    import('../../input/index.js'),
    import('../../menu/index.js'),
    import('../../pagination/index.js'),
    import('../../select/index.js'),
    import('../../tag/index.js'),
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
const proportioned = (markup: string, name: string): void => {
  test(name, async () => {
    const host = await mount(markup)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const drawn = marks(host)
    expect(drawn.length).toBeGreaterThan(0)
    for (const mark of drawn) {
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
