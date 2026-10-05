import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   That the marks come from a real `<q>` and that `cite` is carried through
   are the base tier's and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-quote') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('quote', () => {
  test('sets the quotation inline, in the type around it', async () => {
    // A quotation inside a paragraph is that paragraph's text with marks
    // around it, so it takes no size of its own.
    const quote = await mount('<helix-quote>dolor sit amet</helix-quote>')
    expect(part(quote, 'quote')?.tagName).toBe('Q')
    expect(rule(':host')).toContain('display: inline')
    expect(rule(':host')).toContain('font: inherit')
    expect(rule('[part="quote"]')).toContain('font: inherit')
  })

  test('the slant says it is set apart and the ink says how far, and the ink is the hook', () => {
    // Muted rather than subtle, because this is prose a reader is meant to
    // read and not a label they are meant to skip.
    expect(rule('[part="quote"]')).toContain('font-style: var(--quote-font-style, italic)')
    expect(rule('[part="quote"]')).toContain(
      'color: var(--quote-color, var(--helix-color-foreground-muted))',
    )
  })

  /* Radix Themes' Quote is set in the paragraph's type; a page setting a
     pull quote inline wants a face and a weight of its own. */
  test('the face and the weight are hooks that rest on the paragraph\'s own', () => {
    expect(rule('[part="quote"]')).toContain('font-family: var(--quote-font-family, inherit)')
    expect(rule('[part="quote"]')).toContain('font-weight: var(--quote-font-weight, inherit)')
  })

  test('carries no attribute of its own', async () => {
    const bare = await mount('<helix-quote>x</helix-quote>')
    expect(bare.getAttributeNames()).toEqual([])
    const cited = await mount('<helix-quote cite="https://x.test">x</helix-quote>')
    expect(cited.getAttributeNames()).toEqual(['cite'])
  })
})
