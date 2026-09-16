import { describe, expect, test } from 'bun:test'
import { hasPart, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* `rendered` and not `withoutStyles`, because the host tag is the consumer's
   own markup echoed back and it carries `max`, `min` and `value` here. Against
   the whole document `toContain('09:15')` is satisfied by `value="09:15"` on the
   host, and it went on passing with every option's text and every option's
   `value` removed from the render. */
const served = (locale: string): string =>
  rendered(
    ssr(
      html`<helix-time-picker locale=${locale} max="09:30" min="09:00" value="09:15"></helix-time-picker>`,
    ),
    'helix-time-picker',
  )

describe('time server output', () => {
  test('every offered time ships, so the list is there before any script runs', () => {
    const markup = served('en-GB')
    expect(hasPart(markup, 'list')).toBe(true)
    for (const at of ['09:00', '09:15', '09:30']) {
      expect(markup).toContain(`value="${at}"`)
    }
  })

  test('and each one is written the way the locale writes it', () => {
    /* `Intl` runs on the server too, which is the whole reason the label is not
       computed on the client.

       On `en-GB` this question cannot be asked: the locale writes 09:15 as
       `09:15`, the same string the ISO value is, so the assertion passes on the
       value whether or not anything was formatted. `en-US` writes a twelve hour
       clock, which is a form nothing else in the document holds. */
    expect(served('en-US')).toContain('9:15 AM')
  })
})
