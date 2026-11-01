import { describe, expect, it } from 'bun:test'
import { gateHover } from './gate-hover.mjs'

describe('gateHover', () => {
  it('moves a hover rule under the query', () => {
    expect(gateHover('a:hover { color: red; }')).toBe(
      '@media (hover: hover) {\na:hover { color: red; }\n}',
    )
  })

  it('splits a list, leaving the selectors that hold on touch', () => {
    const out = gateHover('a:hover, a:focus-visible { color: red; }')
    expect(out).toBe(
      'a:focus-visible { color: red; }\n@media (hover: hover) {\na:hover { color: red; }\n}',
    )
  })

  it('does not split a comma inside a function', () => {
    expect(gateHover(':is(a, b):hover { c: d; }')).toBe(
      '@media (hover: hover) {\n:is(a, b):hover { c: d; }\n}',
    )
  })

  it('goes into a conditional group', () => {
    expect(gateHover('@media print { a:hover { c: d; } }')).toBe(
      '@media print {@media (hover: hover) {\na:hover { c: d; }\n} }',
    )
  })

  it('leaves a rule that already reads hover, and keyframes', () => {
    const gated = '@media (hover: hover) { a:hover { c: d; } }'
    expect(gateHover(gated)).toBe(gated)
    const frames = '@keyframes x { from { c: d; } }'
    expect(gateHover(frames)).toBe(frames)
  })

  it('leaves :not(:hover), which holds on touch', () => {
    const css = 'a:not(:hover) { c: d; }'
    expect(gateHover(css)).toBe(css)
  })

  it('keeps a rule the comment before it names', () => {
    const css = '/* hover stays on touch: a tap shows it */\na:hover { c: d; }'
    expect(gateHover(css)).toBe(css)
  })

  it('ignores braces in strings and comments', () => {
    const css = 'a::after { content: "}"; } /* a:hover { */ b { c: d; }'
    expect(gateHover(css)).toBe(css)
  })
})
