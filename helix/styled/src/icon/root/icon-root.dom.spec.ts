import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The glyph lookup, the label and the hidden state are the base tier's and are
   tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-icon') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('icon', () => {
  test('draws the glyph the base tier renders, filling the box the host sizes', async () => {
    const icon = await mount('<helix-icon name="gear"></helix-icon>')
    expect(part(icon, 'svg')).not.toBeNull()
    expect(rule('[part="svg"]')).toContain('block-size: 100%')
    expect(rule('[part="svg"]')).toContain('inline-size: 100%')
  })

  test('the box is the icon hook, falling back to the icon step, on a baseline with no gap', () => {
    /* `inline-flex` rather than `inline-block`, so the SVG has no descender
       gap under it and sits on the text baseline of whatever it accompanies. */
    const host = rule(':host')
    expect(host).toContain('block-size: var(--icon-size, var(--helix-size-icon))')
    expect(host).toContain('inline-size: var(--icon-size, var(--helix-size-icon))')
    expect(host).toContain('display: inline-flex')
  })

  test('a glyph drawn from a named import takes the same sizing, through the shared glyph sheet', async () => {
    /* Imported here rather than at the top of the file: the sheet pulls in
       `@fusion.dev/helix-core`, and a module that touches the DOM globals before
       `registerDom` has installed them takes happy-dom's parser down with it. */
    const { styles } = await import('../../shared/glyph/glyph.css.js')
    const glyph = String((styles as { cssText?: string }).cssText ?? styles)
    expect(glyph).toContain('[data-glyph]')
    expect(glyph).toContain('block-size: var(--icon-size, var(--helix-size-icon))')
    expect(glyph).toContain('inline-size: var(--icon-size, var(--helix-size-icon))')
  })

  test('carries no attribute of its own', async () => {
    const icon = await mount('<helix-icon name="gear"></helix-icon>')
    expect(icon.getAttributeNames()).toEqual(['name'])
  })
})
