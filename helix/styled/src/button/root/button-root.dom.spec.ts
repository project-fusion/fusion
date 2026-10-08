import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-button') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/* Under reduced motion the base layer sets every duration token to 0.01ms, so a
   crawl scaled from one turned the ring about eight thousand times a second. */
describe('the pending ring under reduced motion', () => {
  test('turns once in four seconds, on no duration token', () => {
    const turn =
      sheet()
        .split('@media (prefers-reduced-motion: reduce)')
        .slice(1)
        .find((block) => /^\s*\{\s*\[part="spinner"\]\s*\{/.test(block))
        ?.split('}')[0] ?? ''
    expect(turn).toContain('animation-duration: var(--_button-crawl)')
    expect(turn).not.toContain('--helix-duration')
    expect(sheet()).toContain('--_button-crawl: 4s')
  })
})
