import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-chat-message'
const AT = '2020-01-01T00:00:00.000Z'

describe('chat message server output', () => {
  test('a failure says so and offers the way back, in the consumer’s words', () => {
    /* A failed message is the one state a reader has to *find* rather than
       notice, so both words are in the served markup and not filled in on
       hydration. Phrases the component does not default to, since `failedLabel`
       and `retryLabel` both hold one and asserting those would pass against a
       template writing the literals. */
    const failed = html`<helix-headless-chat-message
      at=${AT}
      failed-label="Did not send"
      retry-label="Send it again"
      state="failed"
      >hi</helix-headless-chat-message
    >`
    expect(rendered(ssr(failed), TAG)).toContain('Did not send')
    expect(rendered(ssr(failed), TAG)).toContain('Send it again')
    expect(hasPart(ssr(failed), 'retry')).toBe(true)
  })

  test('a message on its way says that instead, and offers nothing to press', () => {
    const sending = html`<helix-headless-chat-message
      at=${AT}
      sending-label="On its way"
      state="sending"
      >hi</helix-headless-chat-message
    >`
    expect(rendered(ssr(sending), TAG)).toContain('On its way')
    expect(hasPart(ssr(sending), 'retry')).toBe(false)
  })

  test('and a settled message says nothing about its state at all', () => {
    /* `sent` is every settled message, and a transcript labeling each one is a
       transcript of the word "sent". */
    const sent = html`<helix-headless-chat-message at=${AT} state="sent"
      >hi</helix-headless-chat-message
    >`
    expect(hasPart(ssr(sent), 'state')).toBe(false)
  })

  test('the reading is written in the locale the consumer named', () => {
    /* The relative time is computed on the server against the server's clock,
       so the language it comes out in is decided here and nowhere else: read
       off the page's own `lang` instead, a transcript served from a shared
       renderer would come back in whatever language that machine defaults to.
       `datetime` carries the instant either way. */
    const french = html`<helix-headless-chat-message at=${AT} locale="fr-FR"
      >hi</helix-headless-chat-message
    >`
    const english = html`<helix-headless-chat-message at=${AT} locale="en-US"
      >hi</helix-headless-chat-message
    >`
    expect(partTag(ssr(french), 'time')).toContain(`datetime="${AT}"`)
    expect(rendered(ssr(french), TAG)).toContain('il y a')
    expect(rendered(ssr(english), TAG)).toContain('ago')
  })
})
