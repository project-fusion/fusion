import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const cssOf = (tag: string): string => {
  const styles = (customElements.get(tag) as unknown as { styles: unknown }).styles
  const list = Array.isArray(styles) ? styles : [styles]
  return list.map((style) => String((style as { cssText?: string }).cssText ?? '')).join('\n')
}

describe('the styled find', () => {
  test('is the headless bar, with its parts, and composes the styled buttons', async () => {
    const element = await mount('<helix-find open></helix-find>')
    expect(part(element, 'bar')?.getAttribute('role')).toBe('search')
    expect(part(element, 'controls')?.localName).toBe('helix-toolbar')
    expect(part(element, 'next')?.localName).toBe('helix-icon-button')
  })

  test('draws the bar from its hooks, and hides the live region', () => {
    const css = cssOf('helix-find')
    expect(css).toContain('var(--find-background-color, var(--helix-color-surface-raised))')
    expect(css).toContain('var(--find-field-background-color, var(--helix-color-background))')
    expect(css).toContain('clip-path: inset(50%)')
  })
})
