import { HelixDisclosureBase } from '@helix-io/headless'
import { type CSSResultGroup, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/**
 * Disclosures let users show and hide a section of related content.
 *
 * @csspart container - The outer wrapper.
 * @csspart trigger - The clickable summary row.
 * @csspart content - The revealed region.
 *
 * @cssproperty --disclosure-background-color - Surface behind the disclosure.
 * @cssproperty --disclosure-border-color - Border color of the container.
 * @cssproperty --disclosure-padding - Inner padding of trigger and content.
 */
@customElement('helix-disclosure')
export class HelixDisclosure extends HelixDisclosureBase {
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
      border-radius: var(--helix-radius-md);
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
      min-block-size: var(--helix-control-height);
      padding: var(--disclosure-padding, var(--helix-space-3) var(--helix-space-4));
      transition: background-color var(--helix-duration-fast) var(--helix-ease-standard);
    }

    :host([dense]) [part='trigger'] {
      min-block-size: var(--helix-control-height-dense);
    }

    [part='trigger']:hover {
      background-color: var(--helix-color-primary-subtle);
    }

    [part='trigger']:focus-visible {
      outline: var(--helix-focus-ring-width) solid var(--helix-focus-ring-color);
      outline-offset: calc(var(--helix-focus-ring-offset) * -1);
    }

    [part='content'] {
      border-block-start: 1px solid var(--disclosure-border-color, var(--helix-color-border));
      color: var(--helix-color-foreground-muted);
      padding: var(--disclosure-padding, var(--helix-space-3) var(--helix-space-4));
    }

    [part='content'][hidden] {
      display: none;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-disclosure': HelixDisclosure
  }
}
