import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** What a dismiss button says, does and holds. */
export interface DrawDismissOptions {
  /** Whether the button is disabled, as a disabled tag's is. */
  disabled?: boolean | undefined
  /** The button's accessible name, such as "Dismiss" or "Remove Design". */
  label: string
  /**
   * What the button holds: the `dismiss-icon` slot around `drawDismissGlyph()`,
   * written in the component's own `protected render…()` so a tier can move it.
   */
  mark: unknown
  /** What a press does. */
  onDismiss: () => void
  /** The button's `tabindex`, where it is not in the page's own order. */
  tabindex?: string | undefined
}

/**
 * A dismiss button, `<button part="dismiss" type="button">`, named by `label`
 * and holding `mark`.
 *
 * **A plain `<button>` in the shadow root, never a nested component**, so the
 * styled tier reaches the control itself through `[part="dismiss"]`. Toast,
 * Callout, Dialog and Tag draw it, and each documents `dismiss` and
 * `dismiss-mark` and the `dismiss-icon` slot. The slot stays in each
 * component's own render seam, where its fallback is a tier's to replace.
 */
export const drawDismiss = ({
  disabled = false,
  label,
  mark,
  onDismiss,
  tabindex,
}: DrawDismissOptions): TemplateResult => html`<button
  part="dismiss"
  type="button"
  aria-label=${label}
  ?disabled=${disabled}
  tabindex=${tabindex ?? nothing}
  @click=${onDismiss}
>
  ${mark}
</button>`

/** The cross a dismiss button shows where nothing is slotted: `<svg part="dismiss-mark">`. */
export const drawDismissGlyph = (): TemplateResult =>
  html`<svg part="dismiss-mark" viewBox=${x.viewBox} fill="currentColor" aria-hidden="true">
    ${unsafeSVG(x.content)}
  </svg>`
