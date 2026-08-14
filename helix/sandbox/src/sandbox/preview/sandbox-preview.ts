import { customElement, HelixConsoleEvent, HelixElement } from '@helix-io/core'
import type { CSSResultGroup } from 'lit'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as sheet } from './sandbox-preview.css.js'

/** The frame saying it has a listener, and where to answer it. */
export interface PreviewReady {
  type: 'helix-preview-ready'
}

/** What the frame is asked to render. */
export interface PreviewRender {
  direction: 'ltr' | 'rtl'
  layout: 'padded' | 'centered' | 'fullscreen'
  /** Where to answer, so the frame need not guess its parent's origin. */
  origin: string
  source: string
  styles: string
  type: 'helix-preview-render'
}

/** One console call from inside the frame. */
export interface PreviewConsole {
  level: 'log' | 'info' | 'warn' | 'error'
  text: string
  type: 'helix-preview-console'
}

export type PreviewMessage = PreviewConsole | PreviewReady | PreviewRender

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
 * @event {HelixConsoleEvent} helix-console - Relayed from the frame, one per console call.
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
    if (event.source !== this.frame?.contentWindow || event.origin !== this.origin) {
      return
    }
    if (event.data?.type === 'helix-preview-ready') {
      this.ready = true
      this.send()
      return
    }
    if (event.data?.type === 'helix-preview-console') {
      this.dispatchEvent(new HelixConsoleEvent({ level: event.data.level, text: event.data.text }))
    }
  }

  /**
   * The origin the frame is on, which is what it is answered at.
   *
   * `postMessage` to `'*'` delivers to whatever the frame has navigated to,
   * which is not necessarily what `src` said. Naming the origin means a frame
   * that moved gets nothing rather than the sandbox's contents.
   */
  private get origin(): string {
    try {
      return new URL(this.src, window.location.href).origin
    } catch {
      return window.location.origin
    }
  }

  /** Sends the current source to the frame, once it is listening. */
  private send(): void {
    if (!this.ready) {
      return
    }
    const message: PreviewRender = {
      direction: this.direction ?? 'ltr',
      layout: this.layout ?? 'padded',
      origin: window.location.origin,
      source: this.source,
      styles: this.styles,
      type: 'helix-preview-render',
    }
    this.frame?.contentWindow?.postMessage(message, this.origin)
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
