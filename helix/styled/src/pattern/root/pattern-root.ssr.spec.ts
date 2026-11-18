import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import { BRIGHT_STARS, SHOOTING_STARS } from '../stars.js'

describe('pattern server output', () => {
  const served = ssr(html`<helix-pattern><p>Welcome</p></helix-pattern>`)

  test('serves the drawing and the glow, hidden from screen readers', () => {
    expect(hasPart(served, 'motif')).toBe(true)
    expect(partTag(served, 'motif')).toContain('aria-hidden="true"')
    expect(partTag(served, 'glow')).toContain('aria-hidden="true"')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-pattern')).toEqual([])
  })

  test('serves the bright stars and the shooting stars where they will be drawn, only for stars', () => {
    const sky = withoutStyles(
      ssr(html`<helix-pattern motif="stars"><p>Welcome</p></helix-pattern>`),
    )
    expect(sky.match(/\spart="star"/g)?.length).toBe(BRIGHT_STARS.length)
    expect(sky.match(/\spart="meteor"/g)?.length).toBe(SHOOTING_STARS.length)
    const first = BRIGHT_STARS[0]
    expect(partTag(sky, 'star')).toContain(`--_star-x: ${first?.x}%`)
    expect(hasPart(served, 'star')).toBe(false)
  })
})
