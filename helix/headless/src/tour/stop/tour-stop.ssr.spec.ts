import { describe, expect, test } from 'bun:test'
import { hasPart, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-tour-stop'

/* The four words a run is driven by, each a bare string in a template.
 *
 * None of them has an attribute on the control it lands on and none is read
 * anywhere else, so the only way to tell a wired property from a literal is to
 * set a word the component does not already hold: the defaults are "Skip",
 * "Back", "Next" and "Done", and asserting those passes against a template that
 * writes them itself. */
describe('tour stop server output', () => {
  test('a stop in the middle of a run serves skip, back and next', () => {
    const middle = html`<helix-headless-tour-stop
      back-label="One step back"
      next-label="Carry on"
      skip-label="Leave the tour"
      >Here is the filter.</helix-headless-tour-stop
    >`
    expect(rendered(ssr(middle), TAG)).toContain('Leave the tour')
    expect(rendered(ssr(middle), TAG)).toContain('One step back')
    expect(rendered(ssr(middle), TAG)).toContain('Carry on')
  })

  test('the first stop has nowhere to go back to, so it renders no back control', () => {
    /* Absent rather than inert: the way back does not exist yet, and a control
       that did nothing would be the one thing on the panel a reader could press
       and get no answer from. */
    const first = html`<helix-headless-tour-stop first back-label="One step back"
      >Start here.</helix-headless-tour-stop
    >`
    expect(hasPart(ssr(first), 'back')).toBe(false)
    expect(rendered(ssr(first), TAG)).not.toContain('One step back')
  })

  test('the last stop’s forward control says it ends the run rather than continues it', () => {
    /* One control and two words, which is why `doneLabel` exists beside
       `nextLabel`: a button saying "Next" on the last panel promises a step
       that is not there. */
    const last = html`<helix-headless-tour-stop last done-label="That is everything" next-label="Carry on"
      >The last one.</helix-headless-tour-stop
    >`
    expect(rendered(ssr(last), TAG)).toContain('That is everything')
    expect(rendered(ssr(last), TAG)).not.toContain('Carry on')
  })
})

describe('tour stop server output, the title and the place', () => {
  test('serves the heading and description slots as parts, and no place before the tour has told it one', () => {
    const served = rendered(
      ssr(html`<helix-headless-tour-stop for="x"></helix-headless-tour-stop>`),
      'helix-headless-tour-stop',
    )
    expect(served).toMatch(/<slot\s+name="heading"\s+part="heading"/)
    expect(served).toMatch(/<slot\s+name="description"\s+part="description"/)
    expect(served).not.toContain('part="progress"')
  })
})
