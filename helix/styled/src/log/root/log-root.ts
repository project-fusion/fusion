import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLog } from '@fusion.dev/helix-headless/log'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './log-root.css.js'
import '../group/log-group.js'
import '../line/log-line.js'

/**
 * @summary Output that arrives while you watch it, such as a CI run, a deployment, or a build, in a box that follows the newest line.
 *
 * @description
 * A bordered box in the monospaced face, at the size of the page's small
 * text, that scrolls after 30rem (`--log-max-block-size`). Lines keep their
 * spaces and run past the edge of the box, which scrolls sideways, until
 * `wrap` is set.
 *
 * The sixteen ANSI colors come from your theme: red is the danger color,
 * green success, yellow warning, and blue info. Set `--log-ansi-red` and its
 * siblings on the log to choose them yourself.
 *
 * Put a search field or the controls for the log in the `toolbar` slot, in
 * one element such as a `Toolbar` or a `Flex`. It sits above the lines with a
 * rule under it.
 *
 * @since 0.200.0
 * @status experimental
 * @category feedback
 * @documentation https://fusion.dev/helix/components/log
 *
 * @cssproperty --log-background-color - The fill behind the lines. Defaults to the page background.
 * @cssproperty --log-border-color - The edge around the log and the rules inside it.
 * @cssproperty --log-color - The text color of the lines.
 * @cssproperty --log-font-family - The face of the lines. Defaults to the monospaced face.
 * @cssproperty --log-font-size - The size of the lines. Defaults to the small text step.
 * @cssproperty --log-line-height - The height of one line.
 * @cssproperty --log-max-block-size - How tall the log may get before the lines scroll. Defaults to 30rem.
 * @cssproperty --log-padding-inline - Space either side of every line and heading.
 * @cssproperty --log-radius - The corners of the log.
 * @cssproperty --log-scrollbar-thumb-color - The thumb of the scrollbar. Defaults to `--helix-scrollbar-thumb-color`.
 * @cssproperty --log-scrollbar-track-color - The track of the scrollbar. Defaults to `--helix-scrollbar-track-color`.
 * @cssproperty --log-step-max-block-size - How tall a step's lines may get in a `plain` log before they scroll. Defaults to 20rem.
 */
@customElement('helix-log')
export class HelixLog extends HelixHeadlessLog {
  static override tier = 'helix-'

  /**
   * How the log is set apart from what is around it.
   *
   * - `outlined`, the resting look, is a box with an edge and a fill of its
   *   own, which scrolls after `--log-max-block-size`.
   * - `plain` has no edge, no fill, no inset and no height of its own: the
   *   lines start where the text around them does and the log grows with
   *   them. For a log inside something that already frames it, such as an
   *   agent's work in a chat turn's `work` slot. Each step is a row with its
   *   status mark on that edge and its caret after the heading. A step that
   *   holds steps draws a rule beside them, and a step that holds lines draws
   *   them on a quiet surface that scrolls after `--log-step-max-block-size`.
   *
   * Both are writable, so a page can say which it means rather than relying
   * on the absence of an attribute.
   */
  @property({ reflect: true })
  separation?: 'outlined' | 'plain'

  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-log': HelixLog
  }
}
