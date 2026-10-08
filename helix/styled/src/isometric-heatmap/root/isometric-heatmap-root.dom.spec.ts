import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The styled tier, which is paint over the headless relief. The drawing, the
 * heights, and the keys are the headless tier's and are asserted there. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../heatmap/index.js')
})

const relief = async (attributes = '') => {
  const host = await mount(
    `<div>
      <table id="commits" data-hidden-visually>
        <caption>Commits</caption>
        <tbody>
          <tr><th scope="row">Mon</th><td>2</td></tr>
          <tr><th scope="row">Tue</th><td>9</td></tr>
        </tbody>
      </table>
      <helix-isometric-heatmap for="commits" label="Commits" ${attributes}></helix-isometric-heatmap>
    </div>`,
  )
  const element = host.querySelector('helix-isometric-heatmap') as HTMLElement & {
    updateComplete: Promise<unknown>
  }
  await element.updateComplete
  return element
}

/** Every sheet a tag adopts, as one text. */
const sheet = (tag: string): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The `--heatmap-tone-*` declarations in a sheet, with the spacing taken out. */
const tones = (text: string): string[] =>
  (text.match(/--heatmap-tone-[\w-]+:[^;]+;/g) ?? []).map((one) => one.replace(/\s+/g, ''))

describe('the styled isometric heatmap', () => {
  test('its strip takes focus to be read by key', async () => {
    const element = await relief()
    expect(part(element, 'strip')?.getAttribute('role')).toBe('application')
    expect(part(element, 'strip')?.getAttribute('tabindex')).toBe('0')
  })

  test("it draws the styled tier's tooltip", async () => {
    const element = await relief()
    element.shadowRoot
      ?.querySelectorAll('[part~="cell"]')[1]
      ?.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }),
      )
    await element.updateComplete
    expect(part(element, 'tooltip-anchor')?.localName).toBe('helix-tooltip')
  })

  /**
   * **The tone ramp is a copy of Heatmap's, and this is what keeps it one.** A
   * family may not compose another family's sheet, and moving the ramp into
   * `shared/` would grow Heatmap's bundle, so the two sheets each write it.
   * A ramp changed in one and not the other would color the same table two
   * ways on one page.
   */
  test("its tones are the flat heatmap's, declaration for declaration", () => {
    const own = tones(sheet('helix-isometric-heatmap'))
    expect(own).toHaveLength(12)
    expect(own).toEqual(tones(sheet('helix-heatmap')))
  })

  test("the sides are shaded from the top face's tone", () => {
    const text = sheet('helix-isometric-heatmap')
    expect(text).toMatch(
      /--_isometric-heatmap-left:\s*color-mix\(\s*in oklab,\s*var\(--_isometric-heatmap-top\)/,
    )
    expect(text).toMatch(
      /--_isometric-heatmap-right:\s*color-mix\(\s*in oklab,\s*var\(--_isometric-heatmap-top\)/,
    )
  })
})
