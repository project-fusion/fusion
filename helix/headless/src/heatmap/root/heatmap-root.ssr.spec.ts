import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output, which for every chart here is the table and not the drawing.
 *
 * `SourceController.element` resolves an id through `getRootNode()`, and
 * resolving an id wants a document, so it is null on the server by design: the
 * table is served whole and the drawing arrives on hydration. That is the right
 * arrangement rather than a limitation, because **the table is the accessible
 * representation**, so what a crawler and a screen reader get before hydration
 * is the reading itself rather than a picture of it.
 */

const markup = ssr(
  html`<div>
    <table data-hidden-visually id="uptime">
      <caption>Uptime</caption>
      <tbody>
        <tr>
          <th scope="row"><time datetime="2026-08-25">25 Aug</time></th>
          <td data-value="0.81" data-tone="danger">81%</td>
        </tr>
      </tbody>
    </table>
    <helix-headless-heatmap for="uptime" label="Uptime">
      <span slot="summary">99.6% over 90 days</span>
    </helix-headless-heatmap>
  </div>`,
)

describe('heatmap server output', () => {
  test('the strip is served, even though it has nothing in it yet', () => {
    expect(partTag(markup, 'strip')).toBeTruthy()
  })

  test("the slot the consumer's summary lands in is served", () => {
    // `toContain('99.6% over 90 days')` passed on the host's own child, so it
    // held with the footer rendering no summary slot at all.
    expect(rendered(markup, 'helix-headless-heatmap')).toContain(
      '<span part="summary"><slot name="summary"></slot></span>',
    )
  })

  /**
   * **The frame whole, rather than the marks somebody thought to name.**
   *
   * A spec listing the three absences it could think of goes on passing when a
   * fourth thing is added to the empty render, which is the failure this promise
   * exists to prevent. It had already happened here: `not.toContain('part="cell"')`
   * was true and `part="empty"` was served beside it, so a heatmap over a table
   * of ninety days came out of the server saying "No readings".
   *
   * So what is served is the strip and the footer it sits above, and nothing
   * else: no cells, no tooltip, and no empty state, an unresolved table being
   * unknown rather than empty.
   *
   * The reading itself is the consumer's `<table>`, which this component neither
   * renders nor can remove, so `toContain('81%')` was reading the spec's own
   * template back out of the document and held whatever the heatmap drew.
   */
  test('the frame is served and nothing is drawn in it', () => {
    expect(servedParts(markup)).toEqual(['end', 'footer', 'start', 'strip', 'summary'])
  })

  /**
   * **Nothing added, and `rows` must never reflect.** Reflecting it makes the
   * server write `rows="1"` onto a host whose consumer wrote no such attribute,
   * which is a hydration mismatch a React consumer reports and does not patch
   * up. Nothing reads the attribute either: the stylesheet takes the row count
   * from an inline custom property. `visible` is written after the first render
   * for the same reason, so the server's output and a hydrating consumer's
   * markup agree that neither has it yet.
   */
  test('the host writes no attributes of its own', () => {
    expect(hostAttributes(markup, 'helix-headless-heatmap')).toEqual(['for', 'label'])
  })
})
