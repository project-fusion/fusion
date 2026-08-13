import { HelixBaseDisclosure } from '@helix-io/headless'
import { type CSSResultGroup, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/**
 * Disclosures let users show and hide a section of related content.
 *
 * @csspart container - The outer wrapper.
 * @csspart trigger - The clickable summary row.
 * @csspart content - The revealed region. Animates open and closed.
 * @csspart content-inner - Padding wrapper inside the animated region.
 *
 * @cssproperty --disclosure-background-color - Surface behind the disclosure.
 * @cssproperty --disclosure-border-color - Border color of the container.
 * @cssproperty --disclosure-padding - Inner padding of trigger and content.
 */
@customElement('helix-disclosure')
export class HelixDisclosure extends HelixBaseDisclosure {
  /**
   * Visual weight of the disclosure.
   */
  @property({ reflect: true })
  appearance: 'outlined' | 'plain' = 'outlined'

  /**
   * Reduces the vertical padding for dense layouts.
   */
  @property({ reflect: true, type: Boolean })
  dense = false

  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    [part='container'] {
      background-color: var(--disclosure-background-color, var(--helix-color-surface));
      border: 1px solid var(--disclosure-border-color, var(--helix-color-border));
      border-radius: var(--helix-radii-md);
      overflow: hidden;
    }

    :host([appearance='plain']) [part='container'] {
      background-color: transparent;
      border-color: transparent;
    }

    [part='trigger'] {
      all: unset;
      align-items: center;
      color: var(--helix-color-foreground);
      cursor: pointer;
      display: flex;
      font-size: var(--helix-text-md);
      inline-size: 100%;
      justify-content: space-between;
      min-block-size: var(--helix-size-control);
      padding: var(--disclosure-padding, var(--helix-space-sm) var(--helix-space-md));
      transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
    }

    :host([dense]) [part='trigger'] {
      min-block-size: var(--helix-size-control-dense);
    }

    [part='trigger']:hover {
      background-color: var(--helix-color-primary-subtle);
    }

    [part='trigger']:focus-visible {
      outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
      outline-offset: calc(var(--helix-size-focus-offset) * -1);
    }

    /* Content stays in the box tree when closed so it can animate. A grid
       collapsing from 0fr to 1fr is the only technique that transitions to the
       content's intrinsic height without measuring it in JavaScript. */
    [part='content'] {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows var(--helix-duration-normal) var(--helix-easing-standard);
    }

    :host([data-open]) [part='content'] {
      grid-template-rows: 1fr;
    }

    [part='content-inner'] {
      /* The grid row is the thing being animated, so the child must be allowed
         to be clipped below its own min-content height. */
      min-block-size: 0;
      overflow: hidden;
    }

    :host([data-open]) [part='content-inner'] {
      border-block-start: 1px solid var(--disclosure-border-color, var(--helix-color-border));
      color: var(--helix-color-foreground-muted);
      padding: var(--disclosure-padding, var(--helix-space-sm) var(--helix-space-md));
    }

    @media (prefers-reduced-motion: reduce) {
      [part='content'] {
        transition: none;
      }
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-disclosure': HelixDisclosure
  }
}
