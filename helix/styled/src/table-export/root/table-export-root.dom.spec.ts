import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

test('the styled panel draws its segmented groups from their hook, and hides the live region', () => {
  const styles = (
    customElements.get('helix-table-export') as unknown as { styles: { cssText: string }[] }
  ).styles
  const css = styles.map((one) => one.cssText).join('\n')
  expect(css).toContain(
    'var(--table-export-segment-background-color, var(--helix-color-surface-sunken))',
  )
  expect(css).toContain('clip-path: inset(50%)')
})
