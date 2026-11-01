import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Stop = HTMLElement & {
  at: number | undefined
  for: string | undefined
  updateComplete: Promise<boolean>
  pattern: string | undefined
}

describe('strands stop', () => {
  test('draws nothing', async () => {
    const stop = (await mount('<helix-strands-stop for="hero"></helix-strands-stop>')) as Stop
    await stop.updateComplete
    expect(stop.shadowRoot?.children.length ?? 0).toBe(0)
  })

  test('writes nothing it was not given', async () => {
    const stop = (await mount('<helix-strands-stop></helix-strands-stop>')) as Stop
    await stop.updateComplete
    expect(stop.getAttributeNames()).toEqual([])
  })

  test('reflects a change made from script, which is what its parent watches', async () => {
    /* The parent lays its ribbon out again when a stop's attributes change, so
       a property set without an attribute would leave the page drawn for the
       old value. */
    const stop = (await mount('<helix-strands-stop></helix-strands-stop>')) as Stop
    stop.for = 'pricing'
    stop.pattern = 'waves'
    stop.at = 0.25
    await stop.updateComplete
    expect(stop.getAttribute('for')).toBe('pricing')
    expect(stop.getAttribute('pattern')).toBe('waves')
    expect(stop.getAttribute('at')).toBe('0.25')
  })

  test('takes no room in the content box it is slotted into', async () => {
    const { styles } = await import('./strands-stop.css.js')
    const sheet = (styles as { cssText?: string }).cssText ?? String(styles)
    expect(sheet).toMatch(/:host\s*\{\s*display: none;?\s*\}/)
  })
})
