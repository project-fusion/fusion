import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('voice level server output', () => {
  test('the canvas is served, so the box exists before any script runs', () => {
    expect(hasPart(ssr(html`<helix-voice-level></helix-voice-level>`), 'canvas')).toBe(true)
  })

  test('nothing but the empty canvas is served', () => {
    /* There is no canvas to draw on a server, so the frame is the whole of
       what it sends, whatever the level. */
    expect(
      servedParts(ssr(html`<helix-voice-level level="0.6" variant="waves"></helix-voice-level>`)),
    ).toEqual(['canvas'])
  })

  test('the host carries nothing the consumer did not write', () => {
    /* `variant` is the only reflected property and it takes no default. */
    expect(
      hostAttributes(ssr(html`<helix-voice-level></helix-voice-level>`), 'helix-voice-level'),
    ).toEqual([])
  })

  test('a level and bands set as properties do not write themselves onto the host', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-voice-level .bands=${[0.2, 0.5]} .level=${0.4}></helix-voice-level>`),
        'helix-voice-level',
      ),
    ).toEqual([])
  })

  test('the variant is reflected, which the stylesheet sizes by', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-voice-level .variant=${'waves'}></helix-voice-level>`),
        'helix-voice-level',
      ),
    ).toEqual(['variant'])
  })
})
