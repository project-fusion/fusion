import {
  customElement,
  HelixConsoleEvent,
  HelixElement,
  HelixResizeEvent,
} from '@fusion.dev/helix-core'

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
  colorMode?: 'dark' | 'light'
  direction: 'ltr' | 'rtl'
  layout: 'padded' | 'centered' | 'fullscreen' | 'hug'
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

/** How tall the frame says its content is, in CSS pixels. */
export interface PreviewSize {
  size: number
  type: 'helix-preview-size'
}

export type PreviewMessage = PreviewConsole | PreviewReady | PreviewRender | PreviewSize

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
 * `sandbox="allow-scripts"` and no `allow-same-origin`, so the document runs on
 * an opaque origin: script in an example cannot reach this page, its storage,
 * its cookies, or the editor the source was typed into. Without it they could,
 * measured, through an `onerror` handler on an image that fails to load, which
 * `innerHTML` does not strip the way it refuses a `<script>` tag. That is what
 * lets a sandbox hold markup a reader pasted from somewhere, or one day arrived
 * in a shared link, rather than only what its owner typed.
 *
 * `allow-forms` is granted because examples have forms in them and a submit
 * that silently does nothing is a worse lie than one that navigates a frame
 * nobody is looking at. Top-level navigation, popups and modals are not.
 *
 * **`allow="clipboard-write *; fullscreen *"`, and the stars matter.** Both
 * policies default to `self`, and a frame on an opaque origin is not `self`, so
 * the default denies both: a component that copies to the clipboard and a video
 * offering a fullscreen button each become a control that silently does nothing,
 * a denied request rejecting a promise nobody was watching. Nothing else is
 * granted, and a copy still needs the reader's own gesture.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Result, Output
 * @documentation https://helix.fusion.dev/sandbox/preview
 *
 * @event {HelixConsoleEvent} helix-console - Relayed from the frame, one per console call.
 * @event {HelixResizeEvent} helix-resize - How tall the frame's content is, whenever it changes.
 *
 * @csspart frame - The iframe.
 */
@customElement('helix-sandbox-preview')
export class HelixSandboxPreview extends HelixElement {
  /**
   * Which half of the palette the frame renders in.
   *
   * **The frame is a document and a document has its own color mode.** Setting
   * `data-color-mode` on this element styles this element, and the contents of
   * an iframe inherit nothing from it: measured, a frame under a host carrying
   * the attribute had it unset on its own root. Left alone the frame follows
   * `prefers-color-scheme`, which is right for a preview that should look like
   * the reader's own machine, and wrong for one whose tool has a scheme control.
   *
   * It matters more than a background: `light-dark()` is compiled to a shim
   * keyed on this attribute, and of the 56 tokens that differ by scheme the
   * theme engine emits 19. The other 37 would stay light in a dark preview,
   * including every one of the 24 series colors a chart reads.
   */
  @property({ attribute: 'color-mode' })
  colorMode?: 'dark' | 'light'

  /**
   * Writing direction inside the frame.
   */
  @property({ reflect: true })
  direction?: 'rtl'

  /**
   * Accessible name for the frame.
   */
  @property()
  label = 'Preview'

  /**
   * How the example is placed in the frame.
   */
  @property({ reflect: true })
  layout?: 'padded' | 'centered' | 'fullscreen' | 'hug'

  /**
   * Markup to render.
   */
  @property()
  source = ''

  /**
   * Document the frame loads, which brings the styles and the elements.
   */
  @property()
  src = ''

  /**
   * Stylesheet applied inside the frame, alongside the markup.
   */
  @property()
  styles = ''

  /** Whether the frame has said it is listening. */
  private ready = false

  private get frame(): HTMLIFrameElement | null {
    return this.renderRoot.querySelector('iframe')
  }

  /**
   * The frame's document has finished loading, so its listener exists.
   *
   * **The announcement is one shot and the parent can miss it.** The frame posts
   * `helix-preview-ready` at the end of its own module evaluation and never
   * repeats it, and `handleMessage` drops anything whose `source` is not
   * `this.frame?.contentWindow`. That getter reads the render root, so it is
   * null until this element has rendered once: a frame that loads before that
   * render commits announces into a guard that refuses it, `ready` stays false,
   * and `send` returns early forever, leaving the source set, the markup
   * correct, and the preview blank with nothing logged.
   *
   * **It is a race, so it hides in the one place nobody looks.** The frame is
   * only fast enough to win when its document and its bundle are already in the
   * HTTP cache, which is a client-side navigation and never a cold load.
   * Measured on the theme builder reached by clicking a link: `ready` false, a
   * 9,382 character `source` in place, and an empty preview, where the same
   * page loaded directly rendered correctly.
   *
   * `load` closes it without a retry protocol and without weakening either
   * check on the way in. The frame's script is `defer`, so it has run by the
   * time this fires, which makes the event a guarantee that the listener is
   * there rather than a guess that it might be. The message path stays, because
   * it is the one that works when the frame is slower than the render, and
   * either arriving is enough.
   */
  private readonly handleFrameLoad = (): void => {
    this.ready = true
    this.send()
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
    /* Relayed rather than acted on. What the frame measured is a fact about the
       example; how much room to give it is a decision, and it belongs to
       whatever laid this element out. A preview that resized itself would be
       deciding for the page it sits in, and the workbench and a reference page
       want opposite things from the same number. */
    if (event.data?.type === 'helix-preview-size') {
      this.dispatchEvent(new HelixResizeEvent({ size: event.data.size }))
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
   * A frame is the wrong unit. Keystrokes arrive fifty to a hundred and fifty
   * milliseconds apart, so each one lands in a frame of its own and coalescing
   * by frame coalesces nothing, leaving the example rebuilt per character. The
   * delay has to be longer than the gap between keystrokes to catch a burst, and
   * short enough to read as immediate when the typing stops.
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
      ...(this.colorMode ? { colorMode: this.colorMode } : {}),
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
     * upgrades a second time. Sent on each update that is once per keystroke,
     * and the work grows with the example while the typing does not.
     *
     * `SETTLE` is short enough to feel immediate and long enough that a burst of
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
      @load=${this.handleFrameLoad}
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
