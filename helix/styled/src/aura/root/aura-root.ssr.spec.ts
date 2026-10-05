import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('aura server output', () => {
  test('the canvas is served, so the box exists before any script runs', () => {
    /* Asked of the part rather than searched for in the markup: the stylesheet
       inlined beside it names every part the component uses, so a plain string
       check passes on a selector and says nothing about what rendered. */
    expect(hasPart(ssr(html`<helix-aura></helix-aura>`), 'canvas')).toBe(true)
  })

  test('the host carries nothing the consumer did not write', () => {
    /* `variant` is the only reflected property and it takes no default, so an
       unconfigured aura writes no attribute and hydration reconciles nothing.
       The numeric axes are not reflected at all, because no CSS selects on
       them: reflection exists so a selector can reach a value. */
    expect(hostAttributes(ssr(html`<helix-aura></helix-aura>`), 'helix-aura')).toEqual([])
  })

  test('and reflects the variant, which the fallback gradient selects on', () => {
    expect(
      hostAttributes(ssr(html`<helix-aura variant="rays"></helix-aura>`), 'helix-aura'),
    ).toEqual(['variant'])
  })

  test('nothing about the shader reaches the server', () => {
    /* The contract is that this renders a box and upgrades, and a server that
       emitted a uniform, a program or a frame would be a server pretending to
       have a GPU.

       Asked as the whole list rather than as the two things a spec author
       thought to rule out. `not.toContain('#version')` goes on passing whatever
       is added beside the canvas, which is the blind assertion `servedParts`
       exists to replace: the frame here is one empty canvas over the host's own
       gradient, and the empty box the content sits in, and that is the entire
       claim. */
    expect(servedParts(ssr(html`<helix-aura variant="rays"></helix-aura>`))).toEqual([
      'canvas',
      'content',
    ])
  })
})
