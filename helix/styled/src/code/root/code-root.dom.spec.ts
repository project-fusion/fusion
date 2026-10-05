import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   That the fragment is a real `<code>` is the base tier's and is tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-code') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('code', () => {
  test('sets the fragment inline with the prose, under its own tag', async () => {
    const code = await mount('<helix-code>data-density</helix-code>')
    expect(part(code, 'code')?.tagName).toBe('CODE')
    expect(rule(':host')).toContain('display: inline')
  })

  test('a step down the scale in the mono face, as a ratio rather than a rung', () => {
    /* A monospace face reads larger than the prose around it at the same
       nominal size. A ratio, because a fixed 13px inside a 32px heading sits on
       the line like a footnote. */
    expect(rule('[part="code"]')).toContain('font-family: var(--code-font-family, var(--helix-font-mono))')
    expect(rule('[part="code"]')).toContain(
      'font-size: var(--code-size, calc(var(--helix-text-sm) / var(--helix-text-md) * 1em))',
    )
  })

  test('the wash is a mix of the ink, so it composites the same on either scheme', () => {
    // A surface rung is absolute lightness and steps differently against a
    // light page and a dark one; a percentage of the foreground does not.
    expect(rule('[part="code"]')).toContain(
      'color-mix(in oklab, var(--helix-color-foreground) 6%, transparent)',
    )
  })

  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of [
      '--code-background-color',
      '--code-font-family',
      '--code-foreground-color',
      '--code-padding',
      '--code-radius',
      '--code-size',
    ]) {
      // A fallback written across lines keeps its line breaks in the sheet.
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })

  test('carries no attribute of its own', async () => {
    const code = await mount('<helix-code>x</helix-code>')
    expect(code.getAttributeNames()).toEqual([])
  })
})
