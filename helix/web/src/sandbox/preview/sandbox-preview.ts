import { customElement, HelixConsoleEvent, HelixElement } from '@helix-io/core'

/**
 * How long the source has to stop changing before the frame is asked to render,
 * in milliseconds.
 *
 * Long enough that a run of keystrokes is one render, short enough that letting
 * go of the keyboard and looking up finds the preview already there.
 */
const SETTLE = 120

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
 * A sandboxed `<iframe>` pointed at `src`, which is a document the consumer
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
 * **The source is not trusted, and the frame is what makes that safe.**
 * `fullscreen` is granted for the same reason and found the same way: a video
 * in the preview offered a fullscreen button that did nothing at all, because
 * the policy default is `self`, this frame is not `self`, and a denied request
 * rejects a promise nobody was watching. Two capabilities now, both explicit,
 * both starred.
 *
 * `allow="clipboard-write *"` is granted explicitly, and the star matters: the
 * policy defaults to `self` and this frame has an opaque origin, so it is not
 * `self` and the default denies it. A component inside the preview that copies
 * to the clipboard is otherwise a control that silently does nothing, which is
 * how this was found. Nothing else is granted, and a copy still needs the
 * reader's own gesture.
 *
 * `sandbox="allow-scripts"` and no `allow-same-origin`, so the document runs on
 * an opaque origin: script in an example cannot reach this page, its storage,
 * its cookies, or the editor the source was typed into. Without it they could,
 * measured, through an `onerror` handler on an image that fails to load, which
 * `innerHTML` does not strip the way it refuses a `<script>` tag.
 *
 * That is what lets a sandbox hold markup a reader pasted from somewhere, or
 * one day arrived in a shared link, rather than only what its owner typed.
 *
 * `allow-forms` is granted because examples have forms in them and a submit
 * that silently does nothing is a worse lie than one that navigates a frame
 * nobody is looking at. Top-level navigation, popups and modals are not.
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
   * Two checks, and both earn their place.
   *
   * The window is the identity: `event.source` is a reference the sender cannot
   * forge, and this frame's `contentWindow` is one only this element holds.
   *
   * The origin has to be opaque. The frame is sandboxed, so every message it
   * sends arrives as `"null"`, measured. A real origin therefore means the
   * frame is no longer showing the document it was given: `allow-scripts` lets
   * an example navigate its own frame, and whatever it navigated to inherits
   * `contentWindow` and could otherwise write lines into the terminal as though
   * the example had logged them.
   */
  private readonly handleMessage = (event: MessageEvent<PreviewMessage>): void => {
    if (event.source !== this.frame?.contentWindow || event.origin !== 'null') {
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
   * Where messages to the frame are addressed.
   *
   * `'*'`, because there is nothing else to say: a sandboxed document has an
   * opaque origin and `postMessage` has no target string that names one.
   *
   * It costs nothing. What is sent is the example's own source and stylesheet,
   * to the document that is about to render them, and that document is the one
   * thing on the page already entitled to both.
   */
  private static readonly target = '*'

  /** Set while a coalesced send is waiting, so only one is ever queued. */
  private pending: ReturnType<typeof setTimeout> | undefined

  /**
   * Sends once the typing stops, replacing anything already waiting.
   *
   * A frame was tried first and is the wrong unit. Keystrokes arrive fifty to a
   * hundred and fifty milliseconds apart, so each one lands in a frame of its
   * own and coalescing by frame coalesces nothing: the example was still being
   * rebuilt per character. The delay has to be longer than the gap between
   * keystrokes to catch a burst, and short enough to read as immediate when the
   * typing stops.
   */
  private scheduleSend(): void {
    clearTimeout(this.pending)
    this.pending = setTimeout(() => {
      this.pending = undefined
      this.send()
    }, SETTLE)
  }

  /** Sends the current source to the frame, once it is listening. */
  private send(): void {
    if (!this.ready) {
      return
    }
    const message: PreviewRender = {
      direction: this.direction ?? 'ltr',
      layout: this.layout ?? 'padded',
      source: this.source,
      styles: this.styles,
      type: 'helix-preview-render',
    }
    this.frame?.contentWindow?.postMessage(message, HelixSandboxPreview.target)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('message', this.handleMessage)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    clearTimeout(this.pending)
    this.pending = undefined
    window.removeEventListener('message', this.handleMessage)
  }

  /**
   * Loads the frame's document again, and re-sends the example to it.
   *
   * For a bundle that has changed underneath a page nobody reloaded. The frame
   * carries its own build of the component library, as a classic script it ran
   * once at load, so a rebuilt bundle reaches a tab that is already open
   * exactly never: the sandbox around it hot-reloads and the preview inside it
   * keeps running whatever it started with, which reads as a component fix that
   * did not work.
   *
   * Nothing needs to be resent by the caller. Clearing `ready` and reassigning
   * `src` puts this back in the state it was in before the first load, and the
   * new document announces itself the same way the first one did.
   */
  reload(): void {
    const frame = this.frame
    if (!frame) {
      return
    }
    this.ready = false
    frame.src = this.src
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // A new document has to say it is listening again before anything is sent.
    if (changed.has('src')) {
      this.ready = false
      return
    }
    /* Typing is coalesced; a setting is not.
     *
     * The frame renders by assigning `innerHTML`, which throws away the example
     * and builds it again, and every custom element in it disconnects and
     * upgrades a second time. Sent on each update, that happened once per
     * keystroke: an example of any size was being torn down and rebuilt for
     * every character, and the work grows with the example while the typing
     * does not.
     *
     * A frame is short enough to feel immediate and long enough that a burst of
     * keystrokes is one render. Layout, direction and the color mode go
     * straight out: they arrive one at a time from a menu, there is nothing to
     * coalesce, and a delay there is a delay a reader can see. */
    if (changed.has('source') || changed.has('styles')) {
      this.scheduleSend()
      return
    }
    this.send()
  }

  protected override render(): TemplateResult {
    return html`<iframe
      part="frame"
      src=${this.src}
      title=${this.label}
      allow="clipboard-write *; fullscreen *"
      sandbox="allow-scripts allow-forms"
    ></iframe>`
  }

  static override styles: CSSResultGroup = sheet
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-preview': HelixSandboxPreview
  }
}
