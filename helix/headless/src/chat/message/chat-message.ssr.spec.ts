import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * One turn, served.
 *
 * **A turn is served whole, which is the reason a transcript of children exists
 * beside `turns`.** Nothing here resolves an id or measures anything: what was
 * said is the consumer's markup, who said it is an attribute, and the state is
 * an attribute. So the only thing a server cannot get right is the *reading* of
 * the timestamp, computed against a clock that is not the reader's, and
 * `datetime` carries the instant so the reading is a text node hydration
 * replaces rather than a fact the markup has wrong.
 */
const TAG = 'helix-headless-chat-message'

const markup = ssr(
  html`<helix-headless-chat-message at="2020-01-01T00:00:00.000Z" author="me"
    >What was said</helix-headless-chat-message
  >`,
)

describe('chat message server output', () => {
  test('a settled turn serves its frame and says nothing about itself', () => {
    /* No `state` and no `mark`: `sent` says nothing, because every settled turn
       is sent and a transcript that labels each one is a transcript of the word
       "sent". The indicator is the slot's own fallback and is always drawn; what
       hides it at rest is a stylesheet, which is the tier above's business. */
    expect(servedParts(markup)).toEqual([
      'actions',
      'avatar',
      'body',
      'content',
      'indicator',
      'message',
      'meta',
      'sources',
      'time',
    ])
  })

  /**
   * **The box the words land in, not the words.** `toContain('What was said')`
   * reads this spec's own light-DOM child back out of the response, which
   * declarative shadow DOM serializes whatever the shadow root holds, so it
   * would hold for a turn that rendered nothing. What a turn owes a server is
   * the content region and the slot inside it, read off a render with no
   * children.
   */
  test('what was said is projected into a box of its own', () => {
    const bare = ssr(html`<helix-headless-chat-message></helix-headless-chat-message>`)
    expect(rendered(bare, TAG)).toContain('<div part="content">')
    expect(partTag(bare, 'content')).not.toBe('')
  })

  test('the exact instant is in `datetime`, whatever clock computed the reading', () => {
    expect(partTag(markup, 'time')).toContain('datetime="2020-01-01T00:00:00.000Z"')
  })

  /**
   * A failure is the one state worth serving, because it is the one a reader has
   * to find rather than notice, and the way out of it is served with it.
   */
  test('a turn that did not send says so before hydration, and offers the way back', () => {
    const failed = ssr(
      html`<helix-headless-chat-message state="failed">What was said</helix-headless-chat-message>`,
    )
    expect(rendered(failed, TAG)).toContain('Not sent')
    expect(partTag(failed, 'retry')).not.toBe('')
  })

  /**
   * **The fault this assertion was written for.** `aria-busy` was written onto
   * the host with `toggleAttribute`, so a streaming turn gained an attribute the
   * consumer never wrote: a React page that server-renders one sends no
   * `aria-busy` and the element adds it on upgrade, which React reports and does
   * not patch up. It goes through `ElementInternals` now, which no server writes
   * and which therefore appears in neither half.
   */
  test('a streaming turn writes no flag of its own onto the host', () => {
    const streaming = ssr(
      html`<helix-headless-chat-message author="them" state="streaming"></helix-headless-chat-message>`,
    )
    expect(hostAttributes(streaming, TAG)).toEqual(['author', 'state'])
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, TAG)).toEqual(['at', 'author'])
  })
})
