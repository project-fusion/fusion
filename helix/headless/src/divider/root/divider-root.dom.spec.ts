import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const line = (host: HTMLElement): Element | null => part(host, 'line')

describe('divider semantics', () => {
  test('is decorative by default and stays out of the way', async () => {
    // Most rules on a page separate nothing: they underline a heading, or close
    // a section that space had already closed. Announcing every one of them is
    // noise a screen-reader user has to walk past.
    const divider = await mount('<helix-base-divider></helix-base-divider>')
    expect(line(divider)?.getAttribute('role')).toBe('presentation')
    expect(line(divider)?.hasAttribute('aria-orientation')).toBe(false)
  })

  test('announces itself as a separator when it genuinely divides', async () => {
    const divider = await mount('<helix-base-divider announced></helix-base-divider>')
    expect(line(divider)?.getAttribute('role')).toBe('separator')
  })

  test('carries its orientation into the accessibility tree', async () => {
    const divider = await mount(
      '<helix-base-divider announced orientation="vertical"></helix-base-divider>',
    )
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('vertical')
  })

  test('an announced separator with no orientation is horizontal', async () => {
    const divider = await mount('<helix-base-divider announced></helix-base-divider>')
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
  })
})
