import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Only the select is imported here, the way a page that asks for nothing else
   imports it. Its groups and separators were left undefined, so the options
   were read as one flat list with no group named. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('a select imported alone', () => {
  test('defines every element its options are written as', () => {
    expect(customElements.get('helix-headless-option')).toBeDefined()
    expect(customElements.get('helix-headless-option-group')).toBeDefined()
    expect(customElements.get('helix-headless-option-separator')).toBeDefined()
  })
})
