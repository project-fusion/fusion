import { customElement, HelixElement } from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { styles } from './sandbox-toolbar.css.js'

/**
 * @summary The bar across the top of a sandbox.
 *
 * @description
 * Spans the source pane and the preview, and holds controls for the whole
 * sandbox. Files go at the start and menus at the end, as in most editors.
 *
 * The toolbar does not have `role="toolbar"`. That role gives a group of
 * similar controls one tab stop with a roving tabindex. The toolbar holds a tab
 * list, which has its own arrow-key behavior that the role would break. Use
 * `helix-toolbar` for a row of buttons.
 *
 * Both slots are bare, so an empty slot adds no box and no gap.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Action bar
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @slot - Items at the start, usually the files.
 * @slot end - Items at the end, usually menus.
 *
 * @cssproperty --sandbox-toolbar-gap - Space between items.
 * @cssproperty --sandbox-toolbar-size - The bar's height. Defaults to the height of a large control.
 */
@customElement('helix-sandbox-toolbar')
export class HelixSandboxToolbar extends HelixElement {
  protected override render(): TemplateResult {
    // The end slot opens the gap that separates the two ends, the same way the
    // status bar does it. No wrapper: a slot that is not filled has to cost
    // nothing, and `display: contents` is what gives that for free.
    return html`<slot></slot>
      <slot name="end"></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-toolbar': HelixSandboxToolbar
  }
}
