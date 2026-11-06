import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

test('the styled view panel draws from its hook', () => {
  const styles = (
    customElements.get('helix-view-panel') as unknown as { styles: { cssText: string } }
  ).styles
  expect(styles.cssText).toContain('var(--view-panel-rule-color, var(--helix-color-border))')
})
