import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The direction word, the judgment text and the reflecting pair are the base
   tier's and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-trend') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('trend', () => {
  test('draws the arrow through the shared glyph sheet, which arrives with this one', async () => {
    // The arrow is a named import rather than a `<helix-icon>`, so it is sized
    // by the `[data-glyph]` rule and that rule has to be adopted here.
    const trend = await mount('<helix-trend direction="up" good="up">12%</helix-trend>')
    expect(part(trend, 'icon')?.hasAttribute('data-glyph')).toBe(true)
    expect(rule('[data-glyph]')).toContain('block-size: var(--icon-size, var(--helix-size-icon))')
    expect(rule('[part="icon"]')).toContain('--icon-size: var(--trend-icon-size, 1em)')
  })

  test('gray until told what good means', () => {
    /* Not a fallback that never fires: it is the state of every trend whose
       consumer has not set `good`, and it is meant to be. */
    expect(sheet()).toContain('--_trend-color: var(--helix-color-foreground-muted)')
    expect(sheet()).toContain('color: var(--trend-color, var(--_trend-color))')
  })

  test('the judgment is four cases and no arithmetic', () => {
    // CSS has no exclusive-or, so the pair is written out. Neutral matches
    // none of them and stays gray, as does any trend with no `good` set.
    expect(sheet()).toContain(
      ':host([direction="up"][good="up"]),\n:host([direction="down"][good="down"]) {',
    )
    expect(rule(':host([direction="down"][good="down"])')).toContain(
      '--_trend-color: var(--helix-color-success)',
    )
    expect(sheet()).toContain(
      ':host([direction="up"][good="down"]),\n:host([direction="down"][good="up"]) {',
    )
    expect(rule(':host([direction="down"][good="up"])')).toContain(
      '--_trend-color: var(--helix-color-danger)',
    )
    expect(sheet()).not.toContain('[direction="neutral"]')
  })

  test('the direction word is out of sight and still in the tree', () => {
    // The clip rather than `display: none`, which would leave the direction
    // carried by a colored arrow alone.
    expect(rule('[part="direction"]')).toContain('clip-path: inset(50%)')
    expect(rule('[part="direction"]')).not.toContain('display: none')
  })

  test('the label is quieter than the metric, and quiet enough to still be read', () => {
    // Muted rather than subtle: subtle is 3.78:1 on the light surface, under
    // the 4.5:1 this text needs.
    expect(rule('slot[name="label"]')).toContain('color: var(--helix-color-foreground-muted)')
    expect(rule('slot[name="label"]')).toContain('font-weight: var(--helix-weight-regular)')
  })
})
