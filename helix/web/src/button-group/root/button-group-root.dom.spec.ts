import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-button-group label="Text alignment">
  <helix-button>Left</helix-button>
  <helix-button>Center</helix-button>
  <helix-button>Right</helix-button>
</helix-button-group>`

describe('button group', () => {
  test('is a named group, set on internals rather than on the host', async () => {
    // A run of buttons with no name is announced as separate controls, which is
    // what the grouping exists to say it is not.
    const group = (await mount(markup)) as HTMLElement & { internals?: ElementInternals }
    expect(role(group)).toBe('group')
    expect(group.internals?.ariaLabel).toBe('Text alignment')
    expect(group.getAttributeNames()).toEqual(['label'])
  })

  test('an author `aria-label` overrides the property', async () => {
    const group = (await mount(
      '<helix-button-group aria-label="Alignment" label="Text alignment"></helix-button-group>',
    )) as HTMLElement
    expect(group.getAttribute('aria-label')).toBe('Alignment')
  })

  test("the buttons stay the consumer's own elements", async () => {
    const group = await mount(markup)
    expect(slotted(group)).toHaveLength(3)
  })

  test('every button keeps its own tab stop', async () => {
    // A group is not a toolbar. The APG toolbar pattern asks for one tab stop
    // with arrow keys inside it, and nothing here touches tabindex.
    const group = await mount(markup)
    for (const button of [...group.querySelectorAll('helix-button')]) {
      expect(button.hasAttribute('tabindex')).toBe(false)
    }
  })
})
