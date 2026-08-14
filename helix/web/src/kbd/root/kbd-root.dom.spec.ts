import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('kbd', () => {
  test('renders a real kbd, so the markup still means "press this"', async () => {
    const kbd = await mount('<helix-kbd>K</helix-kbd>')
    expect(part(kbd, 'kbd')?.tagName).toBe('KBD')
  })
})
