import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

test('the styled selection bar draws from its hook', () => {
  const styles = (
    customElements.get('helix-selection-bar') as unknown as { styles: { cssText: string } }
  ).styles
  expect(styles.cssText).toContain(
    'var(--selection-bar-background-color, var(--helix-color-selected))',
  )
})
