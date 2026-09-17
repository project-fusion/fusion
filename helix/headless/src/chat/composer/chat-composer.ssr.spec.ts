import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The composer, served.
 *
 * **A field a reader can start typing into before the page has run.** Nothing
 * here needs a tree: the label, the placeholder, the rows and the draft are all
 * properties, so the whole composer is ordinary markup and the only thing
 * hydration adds is what happens when the reader presses Enter.
 *
 * What it must not do is name the field with an id. An `aria-label` on the
 * control resolves in any tree; a `<label for>` inside a shadow root pointing at
 * a light-DOM id never does, which is why `namesControl` is not the question
 * here and the label is asserted on the field itself.
 */
const TAG = 'helix-headless-chat-composer'

const markup = ssr(
  html`<helix-headless-chat-composer
    label="Ask anything"
    placeholder="Say something"
  ></helix-headless-chat-composer>`,
)

describe('chat composer server output', () => {
  test('serves the field, the tool row and the control that sends', () => {
    expect(servedParts(markup)).toEqual([
      'composer',
      'end',
      'field',
      'mark',
      'send',
      'start',
      'tools',
    ])
  })

  test('the field carries its own name, since an IDREF could not cross the boundary', () => {
    const field = partTag(markup, 'field')
    expect(field).toContain('aria-label="Ask anything"')
    expect(field).toContain('placeholder="Say something"')
  })

  test('the control that sends is named, so it is a control before hydration too', () => {
    expect(partTag(markup, 'send')).toContain('aria-label="Send"')
  })

  /**
   * A composer refusing input while a turn is in flight has to refuse it in the
   * markup as well, or a reader on a slow connection types into a field that is
   * about to throw the draft away.
   */
  test('a disabled composer serves a disabled field and a disabled control', () => {
    const off = ssr(html`<helix-headless-chat-composer disabled></helix-headless-chat-composer>`)
    expect(partTag(off, 'field')).toContain('disabled')
    expect(partTag(off, 'send')).toContain('disabled')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, TAG)).toEqual(['label', 'placeholder'])
  })
})
