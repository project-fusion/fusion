import { HelixBaseCard } from '@helix-io/headless'
import { type CSSResultGroup, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/**
 * Cards group related content and actions into a single surface.
 *
 * @csspart container - The card surface.
 *
 * @cssproperty --card-background-color - Surface behind the card.
 * @cssproperty --card-border-color - Border color of the surface.
 * @cssproperty --card-padding - Inset applied to each region.
 * @cssproperty --card-radii - Corner radius of the surface.
 */
@customElement('helix-card')
export class HelixCard extends HelixBaseCard {
  /**
   * How the card separates itself from the page.
   *
   * `outlined` is the default because a hairline is denser than a shadow,
   * scales better, and needs no tuning per color scheme. `elevated` is for a
   * card that genuinely floats above the content behind it.
   */
  @property({ reflect: true })
  appearance: 'outlined' | 'elevated' | 'plain' = 'outlined'

  /**
   * Tightens the inset for dense layouts.
   */
  @property({ reflect: true, type: Boolean })
  dense = false

  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    [part='container'] {
      background-color: var(--card-background-color, var(--helix-color-surface));
      border: var(--helix-border-thin) solid var(--card-border-color, var(--helix-color-border));
      border-radius: var(--card-radii, var(--helix-radii-md));
      color: var(--helix-color-foreground);
      display: flex;
      flex-direction: column;
      /* Regions own their own padding so any one of them can be omitted
         without leaving a gap the container already reserved. */
      overflow: hidden;
      transition: border-color var(--helix-duration-fast) var(--helix-easing-standard),
        box-shadow var(--helix-duration-fast) var(--helix-easing-standard);
    }

    :host([appearance='elevated']) [part='container'] {
      border-color: transparent;
      box-shadow: var(--helix-shadow-md);
    }

    :host([appearance='plain']) [part='container'] {
      background-color: transparent;
      border-color: transparent;
    }

    /* The inset every region inherits. Dense narrows it in one place rather
       than in each region's own stylesheet. */
    :host {
      --_card-inset: var(--card-padding, var(--helix-space-md));
    }

    :host([dense]) {
      --_card-inset: var(--card-padding, var(--helix-space-sm));
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card': HelixCard
  }
}
