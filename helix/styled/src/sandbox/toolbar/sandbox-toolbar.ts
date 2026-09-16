import { customElement, HelixElement } from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { styles } from './sandbox-toolbar.css.js'

/**
 * @summary The bar across the top of a sandbox.
 *
 * @description
 * Spans the source pane and the preview together, so what it holds is about the
 * sandbox rather than about one side of it. The files go at the start and the
 * menus at the end, which is the arrangement every editor has settled on.
 *
 * **Not `role="toolbar"`.** That role brings a roving tabindex, one tab stop
 * for the whole group, and it is for a set of controls of the same kind. This
 * holds a tab list, which owns its own arrow-key behavior and would lose it.
 * Use `helix-toolbar` where the contents really are a row of buttons.
 *
 * Both slots are bare, so an unfilled one generates no box and costs no gap.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Action bar
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @slot - Items at the start, usually the files.
 * @slot end - Items at the end, usually menus.
 *
 * @cssproperty --sandbox-toolbar-gap - Space between items.
 * @cssproperty --sandbox-toolbar-size - The bar's height. Defaults to a large control.
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
