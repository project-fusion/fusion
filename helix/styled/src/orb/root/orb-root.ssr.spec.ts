import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('orb server output', () => {
  test('the canvas is served, so the box exists before any script runs', () => {
    /* Asked of the part rather than searched for in the markup: the stylesheet
       inlined beside it names every part the component uses, so a plain string
       check passes on a selector and says nothing about what rendered. */
    expect(hasPart(ssr(html`<helix-orb></helix-orb>`), 'canvas')).toBe(true)
  })

  test('the host carries nothing the consumer did not write', () => {
    /* `size` is the only reflected property and it takes no default, so an
       unconfigured orb writes no attribute and hydration reconciles nothing.
       `state` is not reflected: it reaches a stylesheet as a custom state. */
    expect(hostAttributes(ssr(html`<helix-orb></helix-orb>`), 'helix-orb')).toEqual([])
  })

  test('and reflects the size, which the stylesheet selects on', () => {
    expect(hostAttributes(ssr(html`<helix-orb size="sm"></helix-orb>`), 'helix-orb')).toEqual([
      'size',
    ])
  })

  test('the state is a property and does not write itself onto the host', () => {
    /* Set as a property rather than an attribute, which is the case reflection
       would betray: a reflected `state` appears in server markup a React
       consumer never wrote, and hydration then reconciles an attribute against
       nothing. The state reaches a stylesheet as a custom state instead. Asked this way because an attribute the consumer wrote is
       indistinguishable from one reflection wrote, once it is in the output. */
    expect(
      hostAttributes(ssr(html`<helix-orb .state=${'working'}></helix-orb>`), 'helix-orb'),
    ).toEqual([])
  })

  test('nothing about the cloud reaches the server', () => {
    /* The contract is that this renders a box and upgrades, and a server that
       emitted dots would be a server pretending to have a canvas.

       Asked as the whole list rather than as the two things a spec author
       thought to rule out. `not.toContain('rgba(')` goes on passing whatever is
       added beside the canvas, which is the blind assertion `servedParts` exists
       to replace: the frame here is one empty canvas, and that is the entire
       claim. */
    expect(servedParts(ssr(html`<helix-orb state="done"></helix-orb>`))).toEqual(['canvas'])
  })
})
