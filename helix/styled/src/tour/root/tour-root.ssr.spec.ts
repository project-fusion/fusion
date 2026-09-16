import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const tour = html`<helix-tour label="Getting started">
  <helix-tour-stop for="one">First</helix-tour-stop>
  <helix-tour-stop for="two">Second</helix-tour-stop>
</helix-tour>`

describe('tour server output', () => {
  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(tour), 'helix-tour')).toEqual(['label'])
  })

  test('renders no light at all, because a closed tour has none', () => {
    /* The whole reason a tour may measure where a trail may not. The spotlight
       needs a target's rectangle and the server has no geometry, but it also
       has nothing to draw: a tour opens on a gesture, so the served markup is
       correct by being empty and the first frame cannot disagree with it. */
    const markup = withoutStyles(ssr(tour))
    expect(markup).not.toMatch(/<div\s+part="spotlight"/)
  })

  test('the stops are projected, and each one projects its own content', () => {
    /* Counting `<helix-tour-stop` tags and `toContain('Second')` both read the
       spec's own light DOM, which is in the response whatever the tour renders.
       Two claims replace them: the tour projects the stops through one unnamed
       slot rather than collecting them, and each stop renders the content
       region whose slot carries its text. */
    const bare = ssr(html`<helix-tour label="Getting started"></helix-tour>`)
    expect(rendered(bare, 'helix-tour')).toContain('<slot></slot>')
    const markup = withoutStyles(ssr(tour))
    expect(markup.match(/<div part="content"><slot><\/slot><\/div>/g)).toHaveLength(2)
  })

  test('and every panel is served hidden', () => {
    const markup = withoutStyles(ssr(tour))
    const panels = markup.match(/<div\s+part="bubble"[^>]*>/g) ?? []
    expect(panels.length).toBe(2)
    expect(panels.every((panel) => panel.includes('hidden'))).toBe(true)
  })
})
