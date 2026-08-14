import { customElement, HelixElement, type HelixSourceChangeEvent } from '@helix-io/core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HelixSandboxPreview } from '../preview/sandbox-preview.js'
import { styles } from './sandbox-root.css.js'

/** How far one arrow press moves the split, in percent. */
const STEP = 2

/** Bounds, so a pane can never be dragged to nothing. */
const MIN = 15
const MAX = 85

/**
 * @summary Pairs an editable source pane with a live preview.
 *
 * @description
 * Coordination is by event, the same way the accordion does it: a source pane
 * dispatches `SourceChange`, which bubbles, and the sandbox hands the value to
 * whatever preview is slotted into it. Neither child knows the other exists, so
 * either can be replaced or used alone.
 *
 * The event carries the pane's `name`, which is what lets one sandbox hold a
 * markup pane and a stylesheet pane without the root identifying senders by
 * reference. `css` becomes the preview's stylesheet; anything else is markup.
 *
 * The split is a real `role="separator"` with `aria-valuenow`, movable by
 * pointer and by arrow keys, because a divider that only responds to dragging
 * is unusable without a mouse. Home and End jump to the bounds.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Playground, REPL, Editor
 * @documentation https://helix.fusion.dev/sandbox
 *
 * @slot source - The editable source pane.
 * @slot preview - The live preview.
 *
 * @csspart pane - Either pane.
 * @csspart separator - The draggable divider.
 *
 * @cssproperty --sandbox-min-block-size - Minimum height of the sandbox.
 * @cssproperty --sandbox-separator-color - Color of the divider.
 */
@customElement('helix-sandbox')
export class HelixSandbox extends HelixElement {
  /** Whether the panes sit side by side or stacked. */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /** Percentage of the sandbox given to the source pane. */
  @property({ attribute: 'split', type: Number })
  split = 45

  /** Accessible name for the divider. */
  @property({ attribute: 'separator-label' })
  separatorLabel = 'Resize source pane'

  @state()
  private dragging = false

  private readonly handleSourceChange = (event: Event): void => {
    const { name, value } = (event as HelixSourceChangeEvent).detail
    for (const preview of this.previews) {
      if (name === 'css') {
        preview.styles = value
      } else {
        preview.source = value
      }
    }
  }

  /** Slotted previews. Client only: the server has no children to read. */
  private get previews(): HelixSandboxPreview[] {
    return [...this.children].filter(
      (child): child is HelixSandboxPreview => child instanceof HelixSandboxPreview,
    )
  }

  private clamp(next: number): number {
    return Math.min(MAX, Math.max(MIN, next))
  }

  /**
   * The orientation in force.
   *
   * Unset is horizontal, and stays unset: the default is the absent attribute,
   * so a reflected default cannot appear on the host after hydration.
   */
  private get axis(): 'horizontal' | 'vertical' {
    return this.orientation ?? 'horizontal'
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const back = this.axis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    const forward = this.axis === 'horizontal' ? 'ArrowRight' : 'ArrowDown'

    let next = this.split
    if (event.key === back) {
      next = this.split - STEP
    } else if (event.key === forward) {
      next = this.split + STEP
    } else if (event.key === 'Home') {
      next = MIN
    } else if (event.key === 'End') {
      next = MAX
    } else {
      return
    }

    event.preventDefault()
    this.split = this.clamp(next)
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.dragging = true
    // Capture on the separator, so a fast drag that outruns the pointer does
    // not drop the gesture the moment the cursor leaves the divider.
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragging) {
      return
    }
    const box = this.getBoundingClientRect()
    const ratio =
      this.axis === 'horizontal'
        ? ((event.clientX - box.left) / box.width) * 100
        : ((event.clientY - box.top) / box.height) * 100
    this.split = this.clamp(ratio)
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.dragging = false
    ;(event.target as HTMLElement).releasePointerCapture(event.pointerId)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('SourceChange', this.handleSourceChange)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('SourceChange', this.handleSourceChange)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleAttribute('data-dragging', this.dragging)
  }

  /**
   * Writes the split into the shadow root's own stylesheet.
   *
   * Into a `<style>` rather than onto `this.style`, because an inline style on
   * the host is an attribute the element gives itself once it upgrades, and a
   * React consumer's server markup does not have it: hydration reports the
   * mismatch and does not patch it up. The shadow root is not part of the tree
   * React hydrates.
   *
   * Filled imperatively because Lit rejects expressions inside `<style>`, which
   * is why the template carries a static empty one. The server renders the
   * stylesheet's default split, which is the same 45% this property defaults
   * to.
   */
  private applySplit(): void {
    const sheet = this.renderRoot.querySelector<HTMLStyleElement>('#split')
    if (sheet) {
      sheet.textContent = `:host { --_sandbox-split: ${this.split}%; }`
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.applySplit()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('split')) {
      this.applySplit()
    }
  }

  protected override render(): TemplateResult {
    return html`<style id="split"></style>
      <div part="pane"><slot name="source"></slot></div>
      <div
        part="separator"
        role="separator"
        tabindex="0"
        aria-label=${this.separatorLabel}
        aria-orientation=${this.axis === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-valuemax=${MAX}
        aria-valuemin=${MIN}
        aria-valuenow=${Math.round(this.split)}
        @keydown=${this.handleKeydown}
        @pointerdown=${this.handlePointerDown}
        @pointermove=${this.handlePointerMove}
        @pointerup=${this.handlePointerUp}
      ></div>
      <div part="pane"><slot name="preview"></slot></div>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox': HelixSandbox
  }
}
