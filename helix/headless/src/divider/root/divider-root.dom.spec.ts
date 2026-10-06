import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const line = (host: HTMLElement): Element | null => part(host, 'line')

describe('divider semantics', () => {
  /* Decorative by default left every rule out of the tree, where `<hr>` and
     every peer's separator are in it. */
  test('is a separator by default, as `<hr>` is', async () => {
    const divider = await mount('<helix-headless-divider></helix-headless-divider>')
    expect(line(divider)?.getAttribute('role')).toBe('separator')
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
  })

  test('`decorative` takes a rule that separates nothing out of the way', async () => {
    const divider = await mount('<helix-headless-divider decorative>Or</helix-headless-divider>')
    expect(line(divider)?.getAttribute('role')).toBe('presentation')
    expect(line(divider)?.hasAttribute('aria-orientation')).toBe(false)
    expect(line(divider)?.hasAttribute('aria-labelledby')).toBe(false)
  })

  test('`announced`, the old opt-in, keeps a separator over `decorative`', async () => {
    const divider = await mount(
      '<helix-headless-divider announced decorative></helix-headless-divider>',
    )
    expect(line(divider)?.getAttribute('role')).toBe('separator')
  })

  test('carries its orientation into the accessibility tree', async () => {
    const divider = await mount(
      '<helix-headless-divider announced orientation="vertical"></helix-headless-divider>',
    )
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('vertical')
  })

  /* A word set into the line, such as "Or", was beside an unnamed separator. */
  test('an announced separator is named by the content set into it', async () => {
    const divider = await mount('<helix-headless-divider announced>Or</helix-headless-divider>')
    const reference = line(divider)?.getAttribute('aria-labelledby') ?? ''
    expect(divider.shadowRoot?.getElementById(reference) ?? null).toBe(
      part(divider, 'content') as HTMLElement | null,
    )
    const plain = await mount('<helix-headless-divider>Or</helix-headless-divider>')
    expect(line(plain)?.getAttribute('aria-labelledby')).toBe('content')
  })

  test('an announced separator with no orientation is horizontal', async () => {
    const divider = await mount('<helix-headless-divider announced></helix-headless-divider>')
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
  })
})
