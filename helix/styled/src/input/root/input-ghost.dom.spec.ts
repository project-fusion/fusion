import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* The inline field the table edits in, which the other text fields share. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../date-input/index.js')
  await import('../../number-input/index.js')
  await import('../../time-input/index.js')
})

const cssOf = (tag: string): string => {
  const styles = (customElements.get(tag) as unknown as { styles: unknown }).styles
  const list = Array.isArray(styles) ? styles : [styles]
  return list.map((style) => String((style as { cssText?: string }).cssText ?? '')).join('\n')
}

describe('a ghost field', () => {
  test('reflects its emphasis, set as a property', async () => {
    const element = (await mount('<helix-input label="Terms"></helix-input>')) as HTMLElement & {
      emphasis?: string
      updateComplete: Promise<unknown>
    }
    element.emphasis = 'ghost'
    await element.updateComplete
    expect(element.getAttribute('emphasis')).toBe('ghost')
  })

  test('rings itself inside its box while it is edited, in each family that takes it', () => {
    for (const tag of [
      'helix-input',
      'helix-number-input',
      'helix-date-input',
      'helix-time-input',
    ]) {
      expect(cssOf(tag)).toContain(
        'inset 0 0 0 var(--helix-border-thick) var(--helix-color-primary)',
      )
    }
  })

  test('underlines its words from its hook', () => {
    expect(cssOf('helix-input')).toContain('var(--input-ghost-underline, none) dotted')
  })
})
