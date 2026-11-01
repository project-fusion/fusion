import { describe, expect, test } from 'bun:test'
import { hostAttributes, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('strands server output', () => {
  test('serves the canvas and the content box, and nothing about the ribbon', () => {
    /* The contract is that this renders a box and upgrades. A server that
       emitted a uniform, a program or a frame would be a server pretending to
       have a GPU, so the whole list is asked for rather than a few things a
       spec author thought to rule out. */
    expect(servedParts(ssr(html`<helix-strands pattern="bend"></helix-strands>`))).toEqual([
      'canvas',
      'content',
    ])
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(ssr(html`<helix-strands></helix-strands>`), 'helix-strands')).toEqual([])
  })

  test('and reflects travel, set as a property, which the stylesheet selects on', () => {
    /* Set through the property, so the attribute in the output is the
       element's reflection and not markup the consumer wrote. The pattern is
       set the same way and stays a property. */
    expect(
      hostAttributes(
        ssr(html`<helix-strands .travel=${true} .pattern=${'waves'}></helix-strands>`),
        'helix-strands',
      ),
    ).toEqual(['travel'])
  })
})
