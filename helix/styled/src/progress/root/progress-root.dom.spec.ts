import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-progress') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('a slotted label', () => {
  test('sits above the bar across the whole row, with hooks that fall back to today', () => {
    const label = rule('slot[name="label"]::slotted(*)')
    expect(label).toContain('grid-column: 1 / -1')
    expect(label).toContain('display: block')
    expect(label).toContain('color: var(--progress-label-color, var(--helix-color-foreground))')
    expect(label).toContain('font-size: var(--progress-label-size, var(--helix-text-sm))')
    expect(label).toContain('margin-block-end: var(--progress-label-gap, var(--helix-space-2xs))')
  })
})
