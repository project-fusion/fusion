import type { HelixElement } from '@fusion.dev/helix-core'
import { property } from 'lit/decorators.js'

/* Declared here rather than imported, which is what every mixin in `core` does:
   the type is three tokens and exporting it would make a shape that has to stay
   compatible out of something each file can state for itself. */
// biome-ignore lint/suspicious/noExplicitAny: a mixin's base takes any arguments.
type Constructor<T> = new (...args: any[]) => T

/**
 * How much ink a control claims and what it means, for the three that are buttons.
 *
 * **It belongs here rather than in `core`.**
 * `helix/core` is consumed by the headless tier, which must never take styling,
 * and these two properties are purely presentational: they carry no behavior,
 * no ARIA and no form participation, only which rules a stylesheet applies.
 * Declaring them in core would put a treatment on the tier whose whole purpose
 * is not having one.
 *
 * **Why a mixin rather than inheritance.** `Button`, `IconButton` and
 * `CopyButton` all want this pair, and the styled tier cannot get it by
 * extending: each styled class extends its own base, which is what keeps a
 * control's behavior and its presentation in one branch. `CopyButton` already
 * composes `IconButton`'s stylesheet, `[HelixIconButton.styles, styles]`, which
 * is the same move for CSS; this is that move for API. Redeclared instead, the
 * three drift the first time one gains a value.
 */
export declare class MixinControlSurfaceInterface {
  /**
   * How much fill the control is drawn with. Without it, the control uses its
   * default.
   */
  emphasis?: 'ghost' | 'outlined' | 'solid' | 'subtle'
  /**
   * Which color the control is drawn in, by what it means. Without it, the tone
   * is `neutral`.
   */
  tone?: 'accent' | 'danger' | 'neutral' | 'primary'
}

export const MixinControlSurface = <T extends Constructor<HelixElement>>(Base: T) => {
  // Duplicated from the interface deliberately: the interface is what a
  // TypeScript consumer sees, and this class is what the manifest analyzer
  // reads when resolving inherited members into dependent packages.
  class ControlSurfaceElement extends Base {
    /**
     * How much fill the control is drawn with.
     *
     * Not `separation`: a Card's `outlined` says where a surface ends, and this
     * one says how much ink a control claims. One word cannot say both.
     *
     * Reflected because the stylesheet selects on it, and undefaulted because
     * it reflects: a reflected property with a default writes its attribute
     * onto every host anybody renders. The resting treatment is the attribute's
     * absence, which each control names for itself, `outlined` on `Button` and
     * `ghost` on `IconButton`.
     */
    @property({ reflect: true })
    emphasis?: 'ghost' | 'outlined' | 'solid' | 'subtle'

    /**
     * Which color the control is drawn in, by what it means.
     *
     * Three and an accent, not the full status set. A tag reports a state and a
     * button performs an action: a success button and a warning button are not
     * things anybody writes, and offering them invites a page where the color
     * of a control means nothing in particular. `accent` is the second
     * emphasis: the second color a theme names, and the brand itself until one
     * is named. It used to be a rotation off the brand seed whether or not
     * anybody asked for a second color, which handed every theme a complement
     * it had not chosen, 3 degrees off `warning` and sometimes too pale to
     * read.
     */
    @property({ reflect: true })
    tone?: 'accent' | 'danger' | 'neutral' | 'primary'
  }

  return ControlSurfaceElement as unknown as Constructor<MixinControlSurfaceInterface> & T
}
