import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('avatar group server output', () => {
  test('the avatars are served, through a slot the group has already rendered', () => {
    /* The names prove nothing on their own. They are the consumer's own markup,
       echoed by declarative shadow DOM whatever the group renders, so
       `toContain('Ada Lovelace')` against the whole document went on passing
       with the render cut to one empty element carrying no slot at all. What the
       group owes a server is the slot: without it the avatars are in the
       document and on screen nowhere.

       Read off a group with no children, so the only shadow root in the markup
       is the group's own and a slot inside an avatar cannot answer for it. */
    expect(
      rendered(
        ssr(
          html`<helix-headless-avatar-group label="Reviewers" max="2"></helix-headless-avatar-group>`,
        ),
        'helix-headless-avatar-group',
      ),
    ).toContain('<slot')
  })

  test('no count is served, because the server cannot see what it would be counting', () => {
    /* The limit is applied against children, and the element shim has none. A
       count rendered from a guess would be a number the client then corrects,
       which is a flash of the wrong answer rather than none. */
    expect(
      hasPart(
        ssr(
          html`<helix-headless-avatar-group max="1"
            ><helix-headless-avatar name="Ada Lovelace"></helix-headless-avatar
          ></helix-headless-avatar-group>`,
        ),
        'overflow',
      ),
    ).toBe(false)
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(
          html`<helix-headless-avatar-group label="Reviewers" max="4"></helix-headless-avatar-group>`,
        ),
        'helix-headless-avatar-group',
      ),
    ).toEqual(['label', 'max'])
  })
})
