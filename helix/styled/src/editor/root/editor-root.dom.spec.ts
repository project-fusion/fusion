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

describe('the styled editor', () => {
  test('is the headless frame, with its parts, and composes the styled tools', async () => {
    const element = await mount('<helix-editor label="Notes"><div></div></helix-editor>')
    expect(part(element, 'region')?.getAttribute('aria-label')).toBe('Notes')
    expect(part(element, 'viewport')).not.toBeNull()
    expect(part(element, 'bold')?.localName).toBe('helix-icon-button')
    expect(part(element, 'controls')?.localName).toBe('helix-toolbar')
    expect(part(element, 'block-menu')?.localName).toBe('helix-menu')
  })

  test('keeps the toolbar at the top of the page, and the lines to a measure', () => {
    const css = cssOf('helix-editor')
    expect(css).toContain('position: sticky')
    expect(css).toContain('var(--editor-header-offset, 0)')
    expect(css).toContain('var(--editor-measure, 72ch)')
    expect(css).toContain('overflow: clip')
  })

  test('fill and separation reflect, so the sheet can select on them when a script sets them', async () => {
    const element = (await mount('<helix-editor></helix-editor>')) as HTMLElement & {
      fill: boolean
      separation?: string
      updateComplete: Promise<unknown>
    }
    element.fill = true
    element.separation = 'plain'
    await element.updateComplete
    expect(element.hasAttribute('fill')).toBe(true)
    expect(element.getAttribute('separation')).toBe('plain')
  })
})
