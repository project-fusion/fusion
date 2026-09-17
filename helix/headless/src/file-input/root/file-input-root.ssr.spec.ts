import { describe, expect, test } from 'bun:test'
import { partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-file-input'

describe('file input server output', () => {
  test('the trigger is a label pointing at the control, so a click opens the picker', () => {
    /* A file dialog is a privileged action no script can start: it opens for a
       click on the input or on a `<label for>` naming one, and for nothing
       else. So this pair has to be in the parsed markup, or the button on the
       page does nothing at all until the definition lands. */
    const markup = ssr(
      html`<helix-headless-file-input label="Attachments"></helix-headless-file-input>`,
    )
    expect(partTag(markup, 'trigger')).toMatch(/<label\s/)
    expect(partTag(markup, 'trigger')).toContain('for="control"')
    expect(partTag(markup, 'control')).toContain('id="control"')
  })

  test('the words on the trigger are the consumer’s, and are the slot’s fallback', () => {
    /* The trigger has no other content, so this is the whole of what a reader
       sees and hears. It is fallback rather than a second thing rendered beside
       the slot, which is what lets a consumer replace it with markup and not
       end up with both.

       Words the component does not default to, since `triggerLabel` holds
       "Choose files" and asserting that would pass against a literal. */
    const markup = ssr(
      html`<helix-headless-file-input
        label="Attachments"
        trigger-label="Attach something"
      ></helix-headless-file-input>`,
    )
    expect(rendered(markup, TAG)).toContain('<slot name="trigger">')
    expect(rendered(markup, TAG)).toContain('Attach something')
  })
})
