import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const svg = (host: HTMLElement): Element | null => part(host, 'svg')

describe('icon rendering', () => {
  test('draws the named path from the set', async () => {
    const icon = await mount('<helix-icon name="check"></helix-icon>')
    expect(svg(icon)).not.toBeNull()
    expect(svg(icon)?.querySelector('path')?.getAttribute('d')).toBe('M20 6L9 17l-5-5')
  })

  test('an unknown name renders nothing rather than an empty box', async () => {
    // A typo that left a sized blank would look like a deliberate gap.
    const icon = await mount('<helix-icon name="not-a-real-icon"></helix-icon>')
    expect(svg(icon)).toBeNull()
  })

  test('is decoration by default, and hidden from assistive technology', async () => {
    const icon = await mount('<helix-icon name="close"></helix-icon>')
    expect(svg(icon)?.getAttribute('aria-hidden')).toBe('true')
    expect(svg(icon)?.hasAttribute('role')).toBe(false)
  })

  test('a labelled icon becomes content with a name', async () => {
    const icon = await mount('<helix-icon name="close" label="Dismiss"></helix-icon>')
    expect(svg(icon)?.getAttribute('role')).toBe('img')
    expect(svg(icon)?.getAttribute('aria-label')).toBe('Dismiss')
    expect(svg(icon)?.hasAttribute('aria-hidden')).toBe(false)
  })

  test('takes its color from the text around it', async () => {
    const icon = await mount('<helix-icon name="check"></helix-icon>')
    expect(svg(icon)?.getAttribute('stroke')).toBe('currentColor')
  })
})
