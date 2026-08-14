import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup } from 'lit'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as sheet } from './sandbox-preview.css.js'

/** What the frame is told, and what it says back. */
export interface PreviewMessage {
  level?: 'log' | 'info' | 'warn' | 'error'
  source?: string
  styles?: string
  text?: string
  type: 'helix-preview-ready' | 'helix-preview-render' | 'helix-preview-console'
}

/**
 * @summary Renders sandbox source in a frame of its own.
 *
 * @description
 * A same-origin `<iframe>` pointed at `src`, which is a document the consumer
 * provides. That document imports whatever the examples need, listens for a
 * render message, and writes the markup into itself.
 *
 * **A frame rather than the page.** Rendering into the page meant an example
 * was styled by whatever surrounded it, which flatters the preview and lies
 * about it: an example that restyles `helix-card` restyled the sandbox too, a
 * script in an example ran against the real document, and a stray
 * `position: fixed` escaped the pane. It also left nothing to capture console
 * output from, and the terminal has to come from somewhere.
 *
 * The cost is that the frame starts empty. Styles and element definitions do
 * not cross into it, because a document has its own stylesheets and a window
 * has its own custom element registry, so `src` has to load them. That is the
 * consumer's document rather than something guessed at here.
 *
 * **The source is trusted.** It is markup a developer typed into their own
 * sandbox. Never point this at input from anyone else.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Result, Output
 * @documentation https://helix.fusion.dev/sandbox/preview
 *
 * @event {CustomEvent} helix-console - Relayed from the frame, one per console call.
 *
 * @csspart frame - The iframe.
 */
@customElement('helix-sandbox-preview')
export class HelixSandboxPreview extends HelixElement {
  /** Document the frame loads, which brings the styles and the elements. */
  @property()
  src = ''

  /** Markup to render. */
  @property()
  source = ''

  /** Stylesheet applied inside the frame, alongside the markup. */
  @property()
  styles = ''

  /** Accessible name for the frame. */
  @property()
  label = 'Preview'

  /** Writing direction inside the frame. */
  @property({ reflect: true })
  direction?: 'rtl'

  /** How the example is placed in the frame. */
  @property({ reflect: true })
  layout?: 'padded' | 'centered' | 'fullscreen'

  /** Whether the frame has said it is listening. */
  private ready = false

  private get frame(): HTMLIFrameElement | null {
    return this.renderRoot.querySelector('iframe')
  }

  /**
   * Takes messages from the frame.
   *
   * The source is checked against this frame's own window, because every frame
   * on the page posts to the same parent and a sandbox is rarely alone.
   */
  private readonly handleMessage = (event: MessageEvent<PreviewMessage>): void => {
    if (event.source !== this.frame?.contentWindow) {
      return
    }
    if (event.data?.type === 'helix-preview-ready') {
      this.ready = true
      this.send()
      return
    }
    if (event.data?.type === 'helix-preview-console') {
      this.dispatchEvent(
        new CustomEvent('helix-console', {
          bubbles: true,
          composed: true,
          detail: { level: event.data.level ?? 'log', text: event.data.text ?? '' },
        }),
      )
    }
  }

  /** Sends the current source to the frame, once it is listening. */
  private send(): void {
    if (!this.ready) {
      return
    }
    this.frame?.contentWindow?.postMessage(
      {
        direction: this.direction ?? 'ltr',
        layout: this.layout ?? 'padded',
        source: this.source,
        styles: this.styles,
        type: 'helix-preview-render',
      } satisfies PreviewMessage & { direction: string; layout: string },
      '*',
    )
  }

  override connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('message', this.handleMessage)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('message', this.handleMessage)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // A new document has to say it is listening again before anything is sent.
    if (changed.has('src')) {
      this.ready = false
      return
    }
    this.send()
  }

  protected override render(): TemplateResult {
    return html`<iframe part="frame" src=${this.src} title=${this.label}></iframe>`
  }

  static override styles: CSSResultGroup = sheet
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-preview': HelixSandboxPreview
  }
}
