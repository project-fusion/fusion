import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Only the palette is imported here, the way a page that asks for nothing
   else imports it. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('a palette imported alone', () => {
  test('defines the option its commands are written as', () => {
    expect(customElements.get('helix-option')).toBeDefined()
  })
})
