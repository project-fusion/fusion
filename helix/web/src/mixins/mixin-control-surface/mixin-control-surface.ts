import type { HelixElement } from '@helix-io/core'
import { property } from 'lit/decorators.js'

/* Declared here rather than imported, which is what every mixin in `core` does:
   the type is three tokens and exporting it would make a shape that has to stay
   compatible out of something each file can state for itself. */
// biome-ignore lint/suspicious/noExplicitAny: a mixin's base takes any arguments.
type Constructor<T> = new (...args: any[]) => T

/**
 * How a control is drawn and what it means, for the three that are buttons.
 *
 * **The first mixin in `helix/web`, and it belongs here rather than in core.**
 * `helix/core` is consumed by the headless tier, which must never take styling,
 * and these two properties are purely presentational: they carry no behaviour,
 * no ARIA and no form participation, only which rules a stylesheet applies.
 * Declaring them in core would put an appearance on the tier whose whole
 * purpose is not having one.
 *
 * **Why a mixin rather than inheritance.** `Button`, `IconButton` and
 * `CopyButton` all want this pair, and the styled tier cannot get it by
 * extending: each styled class extends its own base, which is what keeps a
 * control's behaviour and its presentation in one branch. `CopyButton` already
 * composes `IconButton`'s stylesheet, `[HelixIconButton.styles, styles]`, which
 * is the same move for CSS; this is that move for API. Redeclared instead, the
 * three drift the first time one gains a value.
 */
export declare class MixinControlSurfaceInterface {
  /** How filled it is drawn. Absent is the control's own resting treatment. */
  appearance?: 'ghost' | 'outlined' | 'solid' | 'subtle'
  /** What it means. Absent is `neutral`, which is the resting case. */
  tone?: 'accent' | 'danger' | 'neutral' | 'primary'
}

export const MixinControlSurface = <T extends Constructor<HelixElement>>(Base: T) => {
  // Duplicated from the interface deliberately: the interface is what a
  // TypeScript consumer sees, and this class is what the manifest analyzer
  // reads when resolving inherited members into dependent packages.
  class ControlSurfaceElement extends Base {
    /**
     * How filled it is drawn.
     *
     * Reflected because the stylesheet selects on it, and undefaulted because
     * it reflects: a reflected property with a default writes its attribute
     * onto every host anybody renders. The resting treatment is the attribute's
     * absence, which each control names for itself, `outlined` on `Button` and
     * `ghost` on `IconButton`.
     */
    @property({ reflect: true })
    appearance?: 'ghost' | 'outlined' | 'solid' | 'subtle'

    /**
     * What it means.
     *
     * Three and an accent, not the full status set. A tag reports a state and a
     * button performs an action: a success button and a warning button are not
     * things anybody writes, and offering them invites a page where the colour
     * of a control means nothing in particular. `accent` is the second
     * emphasis, a rotation off the brand seed rather than a colour of its own,
     * so it stays in relation when somebody rethemes.
     */
    @property({ reflect: true })
    tone?: 'accent' | 'danger' | 'neutral' | 'primary'
  }

  return ControlSurfaceElement as unknown as Constructor<MixinControlSurfaceInterface> & T
}
