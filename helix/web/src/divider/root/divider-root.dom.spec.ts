import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '../../testing/dom.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const line = (host: HTMLElement): Element | null => part(host, 'line')

describe('divider semantics', () => {
  test('announces itself as a separator', async () => {
    const divider = await mount('<helix-divider></helix-divider>')
    expect(line(divider)?.getAttribute('role')).toBe('separator')
  })

  test('carries its orientation into the accessibility tree', async () => {
    const divider = await mount('<helix-divider orientation="vertical"></helix-divider>')
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('vertical')
  })

  test('defaults to horizontal', async () => {
    const divider = await mount('<helix-divider></helix-divider>')
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
  })
})
