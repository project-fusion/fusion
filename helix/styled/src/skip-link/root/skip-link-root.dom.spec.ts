import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what is held here is that the rule exists; the examples spec measures the
   1px box in a browser. */
const sheet = (): string => {
  const declared = (customElements.get('helix-skip-link') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('skip link', () => {
  /* The base layer hid it, so a page without that layer showed the link to
     everyone, fixed in a corner over the page. */
  test('hides itself until focus is inside, with no stylesheet from outside', () => {
    const hidden = sheet().split(':host(:not(:focus-within)) {')[1]?.split('}')[0] ?? ''
    for (const declaration of [
      'block-size: 1px',
      'clip-path: inset(50%)',
      'inline-size: 1px',
      'overflow: hidden',
      'position: absolute',
      'white-space: nowrap',
    ]) {
      expect(hidden).toContain(declaration)
    }
  })
})
