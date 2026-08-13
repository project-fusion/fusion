import { type CSSResultOrNative, css, LitElement } from 'lit'

/**
 * Applied to every Helix component's shadow root so component CSS can rely on
 * border-box on both sides of the shadow boundary. The light DOM gets the same
 * rule from `@helix-io/styles/base.css`.
 */
const BOX_SIZING = css`
  *,
  ::before,
  ::after {
    box-sizing: border-box;
  }
`

/**
 * @summary Base class every Helix element extends.
 *
 * @description
 * Owns only what is universal: normalizing `box-sizing` inside the shadow root,
 * so component CSS can rely on border-box on both sides of the boundary.
 *
 * There is deliberately no `emit(name, detail)` helper. A dispatch through a
 * generic helper cannot be named by the manifest analyzer, which recorded the
 * parameter identifier and produced a phantom event on every element that
 * inherited it. Components dispatch concrete event classes from `events.ts`,
 * which the analyzer and TypeScript can both see.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/core/helix-element
 */
export class HelixElement extends LitElement {
  /**
   * Prepends the shadow-root reset to every subclass's styles, so no component
   * has to remember to include it.
   */
  protected static override finalizeStyles(
    styles?: CSSResultOrNative | CSSResultOrNative[],
  ): CSSResultOrNative[] {
    return [BOX_SIZING, ...LitElement.finalizeStyles(styles)]
  }
}
