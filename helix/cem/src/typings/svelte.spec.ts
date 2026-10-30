import { describe, expect, test } from 'bun:test'
import { MANIFEST } from './fixture.js'
import { renderSvelte } from './svelte.js'

const text = renderSvelte(MANIFEST, '@x/y')

describe('renderSvelte', () => {
  test('reads the props from the JSX file of the same package', () => {
    expect(text).toContain("import type { CustomElements } from '@x/y/jsx'")
  })

  test('declares each tag once, and nothing else', () => {
    expect(text).toContain("'helix-thing': Helix<'helix-thing'>")
    expect(text.match(/: Helix</g)).toHaveLength(1)
  })

  test("leaves React's spellings out", () => {
    expect(text).toContain('| ReactOnly')
    expect(text).toContain('`on${Uppercase<string>}${string}`')
  })
})
