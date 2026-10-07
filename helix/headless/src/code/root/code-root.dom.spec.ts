import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('code', () => {
  /* The tag is the whole component. A styled span reads as code to a sighted
     reader and is nothing to anyone else, which is the failure this exists to
     avoid, so it is the one thing worth asserting. */
  test('renders a real code element', async () => {
    const el = await mount('<helix-headless-code>data-density</helix-headless-code>')
    const code = el.shadowRoot?.querySelector('[part="code"]')
    expect(code?.tagName).toBe('CODE')
  })

  /* A translator reads the slotted text through the host, its parent in the
     page, so the host is where the mode has to be. */
  test('is left untranslated unless the page says otherwise', async () => {
    const code = await mount('<helix-headless-code>data-density</helix-headless-code>')
    expect(code.getAttribute('translate')).toBe('no')
    const words = await mount('<helix-headless-code translate="yes">Save</helix-headless-code>')
    expect(words.getAttribute('translate')).toBe('yes')
  })
})
