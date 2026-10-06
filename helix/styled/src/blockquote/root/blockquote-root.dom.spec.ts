import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The `<blockquote>`, the caption and `cite` are the base tier's and are tested
   there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-blockquote') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('blockquote', () => {
  test('draws the passage and the attribution the base tier renders, under its own tag', async () => {
    const quote = await mount(
      '<helix-blockquote><p>Said so.</p><span slot="attribution">A</span></helix-blockquote>',
    )
    expect(part(quote, 'blockquote')).not.toBeNull()
    expect(part(quote, 'attribution')).not.toBeNull()
  })

  test('the type is on the slot, so a slotted paragraph keeps its markup and takes the face', () => {
    /* A pulled quotation is a change of voice and the type is what says so:
       larger, on the display face, a step back from full strength. On the slot
       rather than on `::slotted(*)`, so bare text and a `<p>` come out alike. */
    const passage = rule('slot:not([name])')
    expect(passage).toContain(
      'font-family: var(--blockquote-font-family, var(--helix-font-display))',
    )
    expect(passage).toContain('font-size: var(--blockquote-size, var(--helix-text-xl))')
    expect(passage).toContain('color: var(--blockquote-color, var(--helix-color-foreground-muted))')
  })

  test('an attribution nobody wrote takes no room, and one that was keeps its caption', async () => {
    /* The base tier marks the caption empty; this sheet is what takes the box
       out, since a caption with nothing in it is still a gap under the quote.
       Both halves are needed for the gap to close. */
    const bare = await mount('<helix-blockquote>Said so.</helix-blockquote>')
    expect(part(bare, 'attribution')?.hasAttribute('data-empty')).toBe(true)
    expect(rule('[part="attribution"][data-empty]')).toContain('display: none')

    const cited = await mount(
      '<helix-blockquote>Said so.<span slot="attribution">A</span></helix-blockquote>',
    )
    expect(part(cited, 'attribution')?.hasAttribute('data-empty')).toBe(false)
  })

  test('the attribution stands off the passage as a separate thing', () => {
    expect(rule('[part="attribution"]')).toContain('var(--helix-space-sm))')
    expect(rule('[part="attribution"]')).toContain(
      'font-size: var(--blockquote-attribution-size, var(--helix-text-sm))',
    )
  })

  test('carries no attribute of its own', async () => {
    const bare = await mount('<helix-blockquote>x</helix-blockquote>')
    expect(bare.getAttributeNames()).toEqual([])
    const cited = await mount('<helix-blockquote cite="https://x.test">x</helix-blockquote>')
    expect(cited.getAttributeNames()).toEqual(['cite'])
  })
})

describe('blockquote hooks', () => {
  /* Radix Themes' Blockquote takes a weight; the leading follows a face a
     page swaps in. */
  test('the passage takes a weight and a line height that fall back to today', () => {
    const passage = rule('slot:not([name])')
    expect(passage).toContain(
      'font-weight: var(--blockquote-font-weight, var(--helix-weight-medium))',
    )
    expect(passage).toContain(
      'line-height: var(--blockquote-line-height, var(--helix-leading-tight))',
    )
  })

  test('the attribution takes a color and a gap that fall back to today', () => {
    const attribution = rule('[part="attribution"]')
    expect(attribution).toContain(
      'color: var(--blockquote-attribution-color, var(--helix-color-foreground-muted))',
    )
    expect(attribution).toContain(
      'margin-block-start: var(--blockquote-gap, var(--helix-space-sm))',
    )
  })
})
