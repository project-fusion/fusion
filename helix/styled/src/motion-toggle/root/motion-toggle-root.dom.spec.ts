import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, unweighted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('the styled motion toggle', () => {
  test('renders the button with its icon, and the floating look', async () => {
    const host = (await mount(
      '<div><helix-motion-toggle></helix-motion-toggle></div>',
    )) as HTMLElement
    const element = host.querySelector('helix-motion-toggle') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await element.updateComplete
    expect(part(element, 'button')?.querySelector('svg')).not.toBeNull()
    const sheet = unweighted(
      String(
        (customElements.get('helix-motion-toggle') as unknown as { styles: { cssText: string } })
          .styles.cssText,
      ),
    )
    expect(sheet).toContain('--motion-toggle-background-color')
    expect(sheet).toContain(':host(:state(paused))')
  })
})
