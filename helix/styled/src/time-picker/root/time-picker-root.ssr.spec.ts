import { describe, expect, test } from 'bun:test'
import { hasPart, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
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

  /** Every time the served markup marks as chosen, read off the options. */
  const marked = (markup: string): string[] =>
    [...markup.matchAll(/value="([^"]*)"\s+selected/g)].map(([, at]) => at as string)

  test('the chosen time is marked in the served list, not worked out on upgrade', () => {
    /* The question this cohort settled, asked of a list rather than a grid.
       The listbox is handed the answer as `.value` and lit-ssr serializes no
       property binding, so this served ninety-six rows with nothing on any of
       them saying which one the value named. `selected` is an attribute
       binding and does serve. */
    expect(marked(served('en-GB'))).toEqual(['09:15'])
  })

  test('and the mark reaches the row, which is what a reader sees', () => {
    /* Through the part as well as through the attribute, since a stylesheet
       outside cannot follow `::part()` with an attribute and reads the part
       name instead. `item-selected` is the option's own, exported as
       `option-item-selected`, and `servedParts` reads rendered parts rather
       than forwarded ones. */
    expect(servedParts(served('en-GB'))).toContain('item-selected')
  })

  test('the wheels serve their mark too, a wheel being a listbox like the list', () => {
    const markup = rendered(
      ssr(
        html`<helix-time-picker locale="en-GB" value="09:15" variant="wheels"></helix-time-picker>`,
      ),
      'helix-time-picker',
    )
    // The hour and the minute, each in its own column, which is the whole answer.
    expect(marked(markup)).toEqual(['9', '15'])
    expect(servedParts(markup)).toContain('item-selected')
  })

  test('and an unset picker marks nothing, there being no answer to mark', () => {
    expect(
      marked(
        rendered(
          ssr(html`<helix-time-picker max="09:30" min="09:00"></helix-time-picker>`),
          'helix-time-picker',
        ),
      ),
    ).toEqual([])
  })
})
