import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTerminal } from '@fusion.dev/helix-headless/terminal'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './terminal-root.css.js'
import '../../button/index.js'
import '../../icon-button/index.js'
import '../../tooltip/index.js'
import '../../toolbar/index.js'

/**
 * @summary A frame around a terminal emulator that runs a shell you connect.
 *
 * @description
 * The styled frame: a bordered box on the page's background with a header
 * strip for the name and the controls, and a status line that appears when
 * the process exits. It is 24rem tall unless `fill` is set or
 * `--terminal-block-size` says otherwise.
 *
 * `connectTerminal` themes the terminal from your tokens. The sixteen ANSI
 * colors share Log's hues, red the danger color, green success, yellow
 * warning, and blue info, and the four grays keep their order from dark to
 * light in each color mode. Set `--terminal-ansi-red` and its siblings,
 * `--terminal-cursor-color`, or `--terminal-selection-background-color` on
 * the terminal to choose them yourself, such as
 * `helix-terminal { --terminal-ansi-blue: #3b82f6 }`. The
 * [Terminals](https://fusion.dev/helix/docs/terminals) guide lists them all.
 *
 * Set `fill` for a terminal that fills a pane, such as one side of a
 * `Splitter`: the frame covers its container, which needs a position of its
 * own, such as `position: relative`. Set `separation="plain"` where the pane
 * already draws the edge.
 *
 * @since 0.209.0
 * @status experimental
 * @category media
 * @aliases Terminal emulator, Shell, xterm
 * @documentation https://fusion.dev/helix/components/terminal
 *
 * @cssproperty --terminal-block-size - The frame's height, as a length. Ignored with `fill`, where the container decides it.
 * @cssproperty --terminal-border-color - The edge around the frame and the rules inside it.
 * @cssproperty --terminal-font-family - The face of the grid. Defaults to the monospaced face.
 * @cssproperty --terminal-font-size - The size of the grid's text. Defaults to the small text step.
 * @cssproperty --terminal-header-background-color - The fill of the header, the find bar, and the status line.
 * @cssproperty --terminal-padding - The space between the frame's edge and the grid.
 * @cssproperty --terminal-radius - The frame's corners.
 */
@customElement('helix-terminal')
export class HelixTerminal extends HelixHeadlessTerminal {
  static override tier = 'helix-'

  /**
   * Covers the container instead of taking a height of its own, for a
   * terminal that fills a pane. The container needs a position, such as
   * `position: relative`.
   */
  @property({ reflect: true, type: Boolean })
  fill = false

  /**
   * How the frame stands off the page. Unset, it is outlined. `plain` draws
   * no edge or corners, for a pane that draws its own.
   */
  @property({ reflect: true })
  separation?: 'outlined' | 'plain'

  /* The live region's clip first, as that sheet asks, and the glyphs'
     size before this family's own rules. */
  static override styles: CSSResultGroup = [liveStyles, glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-terminal': HelixTerminal
  }
}
