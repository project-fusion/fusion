import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

/**
 * @summary A keyboard key or chord, set inline with text.
 *
 * @description
 * Renders a real `<kbd>`, so the passage still means "press this" to anything
 * reading the markup rather than only to a reader looking at it.
 *
 * One key per element. A chord is several of these with the separator written
 * between them as ordinary text, because that separator is prose: it is "then"
 * in a sequence and "plus" in a simultaneous press, and a component that
 * inserted one would have to guess which.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Key, Shortcut, Hotkey
 * @documentation https://helix.fusion.dev/components/kbd
 *
 * @slot - The key's label.
 *
 * @csspart kbd - The key.
 */
@customElement('helix-headless-kbd')
export class HelixHeadlessKbd extends HelixElement {
  protected override render(): TemplateResult {
    return html`<kbd part="kbd"><slot></slot></kbd>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-kbd': HelixHeadlessKbd
  }
}
