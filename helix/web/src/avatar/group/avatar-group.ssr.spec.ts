import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('avatar group server output', () => {
  test('the avatars are served, because they are the consumer’s own markup', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-avatar-group label="Reviewers" max="2"
          ><helix-avatar name="Ada Lovelace"></helix-avatar
          ><helix-avatar name="Grace Hopper"></helix-avatar
        ></helix-avatar-group>`,
      ),
    )
    expect(markup).toContain('Ada Lovelace')
    expect(markup).toContain('Grace Hopper')
  })

  test('no count is served, because the server cannot see what it would be counting', () => {
    /* The limit is applied against children, and the element shim has none. A
       count rendered from a guess would be a number the client then corrects,
       which is a flash of the wrong answer rather than none. */
    expect(
      hasPart(
        ssr(
          html`<helix-avatar-group max="1"
            ><helix-avatar name="Ada Lovelace"></helix-avatar
          ></helix-avatar-group>`,
        ),
        'overflow',
      ),
    ).toBe(false)
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-avatar-group label="Reviewers" max="4"></helix-avatar-group>`),
        'helix-avatar-group',
      ),
    ).toEqual(['label', 'max'])
  })
})
