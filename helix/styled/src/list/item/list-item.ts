import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessListItem } from '@fusion.dev/helix-headless/list'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { styles } from './list-item.css.js'

/**
 * @summary One row of a list.
 *
 * @description
 * Laid out as a grid, so supporting text lines up under the label. The leading
 * and trailing regions keep their own width, and the middle takes the rest.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Row, Entry
 * @documentation https://fusion.dev/helix/components/list
 *
 * @csspart rail - The cell that holds the number in a railed list.
 *
 * @cssproperty --list-item-padding - The padding inside the row.
 * @cssproperty --list-item-rail-content - What the rail cell shows. The list sets it.
 * @cssproperty --list-item-rail-display - Whether the row has a rail. The list sets it.
 * @cssproperty --list-item-term-weight - The font weight of a term in a description list.
 */
@customElement('helix-list-item')
export class HelixListItem extends HelixHeadlessListItem {
  static override styles: CSSResultGroup = styles

  /**
   * The rail cell, which this tier can afford because it has a sheet.
   *
   * An element rather than `[part="row"]::before`, which could hold the same
   * counter. Generated content can only ever be a string, and this cell is the
   * one place a row's ordinal lives, so a consumer replacing it with a state
   * mark or a step glyph wants somewhere to put it. It is also a name: a part is
   * in `custom-elements.json` and a pseudo-element on another part is not, and a
   * hook nobody can find is a hook nobody uses.
   *
   * Always rendered, because a row cannot know whether its list asked for a
   * rail, and drawn `display: none` until the list says so. *Absent* and not
   * *empty*: an empty box is free to layout and is not free to the native
   * marker, which aligns to the first line box it can see. Measured against the
   * same tree without it, every row and label sat on the identical pixel and 178
   * pixels of the markers on a plain ordered list moved, which is a retaken
   * baseline for a feature that list is not using.
   */
  protected override renderRail(): TemplateResult {
    return html`<span part="rail"></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-list-item': HelixListItem
  }
}
