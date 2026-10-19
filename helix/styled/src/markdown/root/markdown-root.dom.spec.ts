import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'
import type { HelixMarkdown } from './markdown-root.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-markdown') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('markdown', () => {
  test('draws a fence and an alert with this tier’s elements', async () => {
    const element = (await mount('<helix-markdown></helix-markdown>')) as HelixMarkdown
    element.text = '```ts\nlet a\n```\n\n> [!NOTE]\n> Text'
    await element.updateComplete
    expect(element.querySelector('helix-code-block')?.getAttribute('language')).toBe('ts')
    expect(element.querySelector('helix-callout')?.getAttribute('tone')).toBe('info')
    expect(element.querySelector('helix-headless-code-block, helix-headless-callout')).toBeNull()
  })

  test('wraps the block still arriving plainly', () => {
    expect(sheet()).toContain(':host(:state(streaming)) ::slotted(:last-child)')
    expect(sheet()).toContain('text-wrap: wrap')
  })
})
