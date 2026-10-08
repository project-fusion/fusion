import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  // `gear` is outside the small set the family's entry registers.
  await import('../all/index.js')
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

/* Web Awesome's icon turns, flips and animates its glyph; here a page wrote
   its own transform onto the part. */
describe('turning, flipping and moving the glyph', () => {
  type Icon = HTMLElement & {
    animation?: string
    autoWidth: boolean
    flip?: string
    rotate?: number
    updateComplete: Promise<unknown>
  }

  test('rotate, flip, animation and auto-width reflect, so the sheet can read them', async () => {
    const icon = (await mount('<helix-icon name="gear"></helix-icon>')) as Icon
    icon.rotate = 90
    icon.flip = 'x'
    icon.animation = 'spin'
    icon.autoWidth = true
    await icon.updateComplete
    expect(icon.getAttribute('rotate')).toBe('90')
    expect(icon.getAttribute('flip')).toBe('x')
    expect(icon.getAttribute('animation')).toBe('spin')
    expect(icon.hasAttribute('auto-width')).toBe(true)
  })

  test('the glyph turns by a quarter or by any angle, and flips with a transform', () => {
    expect(rule('[part="svg"]')).toContain('rotate: var(--icon-rotate, none)')
    expect(rule(':host([rotate="90"]) [part="svg"]')).toContain('rotate: 90deg')
    expect(rule(':host([rotate="270"]) [part="svg"]')).toContain('rotate: 270deg')
    /* A transform, so it composes with the `scale` the mirror sets. */
    expect(rule(':host([flip="x"]) [part="svg"]')).toContain('transform: scale(-1, 1)')
    expect(rule(':host([flip="both"]) [part="svg"]')).toContain('transform: scale(-1, -1)')
  })

  test('each animation runs on the host at a hook, and reduced motion stills them all', () => {
    expect(rule(':host([animation="spin"])')).toContain('var(--icon-animation-duration,')
    expect(rule(':host([animation="pulse"])')).toContain('helix-icon-pulse')
    expect(rule(':host([animation="beat"])')).toContain('helix-icon-beat')
    expect(sheet()).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*:host\(\[animation="spin"\]\),\s*:host\(\[animation="pulse"\]\),\s*:host\(\[animation="beat"\]\)\s*\{\s*animation: none/,
    )
  })

  test('auto-width lets the box follow the glyph', () => {
    expect(rule(':host([auto-width])')).toContain('inline-size: auto')
  })
})
