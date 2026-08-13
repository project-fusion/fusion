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
 * Base class for every Helix element.
 *
 * Owns only what is universal: shadow-root normalization and the shared
 * lifecycle surface. Anything visual belongs in the styled tier; anything
 * component-specific belongs in the component.
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

  /**
   * Dispatches a composed, bubbling CustomEvent. Kebab-case names map to React
   * `onFooBar` props through the wrapper generator, so event names are part of
   * the public API and should be treated as such.
   */
  protected emit<T>(name: string, detail?: T): boolean {
    return this.dispatchEvent(
      new CustomEvent<T | undefined>(name, {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail,
      }),
    )
  }
}
