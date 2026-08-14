import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('text', () => {
  test('appearance is presentation, `as` is semantics, and they are separate', async () => {
    // A heading that should not look like one is the whole reason these are
    // two properties rather than one.
    const text = await mount('<helix-text appearance="body" as="h3">Title</helix-text>')
    expect(part(text, 'text')?.tagName).toBe('H3')
    expect(text.getAttribute('appearance')).toBe('body')
  })

  test('renders its content through a slot', async () => {
    const text = await mount('<helix-text>Contents</helix-text>')
    expect(text.shadowRoot?.querySelector('slot')).not.toBeNull()
  })
})
