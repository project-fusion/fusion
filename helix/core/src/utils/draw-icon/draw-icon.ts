import type { HelixIcon } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** Where a glyph goes, which is the one attribute that varies. */
export interface DrawIconOptions {
  /**
   * A `slot`, for a glyph being handed to another component.
   */
  slot?: string
}

/**
 * Draws an icon that was imported by name, rather than looked up by string.
 *
 * **`<helix-icon name="play">` indexes the whole icon set at runtime.** Its
 * render is `icons[this.name]`, and no bundler can shake a dynamic index, so
 * every consumer of any component that renders one ships all of the generated
 * path data: measured at 50,814 bytes raw and 15,010 gzipped for 102 icons, and
 * growing about 147 gzipped bytes per icon added. A named import ships one path
 * and is checked when the package compiles rather than by a name lookup later.
 *
 * That element still earns its place as *public* API, where a consumer writes a
 * name in markup and a lookup is the only thing that can work. What it should
 * not be is how this library draws its own marks.
 *
 * **There is no `part` option, and there cannot be.** A part name behind an
 * interpolation is a part the manifest cannot see, so the component's own
 * stylesheet matches nothing and the part stops being
 * API. `Trend` needs one and therefore writes its `<svg>` out with a literal
 * `part="icon"`, which is the honest cost: a helper can carry everything except
 * the thing static analysis has to read.
 *
 * `data-glyph` rather than a class, because the sizing lives in
 * `helix/styled/src/icon/glyph.css` and a component's own `--icon-size`
 * declarations have to keep working untouched: the variable was read by
 * `helix-icon`, and now it is read by the rule that sheet carries. Without it
 * every one of those declarations would go quietly dead and every mark in six
 * families would change size.
 */
export const drawIcon = (icon: HelixIcon, options: DrawIconOptions = {}): TemplateResult =>
  html`<svg
    aria-hidden="true"
    data-glyph
    fill="currentColor"
    slot=${options.slot ?? nothing}
    viewBox=${icon.viewBox}
  >
    ${unsafeSVG(icon.content)}
  </svg>`
