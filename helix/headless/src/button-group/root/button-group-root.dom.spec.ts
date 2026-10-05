import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-headless-button-group label="Text alignment">
  <helix-headless-button>Left</helix-headless-button>
  <helix-headless-button>Center</helix-headless-button>
  <helix-headless-button>Right</helix-headless-button>
</helix-headless-button-group>`

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
      '<helix-headless-button-group aria-label="Alignment" label="Text alignment"></helix-headless-button-group>',
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
    for (const button of [...group.querySelectorAll('helix-headless-button')]) {
      expect(button.hasAttribute('tabindex')).toBe(false)
    }
  })
})

/**
 * What the console was warned while `markup` mounted and settled.
 *
 * The missing-name warning is in development builds only: the package's
 * `test:dom` script passes `bun test --conditions helix-development`, which
 * core's `#audit-name` reads as it reads `development`.
 */
const warnedOn = async (markup: string): Promise<string[]> => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (message: string) => warnings.push(message)
  try {
    await mount(markup)
    await new Promise((done) => setTimeout(done, 5))
  } finally {
    console.warn = original
  }
  return warnings
}

describe('a button group with no name', () => {
  test('is reported once, by its tag', async () => {
    const warnings = await warnedOn('<helix-headless-button-group></helix-headless-button-group>')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-headless-button-group> has no accessible name')
  })

  test('and one named by `label`, `aria-label` or `aria-labelledby` is not', async () => {
    for (const markup of [
      '<helix-headless-button-group label="Alignment"></helix-headless-button-group>',
      '<helix-headless-button-group aria-label="Alignment"></helix-headless-button-group>',
      '<helix-headless-button-group aria-labelledby="t"></helix-headless-button-group><p id="t">Alignment</p>',
    ]) {
      expect([markup, ...(await warnedOn(markup))]).toEqual([markup])
    }
  })
})
