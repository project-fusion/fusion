import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** Every rule the element's sheets hold, as one string. */
const sheet = (tag: string): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('the speed dial hooks', () => {
  /* One custom property on the root and one on the action were all a page
     could reach; the colors, the travel and the stagger were fixed. */
  test('are what the sheets read, each falling back to the value it replaced', () => {
    const root = sheet('helix-speed-dial')
    expect(root).toContain('var(--speed-dial-travel, var(--helix-space-md))')
    expect(root).toContain('var(--speed-dial-stagger, calc(var(--helix-duration-fast) / 3))')
    const item = sheet('helix-speed-dial-item')
    for (const [hook, fallback] of [
      ['--speed-dial-item-background-color', '--helix-color-surface-overlay'],
      ['--speed-dial-item-color', '--helix-color-foreground'],
      ['--speed-dial-label-background-color', '--helix-color-surface-overlay'],
      ['--speed-dial-label-color', '--helix-color-foreground'],
    ]) {
      expect(item).toContain(`var(${hook}, var(${fallback}))`)
    }
  })

  test('labels="hover" hides the names until an action is under the pointer or focused', () => {
    expect(sheet('helix-speed-dial')).toContain('--_speed-dial-label-opacity: 0')
    const item = sheet('helix-speed-dial-item')
    expect(item).toContain('opacity: var(--_speed-dial-label-opacity, 1)')
    expect(item).toMatch(/\[part="item"\]:focus-visible \[part="label"\]/)
  })
})
