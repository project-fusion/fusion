import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
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
  test('the log is served as a log, and the region that speaks is served empty', () => {
    expect(partTag(markup, 'log')).toContain('role="log"')
    expect(partTag(markup, 'log')).toContain('aria-live="off"')
    /* Empty on arrival, or it announces itself on every page load. */
    expect(partTag(markup, 'live')).toContain('role="status"')
    expect(withoutStyles(markup)).toMatch(/part="live" role="status">(<!--[^>]*-->)*<\/span>/)
  })

  test('the turns are in the markup, which is what markup children buy', () => {
    const served = withoutStyles(markup)
    expect(served).toContain('How can I help?')
    expect(served).toContain('It will not connect')
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
