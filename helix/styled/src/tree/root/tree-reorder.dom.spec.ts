import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable, unweighted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The item's stylesheet as text. happy-dom resolves no cascade, so what can be
   held here is that a rule exists rather than that it applied: the grip's place
   in a row and the line where an item lands are measured in Chromium. */
const sheet = (): string => {
  const declared = (customElements.get('helix-tree-item') as unknown as { styles: unknown }).styles
  return unweighted(
    (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => String((one as { cssText?: string }).cssText ?? ''))
      .join('\n'),
  )
}

/** The tree's own stylesheet as text, which draws what its shadow root holds. */
const rootSheet = (): string => {
  const declared = (customElements.get('helix-tree') as unknown as { styles: unknown }).styles
  return unweighted(
    (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => String((one as { cssText?: string }).cssText ?? ''))
      .join('\n'),
  )
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('a reorderable tree', () => {
  test('puts the grip at the far end of the row, after a chevron placed there', () => {
    const grip = rule('[part="grip"]')
    expect(grip).toContain('order: 3')
    expect(grip).toContain('cursor: grab')
    expect(grip).toContain('touch-action: none')
    expect(grip).toContain('var(--tree-grip-color, var(--helix-color-foreground-subtle))')
  })

  test('fades the item being moved and draws a line where it lands, through the family hooks', () => {
    expect(rule(':host(:state(dragging)) [part="item"]')).toContain(
      'opacity: var(--tree-dragging-opacity, 0.5)',
    )
    const line = rule(
      ':host(:state(drop-before)) [part="item"]::before, :host(:state(drop-after)) [part="item"]::after',
    )
    expect(line).toContain('var(--tree-drop-indicator-color, var(--helix-color-primary))')
    expect(line).toContain('var(--tree-drop-indicator-size, var(--helix-border-thick))')
    expect(rule(':host(:state(drop-before)) [part="item"]::before')).toContain(
      'inset-block-start: 0',
    )
  })

  test('draws the grip and says each step in the styled tier too', async () => {
    const tree = (await mount(`<helix-tree label="Files" reorderable>
      <helix-tree-item value="a">One</helix-tree-item>
      <helix-tree-item value="b">Two</helix-tree-item>
    </helix-tree>`)) as Updatable
    const items = [...tree.querySelectorAll('helix-tree-item')] as (Updatable & HTMLElement)[]
    for (let round = 0; round < 3; round += 1) {
      await tree.updateComplete
      await Promise.all(items.map((item) => item.updateComplete))
    }
    tree.addEventListener('helix-reorder', (event) => {
      const keys = (event as CustomEvent<{ keys: string[] }>).detail.keys
      tree.append(...keys.map((key) => tree.querySelector(`[value="${key}"]`) as Element))
    })
    expect(part(items[0] as HTMLElement, 'grip')?.getAttribute('aria-hidden')).toBe('true')
    ;(part(items[0] as HTMLElement, 'item') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', {
        altKey: true,
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'ArrowDown',
      }),
    )
    await tree.updateComplete
    expect(part(tree, 'live')?.textContent?.trim()).toBe('One moved to position 2 of 2')
    expect([...tree.querySelectorAll('helix-tree-item')].map((item) => item.textContent)).toEqual([
      'Two',
      'One',
    ])
    tree.remove()
  })
})

describe('the drag preview of a reorderable tree', () => {
  /* The copy a pointer drags is drawn in the tree's own shadow root, so its
     sheet gives it its look. Nothing in it is animated, so it follows the
     pointer the same way whatever the reader's motion setting. */
  test('raises the copy over the page through the family hooks', () => {
    const preview = rootSheet().split('[part="drag-preview"] {')[1]?.split('}')[0] ?? ''
    expect(preview).toContain(
      'background-color: var(--tree-drag-preview-background-color, var(--helix-color-surface-raised))',
    )
    expect(preview).toContain(
      'border: var(--tree-drag-preview-border-width, var(--helix-border-floating)) solid',
    )
    expect(preview).toContain(
      'border-radius: var(--tree-drag-preview-radius, var(--helix-radii-sm))',
    )
    expect(preview).toContain(
      'box-shadow: var(--tree-drag-preview-shadow, var(--helix-shadow-floating))',
    )
    expect(preview).toContain('opacity: var(--tree-drag-preview-opacity, 0.9)')
    expect(preview).not.toContain('transition')
  })
})
