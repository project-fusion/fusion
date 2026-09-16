import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output.
 *
 * **The turns are markup, so a conversation serves whole**, which is the
 * compensation for not windowing it and is the same trade `helix-notifications`
 * makes. A crawler and a reader on a slow connection both get the transcript.
 *
 * What the server cannot do is scroll. `pinned` describes where a reader is in a
 * box that does not exist yet, so what matters here is that it is served as the
 * consumer declared it and nothing else: an element that reflected a pin state
 * it had computed would be describing a viewport it never saw.
 */

const markup = ssr(html`<helix-headless-chat label="Support">
  <helix-headless-chat-message author="them" state="sent" at="2026-08-26T09:00:00.000Z">
    How can I help?
  </helix-headless-chat-message>
  <helix-headless-chat-message author="me" state="failed">
    It will not connect
  </helix-headless-chat-message>
  <helix-headless-chat-composer slot="composer"></helix-headless-chat-composer>
</helix-headless-chat>`)

describe('chat server output', () => {
  /**
   * A server cannot count the turns, and not knowing is not "none": served as
   * empty, a conversation read "Nothing to show" over its own turns until the
   * script arrived, and a client hydrating it drew a different template.
   */
  test('no empty state is served over turns the server cannot count', () => {
    expect(partTag(markup, 'empty')).toBe('')
  })

  test('the log is served as a log, and the region that speaks is served empty', () => {
    expect(partTag(markup, 'log')).toContain('role="log"')
    expect(partTag(markup, 'log')).toContain('aria-live="off"')
    /* Empty on arrival, or it announces itself on every page load. */
    expect(partTag(markup, 'live')).toContain('role="status"')
    expect(rendered(markup, 'helix-headless-chat')).toMatch(
      /part="live" role="status">(<!--[^>]*-->)*<\/span>/,
    )
  })

  test('the turns are served by slots, which is what markup children buy', () => {
    /* `toContain('How can I help?')` read the turns' own light-DOM text back
       out of the render, so it passed with both elements rendering no slot at
       all, and an unassigned turn paints nothing. Each is read off an element
       with no children, so the only shadow root in it is that element's own. */
    const chat = ssr(html`<helix-headless-chat label="Support"></helix-headless-chat>`)
    expect(rendered(chat, 'helix-headless-chat')).toContain('<slot name="messages"')

    const turn = ssr(
      html`<helix-headless-chat-message author="them"></helix-headless-chat-message>`,
    )
    expect(rendered(turn, 'helix-headless-chat-message')).toMatch(
      /<div part="content">\s*(<!--[^>]*-->)*<slot\s*>/,
    )
  })

  test('a failed turn is served with its way back, since that is markup and not state', () => {
    expect(partTag(markup, 'retry')).toContain('part="retry"')
  })

  test('the exact instant is served whatever clock computed the reading', () => {
    expect(partTag(markup, 'time')).toContain('datetime="2026-08-26T09:00:00.000Z"')
  })

  test('the hosts write no attributes of their own', () => {
    expect(hostAttributes(markup, 'helix-headless-chat')).toEqual(['label'])
    expect(hostAttributes(markup, 'helix-headless-chat-composer')).toEqual(['slot'])
  })
})
