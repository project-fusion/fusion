import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output of a group, which is the half of this family that counts.
 *
 * **A group is a heading over rows it cannot count.** The rows are the
 * consumer's markup and are served whole, the way the rest of this family's
 * are; how many there are is read off `children`, which Lit's element shim does
 * not have. So the number is the one thing a server has no answer to, and the
 * rule is the library's own: not knowing is not zero.
 */
const TAG = 'helix-headless-notification-group'

const markup = ssr(
  html`<helix-headless-notification-group collapsible label="Earlier">
    <helix-headless-notification>Build failed</helix-headless-notification>
    <helix-headless-notification>Build passed</helix-headless-notification>
  </helix-headless-notification-group>`,
)

describe('notification group server output', () => {
  /* Asked of a group with nothing in it, because `servedParts` reads the whole
     document and every row inside one brings its own. What is being asserted is
     this element's frame. */
  test('serves its header, its count and the region the rows go in', () => {
    const bare = ssr(
      html`<helix-headless-notification-group collapsible label="Earlier"></helix-headless-notification-group>`,
    )
    expect(servedParts(bare)).toEqual(['actions', 'count', 'header', 'items', 'label', 'trigger'])
  })

  /**
   * **The fault this spec was written for.** `total` falls back to the rows,
   * `items` reads `knownChildren`, and a server has none, so a group written
   * around two notifications served `<span part="count">0</span>`: a crawler and
   * a reader before hydration told the group holds nothing, over the two rows
   * underneath it. The box is served and the number is not.
   */
  test('no count is served over rows the server cannot count', () => {
    expect(partTag(markup, 'count')).not.toBe('')
    expect(rendered(markup, TAG)).not.toContain('>0<')
  })

  /**
   * A declared count is a fact about the group rather than about its children,
   * which is what a feed trimmed by a server already has: the number the rows
   * were cut from.
   */
  test('a declared count is served, because it needed no tree to know', () => {
    const declared = ssr(
      html`<helix-headless-notification-group collapsible count="12" label="Earlier">
        <helix-headless-notification>Build failed</helix-headless-notification>
      </helix-headless-notification-group>`,
    )
    expect(rendered(declared, TAG)).toContain('12')
  })

  /**
   * **The slot rather than the rows.** `toContain('Build failed')` reads this
   * spec's own light-DOM child back out of the response, which declarative
   * shadow DOM serializes whatever the shadow root holds, so it would hold for a
   * group that rendered nothing at all. What the group owes a server is the
   * unnamed slot the rows are projected through, read off a render with no
   * children so the only shadow root in the markup is this one's.
   */
  test('the rows are projected rather than collected', () => {
    const bare = ssr(
      html`<helix-headless-notification-group label="Earlier"></helix-headless-notification-group>`,
    )
    expect(rendered(bare, TAG)).toContain('<slot></slot>')
  })

  /**
   * The fold is assignment rather than hiding, and a server assigns nothing, so
   * every row is in the markup and the collapse takes effect on hydration. That
   * is the right way round: a folded group serving one row would hide from a
   * crawler what a reader gets by pressing one control.
   */
  test('the trigger is served closed, and says so', () => {
    expect(partTag(markup, 'trigger')).toContain('aria-expanded="false"')
  })

  test('`default-open` serves it open instead, and the trigger says that', () => {
    /* A folded group shows one row and an open one shows all of them, so the
       seed decides how tall the feed is served. Resolved on the first client
       update instead, the rest of the group arrives after the first paint and
       pushes everything under it down, and for that window `aria-expanded`
       disagrees with what is on the screen. */
    const open = ssr(
      html`<helix-headless-notification-group
        collapsible
        default-open
        label="Deploys"
      ></helix-headless-notification-group>`,
    )
    expect(partTag(open, 'trigger')).toContain('aria-expanded="true"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, TAG)).toEqual(['collapsible', 'label'])
  })
})
