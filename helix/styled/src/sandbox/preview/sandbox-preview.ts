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

/**
 * A press inside the frame, which is the one event the page cannot see for
 * itself.
 *
 * Carries nothing. What the page needs to know is that a reader pressed
 * something here, not where: every overlay outside is dismissed by the fact of
 * the press, and coordinates in the frame's viewport would not mean anything in
 * the page's anyway.
 */
export interface PreviewPress {
  type: 'helix-preview-press'
}

/** How tall the frame says its content is, in CSS pixels. */
export interface PreviewSize {
  size: number
  type: 'helix-preview-size'
}

export type PreviewMessage =
  | PreviewConsole
  | PreviewPress
  | PreviewReady
  | PreviewRender
  | PreviewSize

/**
 * @summary A frame that renders sandbox source in a separate document.
 *
 * @description
 * A sandboxed `<iframe>` that loads `src`, a document you provide. That
 * document imports what the examples need, listens for a render message, and
 * writes the markup into itself.
 *
 * **Examples render in a frame**, so an example's styles and scripts do not
 * affect the page around the sandbox, and `position: fixed` stays inside the
 * pane. The frame starts empty, with its own stylesheets and its own custom
 * element registry, so `src` must load the styles and components the examples
 * use.
 *
 * **The source is untrusted, and the frame keeps it isolated.** The frame uses
 * `sandbox="allow-scripts"` and never `allow-same-origin`. Together, the two
 * let a document on the same origin remove its own sandbox, which is the same
 * as having none.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Result, Output
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @event {HelixConsoleEvent} helix-console - Fired once per console call in the frame.
 * @event {HelixResizeEvent} helix-resize - Fired when the height of the frame's content changes, with the new height.
 *
 * @csspart frame - The iframe.
 */
@customElement('helix-sandbox-preview')
export class HelixSandboxPreview extends HelixElement {
  /**
   * The color mode the frame renders in.
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
   *
   * Not reflected. It is payload for the render message and nothing selects on
   * it, here or anywhere: a frame is a document of its own and what is written
   * on this host reaches nothing inside it, which is the same reason
   * `colorMode` has to be sent rather than set.
   */
  @property()
  direction?: 'rtl'

  /**
   * The frame's name, read by screen readers.
   */
  @property()
  label = 'Preview'

  /**
   * How the example is placed in the frame.
   *
   * `padded` insets it and leaves it at the top, which is the resting case and
   * what an absent value sends. `centered` gives it a measure and centers that
   * box in the frame. `hug` shrinks the example to its own content and centers
   * what is left, which is the difference that matters for a component whose
   * root is a full-width block. `fullscreen` is the whole frame with no inset.
   *
   * Not reflected, for `direction`'s reason: the placement is applied by the
   * document inside the frame, against its own root, so no rule on this side
   * could read it.
   */
  @property()
  layout?: 'padded' | 'centered' | 'fullscreen' | 'hug'

  /**
   * Markup to render.
   */
  @property()
  source = ''

  /**
   * The document the frame loads. It provides the styles and the elements.
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
    /* **A press in the frame, put back into the page as a press.**
     *
     * The frame is on an opaque origin, which is the point of it, and a
     * consequence is that a press inside is invisible outside: the event does
     * not cross the boundary, the document cannot listen to a document it may
     * not touch, and in WebKit the press moves no focus and blurs no window
     * either, so there is nothing at all to infer it from. Measured: with the
     * sandbox's settings menu open, pressing the component it configures left
     * the menu standing over it, and the only way out was Escape or the trigger.
     *
     * So the frame reports it and this element re-states it where the page can
     * hear it. A real `pointerdown` rather than a name of our own, because
     * every light-dismiss in the library (and every one a consumer wrote)
     * already listens for exactly that, and what happened *was* a press. It
     * carries no coordinates for the reason the message does not: this element
     * is where it happened, as far as the page is concerned.
     *
     * `composed` so it leaves whatever shadow root this element sits in, which
     * is how those listeners find it in the path.
     */
    if (event.data?.type === 'helix-preview-press') {
      this.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
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
