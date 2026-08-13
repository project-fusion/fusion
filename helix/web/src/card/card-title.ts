import { HelixBaseCardTitle } from '@helix-io/headless'
import { type CSSResultGroup, css } from 'lit'
import { customElement } from 'lit/decorators.js'

/**
 * Titles name the card that contains them.
 *
 * @csspart heading - The heading element.
 */
@customElement('helix-card-title')
export class HelixCardTitle extends HelixBaseCardTitle {
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
      /* The title sits inside a header, which already owns the inset. */
      min-inline-size: 0;
    }

    [part='heading'] {
      color: var(--helix-color-foreground);
      font-size: var(--helix-text-lg);
      font-weight: var(--helix-weight-semibold);
      letter-spacing: var(--helix-tracking-tight);
      line-height: var(--helix-leading-tight);
      /* A title long enough to wrap should wrap, not push the header wide. */
      overflow-wrap: anywhere;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card-title': HelixCardTitle
  }
}
