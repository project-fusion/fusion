import { burstConfetti, customElement, HelixElement } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { styles } from './confetti-root.css.js'

/**
 * The colors in a comma-separated list, split on the commas between them and
 * none inside a function such as `light-dark(navy, skyblue)`.
 */
const splitColors = (list: string): string[] => {
  const colors: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < list.length; index++) {
    const character = list[index]
    if (character === '(') {
      depth += 1
    } else if (character === ')') {
      depth = Math.max(depth - 1, 0)
    } else if (character === ',' && depth === 0) {
      colors.push(list.slice(start, index))
      start = index + 1
    }
  }
  colors.push(list.slice(start))
  return colors.map((color) => color.trim()).filter(Boolean)
}

/**
 * @summary Bursts confetti out of its content, such as a button, once an action has finished.
 *
 * @description
 * Put the control that finishes something inside, such as the last button of
 * onboarding or a publish button. The pieces fly up from the content, fall,
 * turn, and fade, in about a second and a half.
 *
 * The pieces are drawn on a canvas over the whole viewport, which takes no
 * pointer and is hidden from screen readers. Nothing
 * is drawn where the reader asked for less movement, or while a press on
 * `Motion Toggle` has paused the page's motion, and `burst()` then resolves at
 * once.
 *
 * The pieces take the theme's first six series colors, or the colors in
 * `--confetti-colors`. Without the element, core's `burstConfetti` bursts from
 * any element.
 *
 * @since 0.246.0
 * @status experimental
 * @category content
 * @aliases Celebration, Party popper, Success burst
 * @use The end of a milestone, such as publishing a page or finishing onboarding.
 * @instead toast - A confirmation of a routine action, such as saving a change.
 * @instead shine - A button that draws the eye before it is pressed.
 * @practice Call `burst()` once the action has finished. - A press does not burst by itself, because an action can still fail after it.
 * @practice Say that the action is done in words as well, such as in a status message. - A burst is decoration: a screen reader hears nothing, and reduced motion draws nothing.
 * @documentation https://fusion.dev/design/components/confetti
 *
 * @slot - The content the confetti bursts out of.
 *
 * @cssproperty --confetti-colors - The colors of the pieces, as a comma-separated list of CSS colors. Defaults to `--helix-color-series-1` to `--helix-color-series-6`.
 */
@customElement('helix-confetti')
export class HelixConfetti extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * Bursts confetti out of the content, and resolves once the last piece is
   * gone. Call it once the action is done.
   */
  burst(): Promise<void> {
    const list = getComputedStyle(this).getPropertyValue('--confetti-colors')
    const colors = splitColors(list)
    return burstConfetti(this, colors.length > 0 ? { colors } : {})
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-confetti': HelixConfetti
  }
}
