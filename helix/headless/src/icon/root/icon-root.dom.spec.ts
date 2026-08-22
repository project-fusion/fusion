import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const svg = (host: HTMLElement): Element | null => part(host, 'svg')

describe('icon rendering', () => {
  test('draws the named glyph from the set', async () => {
    // The markup is the icon's own, several elements at once rather than one
    // path, which is why the data is inner content instead of a `d` string.
    const icon = await mount('<helix-icon name="check"></helix-icon>')
    expect(svg(icon)).not.toBeNull()
    expect(svg(icon)?.getAttribute('viewBox')).toBe('0 0 256 256')
    expect(svg(icon)?.querySelector('polyline, path, circle, line')).not.toBeNull()
  })

  test('an unknown name renders nothing rather than an empty box', async () => {
    // A typo that left a sized blank would look like a deliberate gap.
    const icon = await mount('<helix-icon name="not-a-real-icon"></helix-icon>')
    expect(svg(icon)).toBeNull()
  })

  test('is decoration by default, and hidden from assistive technology', async () => {
    const icon = await mount('<helix-icon name="x"></helix-icon>')
    expect(svg(icon)?.getAttribute('aria-hidden')).toBe('true')
    expect(svg(icon)?.hasAttribute('role')).toBe(false)
  })

  test('a labelled icon becomes content with a name', async () => {
    const icon = await mount('<helix-icon name="x" label="Dismiss"></helix-icon>')
    expect(svg(icon)?.getAttribute('role')).toBe('img')
    expect(svg(icon)?.getAttribute('aria-label')).toBe('Dismiss')
    expect(svg(icon)?.hasAttribute('aria-hidden')).toBe(false)
  })

  test('takes its color from the text around it', async () => {
    // On the wrapping svg, which is where it has to be. This read the glyph's
    // own markup for `currentColor` and passed while the set was hand-kept
    // stroked outlines, every shape carrying its own `stroke="currentColor"`.
    // The set comes from `@phosphor-icons/core` now and its regular weight is
    // one filled path with no paint of its own, so the only thing painting it
    // is the `fill` on the element the component renders around it. The old
    // assertion was true of the technique rather than of the behavior, and the
    // behavior is what has to hold across both.
    const icon = await mount('<helix-icon name="check"></helix-icon>')
    expect(svg(icon)?.getAttribute('fill')).toBe('currentColor')
    // And nothing inside overrides it with a color of its own, which is the
    // way an icon stops following its text.
    expect(svg(icon)?.innerHTML).not.toMatch(/(?:fill|stroke)="(?!none|currentColor)/)
  })
})
