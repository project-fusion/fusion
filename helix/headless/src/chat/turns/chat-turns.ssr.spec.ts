import { describe, expect, test } from 'bun:test'
import { partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import './index.js'

/* A chat given `turns` serves the log it draws them in, marked as windowed,
   with the room above and below the window: the turns themselves are drawn
   once the browser has measured the box they scroll in. */

describe('turns handed over as data, served', () => {
  test('serve a windowed log with its room above and below', () => {
    const markup = ssr(
      html`<helix-headless-chat label="Support" .turns=${[{ author: 'them', text: 'How can I help?' }]}></helix-headless-chat>`,
    )
    expect(partTag(markup, 'log')).toContain('data-windowed')
    expect(rendered(markup, 'helix-headless-chat')).toContain('part="before"')
    expect(rendered(markup, 'helix-headless-chat')).toContain('part="after"')
  })
})
