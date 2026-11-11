import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

test('the styled row draws the pressed preset and the track from its hooks', () => {
  const styles = (
    customElements.get('helix-quick-filters') as unknown as { styles: { cssText: string } }
  ).styles
  expect(styles.cssText).toContain(
    'var(--quick-filters-background-color, var(--helix-color-surface-sunken))',
  )
  expect(styles.cssText).toContain(
    'var(--quick-filters-pressed-background-color, var(--helix-color-surface-raised))',
  )
})
