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

describe('the styled column manager', () => {
  test('is the headless list, with its parts', async () => {
    const element = await mount('<helix-column-manager></helix-column-manager>')
    expect(part(element, 'title')?.textContent).toBe('Columns')
    expect(part(element, 'list')?.localName).toBe('ul')
  })

  test('draws a row from its hooks, and hides the live region', () => {
    const css = cssOf('helix-column-manager')
    expect(css).toContain(
      'var(--column-manager-item-hover-background-color, var(--helix-color-hover))',
    )
    expect(css).toContain('var(--column-manager-pinned-color, var(--helix-color-primary))')
    expect(css).toContain('clip-path: inset(50%)')
  })
})
