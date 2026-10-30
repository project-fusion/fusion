import {
  browserSpeech,
  customElement,
  DelayController,
  HelixElement,
  HelixResizeEvent,
  pageSpeechEngine,
  recognizeSpeech,
  type SpeechListener,
  type SpeechSession,
  words,
} from '@fusion.dev/helix-core'
import { HelixConsoleEvent } from '../events/index.js'

/**
 * How long the source has to stop changing before the frame is asked to render,
 * in milliseconds.
 *
 * Long enough that a run of keystrokes is one render, short enough that letting
 * go of the keyboard and looking up finds the preview already there.
 */
const SETTLE = 120

/**
 * How long a frame that has been sent an example may stay `blank` before it is
 * shown anyway, in milliseconds. For a document that never says it drew, such
 * as one written before `helix-preview-rendered` existed.
 */
const PAINT_PATIENCE = 1000

import type { CSSResultGroup } from 'lit'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { COMPILED, compile } from '../compile.js'
import { defaultFrame, withScript } from '../frame.js'
import {
  isFetch,
  type PreviewFetch,
  type PreviewFetched,
  RELAY_OPEN,
  relayAddress,
  relayFetch,
  relayPrefixes,
} from '../relay.js'
import { styles as sheet } from './sandbox-preview.css.js'

/** What the frame is allowed, here and in a tab `open()` makes. */
const SANDBOX = 'allow-scripts allow-forms'

/**
 * Features the frame may use, here and in a tab `open()` makes. Clipboard
 * write and fullscreen are the preview's own controls. The microphone is
 * dictation: the frame has an opaque origin, so a field in it can ask for the
 * microphone only when this frame is granted it.
 */
const ALLOW = 'clipboard-write *; fullscreen *; microphone *'

/** A relative module specifier in an `import` or an `export ... from`. */
const RELATIVE = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.{1,2}\/[^"']+)\2/g

/**
 * A module file's source as the frame loads it, from a `data:` address. A
 * `data:` address has no folder for a relative import to start from, so each
 * relative specifier is written as the module's own address in the import
 * map, `sandbox:/` and its path.
 */
const moduleText = (path: string, source: string): string =>
  `data:text/javascript;charset=utf-8,${encodeURIComponent(
    source.replace(
      RELATIVE,
      (_, lead: string, quote: string, specifier: string) =>
        `${lead}${quote}${new URL(specifier, `sandbox:/${path}`).href}${quote}`,
    ),
  )}`

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
  /** Set for an error the example threw and did not catch, which marks the preview `failed`. */
  uncaught?: boolean
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

/** The frame saying it has drawn the example it was sent. */
export interface PreviewRendered {
  type: 'helix-preview-rendered'
}

/** How tall the frame says its content is, in CSS pixels. */
export interface PreviewSize {
  size: number
  type: 'helix-preview-size'
}

/**
 * The frame asking this page to listen. Its own origin is opaque, so the
 * recognizer there refuses to start.
 */
export interface PreviewSpeechStart {
  /** Which listening this is, so a late reply cannot land in the next one. */
  id: number
  /** A BCP 47 tag, such as `en-US`. */
  lang: string
  type: 'helix-speech-start'
}

/** The frame asking this page to stop the listening `id` names. */
export interface PreviewSpeechStop {
  id: number
  type: 'helix-speech-stop'
}

export type PreviewMessage =
  | PreviewConsole
  | PreviewFetch
  | PreviewPress
  | PreviewReady
  | PreviewRender
  | PreviewRendered
  | PreviewSize
  | PreviewSpeechStart
  | PreviewSpeechStop

/**
 * @summary A frame that renders sandbox source in a separate document.
 *
 * @description
 * A sandboxed `<iframe>` that loads `src`, a document you provide. That
 * document imports what the examples need, listens for a render message, and
 * writes the markup into itself.
 *
 * **Without `src`, the frame loads a built-in document**, so a sandbox renders
 * with nothing to host. It runs HTML, CSS, and scripts, and reports the
 * console, uncaught errors, its height, and presses as a frame on
 * `servePreview` does. It defines no element, so an example that uses Helix
 * components needs a `src` that imports them.
 *
 * **`imports` lets an example import packages by name** in the built-in
 * document, as an import map: each name maps to the address of an ES module,
 * such as `{"canvas-confetti": "https://esm.sh/canvas-confetti@1.9.3"}`, and
 * `import confetti from 'canvas-confetti'` in the `js` pane then loads it. A
 * CDN that serves npm packages as modules, such as esm.sh or jsDelivr's
 * `+esm`, gives every package an address. A new map loads the document again,
 * since a browser reads one only as a document starts. A `src` document
 * declares its own.
 *
 * **`dependencies` names packages by version instead**, as a `package.json`
 * does: `{"canvas-confetti": "^1.9"}` loads `canvas-confetti` and the paths
 * under it from `cdn`, `https://esm.sh/` by default, at the version or range
 * given. An address in `imports` wins over a package of the same name.
 *
 * **`modules` holds files the example imports by a relative path**: each path,
 * such as `utils.js`, to its source, and `import { add } from './utils.js'`
 * in the `js` pane or in another module loads it. A sandbox writes each pane
 * named for a module file here.
 *
 * **A module in TypeScript or JSX runs too**: a path ending in `.ts`, `.tsx`
 * or `.jsx` is compiled to JavaScript first, and imported by its path or by
 * its path without the extension. The compiler, Sucrase, loads from `cdn` the
 * first time a module needs it, so the package carries none and a preview
 * with no such module loads none. JSX compiles to the automatic runtime,
 * `react/jsx-runtime`, from `dependencies`, or to the one a
 * `@jsxImportSource` comment names. What fails to compile shows in the
 * `error` part as an error the example threw, when the example imports it.
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
 * **A preview says where it is.** It is `:state(loading)` from the moment it
 * has a `src` until that document can take the example, and again through
 * `reload()`. It is `:state(failed)` once the example throws an error it does
 * not catch, until the next source is sent, which a frame on `servePreview`
 * reports. A page draws its own spinner or message from either, such as a
 * sibling shown by `helix-sandbox-preview:state(failed) + .message`.
 *
 * **A failed preview shows the error over the example**, in the `error` part,
 * until the next source is sent. The console says it too, so the part is not
 * announced, and it is the frame's description while it shows, so a screen
 * reader reads it with the frame. Hide it with `::part(error) { display: none }`
 * where the page draws its own.
 *
 * **`relay` lets a frame on a login-protected site load its own files.** The
 * frame's opaque origin makes every request it sends cross-site, and a login
 * cookie is not sent on one, so behind a login such as a Vercel preview the
 * frame's script and stylesheet come back as the login page. With `relay` set
 * to path prefixes, such as `/sandbox/ /fonts/`, the frame can ask this
 * element for a file under them and gets the body back, fetched from this
 * page with its cookies. The page fetches only a `GET` on its own origin,
 * under those prefixes, in plain characters, following no redirect, and it
 * passes on only a script, a stylesheet, a font, a model, or an image of up
 * to 8 MB. Name only prefixes that hold files the site serves to anyone: an
 * example in the frame is untrusted, and it can ask too. Empty, the default,
 * relays nothing. A frame asks only while its own origin is opaque, so a page
 * elsewhere that frames the same document without a sandbox cannot use the
 * answer to run script on the site.
 *
 * **`controls` draws two buttons in the preview's corner**: one reloads the
 * frame's document, as `reload()` does, and one opens the example in a new
 * tab, as `open()` does. The tab runs it in a frame sandboxed as this one is.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Result, Output
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @event {HelixConsoleEvent} helix-console - Fired once per console call in the frame.
 * @event {HelixResizeEvent} helix-resize - Fired when the height of the frame's content changes, with the new height.
 *
 * @csspart controls - The buttons in the preview's corner, under `controls`.
 * @csspart error - The error the example threw and did not catch, shown over it while the preview is `failed`.
 * @csspart frame - The iframe.
 * @csspart open - The button that opens the example in a new tab, under `controls`.
 * @csspart reload - The button that reloads the frame's document, under `controls`.
 *
 * @cssstate blank - From the moment the frame's document starts loading until it has drawn an example. The styled tier keeps the frame transparent meanwhile, so a document that has not yet drawn in the page's color mode does not show as a white flash.
 * @cssstate failed - Since the example threw an error it did not catch, until the next source is sent.
 * @cssstate loading - While the frame's document loads, until it can take the example.
 */
@customElement('helix-sandbox-preview')
export class HelixSandboxPreview extends HelixElement {
  /**
   * The key this part's words are registered under, its tag:
   * `registerWords('de', { 'helix-sandbox-preview': { fallbackLabel: 'Vorschau' } })`.
   */
  static words = 'helix-sandbox-preview'

  /**
   * The address the packages in `dependencies` load from, which the name, an
   * `@` and the version follow.
   */
  @property()
  cdn = 'https://esm.sh/'

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
   * Whether the preview draws a reload button and a button that opens the
   * example in a new tab, in its corner.
   */
  @property({ reflect: true, type: Boolean })
  controls = false

  /**
   * The npm packages an example can import by name in the built-in document,
   * each name to a version or a range, as a `package.json` lists them. Each
   * loads from `cdn`. Set it as JSON in the attribute or as an object. Not
   * read where `src` is set.
   */
  @property({ type: Object })
  dependencies?: Record<string, string>

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

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Preview'

  /**
   * The packages an example can import by name in the built-in document,
   * each mapped to the address of an ES module, as an import map's `imports`.
   * Set it as JSON in the attribute or as an object. Not read where `src` is
   * set.
   */
  @property({ type: Object })
  imports?: Record<string, string>

  /**
   * The frame's name, read by screen readers.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

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
   * Module files an example imports by a relative path in the built-in
   * document, each path, such as `utils.js`, to its source. Not read where
   * `src` is set.
   */
  @property({ type: Object })
  modules?: Record<string, string>

  /**
   * The name of the button that opens the example in a new tab, under
   * `controls`.
   */
  @words
  @property({ attribute: 'open-label' })
  openLabel = 'Open preview in a new tab'

  /**
   * Path prefixes the frame may ask this page to fetch for it, separated by
   * spaces, each starting and ending with a slash, such as `/sandbox/ /fonts/`.
   * Empty relays nothing.
   */
  @property()
  relay = ''

  /**
   * The name of the button that reloads the frame's document, under
   * `controls`.
   */
  @words
  @property({ attribute: 'reload-label' })
  reloadLabel = 'Reload preview'

  /**
   * A script to run as a module after the markup, on every render of new
   * source. A sandbox writes its `js` pane here.
   */
  @property()
  script = ''

  /**
   * Markup to render.
   */
  @property()
  source = ''

  /**
   * The document the frame loads. It provides the styles and the elements.
   * Empty loads the built-in document, which defines no element.
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

  /** The recognizer running for the frame, on this page. */
  private speech: SpeechSession | undefined

  /** Which ask `speech` belongs to. */
  private speechId: number | undefined

  /** The source the frame was last sent, which it holds and does not run again. */
  private sentSource: string | undefined

  /** The source the frame held when it last reported an uncaught error. */
  private failedSource: string | undefined

  /** What the example threw and did not catch, while the preview is `failed`. */
  @state()
  private failure: string | undefined

  /** Each module file compiled to JavaScript, by its path and source. */
  private compiled = new Map<string, string>()

  /** The module files being compiled, by their path and source. */
  private readonly compiling = new Set<string>()

  /**
   * The import map the built-in document loads with: the last one with every
   * module file compiled, so a frame never loads without one an example
   * imports.
   */
  private map: Record<string, string> = {}

  /** How many files the frame has asked for that are still being fetched. */
  private relaying = 0

  /**
   * Fetches a file the frame asked for and sends it back to the window that
   * asked, or says it could not.
   *
   * The address is judged by `relayAddress` against this page's origin and the
   * prefixes in `relay`, so a request this page would not make is answered
   * with a refusal and never sent. The frame document's address is the base,
   * so a relative path means what it meant there.
   */
  private async answer(request: PreviewFetch, to: Window): Promise<void> {
    const reply = (fetched: Omit<PreviewFetched, 'id' | 'type'>): void => {
      const message: PreviewFetched = { ...fetched, id: request.id, type: 'helix-preview-fetched' }
      const transfer = fetched.body instanceof ArrayBuffer ? [fetched.body] : []
      to.postMessage(message, { targetOrigin: HelixSandboxPreview.target, transfer })
    }
    const base = new URL(this.src || '/', location.href).href
    const url = relayAddress(request.path, base, location.origin, relayPrefixes(this.relay))
    if (!url || this.relaying >= RELAY_OPEN) {
      reply({ ok: false })
      return
    }
    this.relaying += 1
    try {
      const fetched = await relayFetch(url, request.as)
      reply(fetched ? { ...fetched, ok: true } : { ok: false })
    } finally {
      this.relaying -= 1
    }
  }

  /** Says the preview failed with `text`, or, with none, that it has not. */
  private fail(text?: string): void {
    this.failure = text
    this.toggleState('failed', text !== undefined)
  }

  /** What the frame is sent as its source: the markup, and the script after it. */
  private get sending(): string {
    return withScript(this.source, this.script)
  }

  private get frame(): HTMLIFrameElement | null {
    return this.renderRoot.querySelector('iframe')
  }

  /**
   * The import map of the built-in document: each module file, by its path
   * and by the address its neighbors import it at, each package in
   * `dependencies` and the paths under it, and `imports` over all of them.
   */
  private get importMap(): Record<string, string> | undefined {
    const map: Record<string, string> = {}
    for (const [name, version] of Object.entries(this.dependencies ?? {})) {
      const address = `${this.cdn}${name}@${version}`
      map[name] = address
      map[`${name}/`] = `${address}/`
    }
    const compiled = new Map<string, string>()
    for (const [given, source] of Object.entries(this.modules ?? {})) {
      const path = given.replace(/^\.?\//, '')
      if (!COMPILED.test(path)) {
        map[`./${path}`] = map[`sandbox:/${path}`] = moduleText(path, source)
        continue
      }
      const key = `${path}\u0000${source}`
      const code = this.compiled.get(key)
      if (code === undefined) {
        this.compileModule(key, path, source)
        continue
      }
      compiled.set(key, code)
      const text = moduleText(path, code)
      const bare = path.replace(COMPILED, '')
      map[`./${path}`] = map[`sandbox:/${path}`] = text
      map[`./${bare}`] ??= map[`sandbox:/${bare}`] ??= text
    }
    /* Only what the modules hold now, so an edit does not keep every version. */
    this.compiled = compiled
    return this.compiling.size > 0 ? undefined : { ...map, ...this.imports }
  }

  /**
   * Compiles a module file, once, then draws again with it. Not on a server,
   * which loads no frame.
   */
  private compileModule(key: string, path: string, source: string): void {
    if (this.compiling.has(key) || typeof document === 'undefined') {
      return
    }
    this.compiling.add(key)
    void compile(this.cdn, path, source).then((code) => {
      this.compiling.delete(key)
      this.compiled.set(key, code)
      this.requestUpdate()
      /* A map that came out the same loads no new document, and the source
         held back while this compiled goes out now. */
      void this.updateComplete.then(() => this.send())
    })
  }

  /**
   * The frame's document has finished loading, so its listener exists, the
   * example is sent and the preview is no longer `loading`. The frame saying
   * `helix-preview-ready` lands here too.
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
    this.toggleState('loading', false)
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
   * `contentWindow` and could otherwise write lines into the console as though
   * the example had logged them.
   */
  private readonly handleMessage = (event: MessageEvent<PreviewMessage>): void => {
    if (event.source !== this.frame?.contentWindow || event.origin !== 'null') {
      return
    }
    const data = event.data
    /* The frame's origin is opaque, so a recognizer started there ends at
       once. This page listens for it. A press in the frame counts as a press
       in this page too, which is what lets this page install a language. */
    if (this.speak(event, window)) {
      return
    }
    /* Behind both checks above, so only this element's own frame, still on
       an opaque origin, can ask. */
    if (isFetch(data)) {
      void this.answer(data, event.source as Window)
      return
    }
    if (data?.type === 'helix-preview-ready') {
      this.handleFrameLoad()
      return
    }
    /* A height is measured from what was drawn, so a frame that only reports
       its height has drawn too. */
    if (data?.type === 'helix-preview-rendered' || data?.type === 'helix-preview-size') {
      this.drawn()
    }
    if (data?.type === 'helix-preview-console') {
      this.dispatchEvent(new HelixConsoleEvent({ level: data.level, text: data.text }))
      if (data.uncaught) {
        this.failedSource = this.sentSource
        this.fail(data.text)
      }
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
    if (data?.type === 'helix-preview-press') {
      this.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    }
    /* Relayed rather than acted on. What the frame measured is a fact about the
       example; how much room to give it is a decision, and it belongs to
       whatever laid this element out. A preview that resized itself would be
       deciding for the page it sits in, and the workbench and a reference page
       want opposite things from the same number. */
    if (data?.type === 'helix-preview-size') {
      this.dispatchEvent(new HelixResizeEvent({ size: data.size }))
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

  /**
   * Holds a coalesced send, so only one is ever queued, and drops it on
   * disconnect.
   *
   * **It renders nothing**, so it asks for no update when its wait starts or
   * ends. One that did sent the source at once from that update, ahead of the
   * wait, and the send at the end of the wait then cleared `failed` after the
   * error it should have reported.
   */
  private readonly settle = new DelayController(this, { renders: false })

  /** Shows a frame that was sent an example and never said it drew it. */
  private readonly patience = new DelayController(this, { renders: false })

  /** Whether the frame has drawn nothing since its document started loading. */
  private blank = false

  /** Marks the frame `blank`, or shown. */
  private setBlank(on: boolean): void {
    this.blank = on
    this.toggleState('blank', on)
  }

  /** The frame has drawn an example, so it is shown. */
  private drawn(): void {
    this.patience.cancel()
    this.setBlank(false)
  }

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
    this.settle.start(SETTLE, () => {
      /* A new example has not failed yet. **Only a new one**: the frame skips a
         source it already holds, so the example that failed is not run again,
         and clearing `failed` for it hid the failure. A frame that loads within
         the wait, as the built-in one does, has already run it and failed. */
      if (this.sending !== this.failedSource) {
        this.fail()
      }
      this.send()
    })
  }

  /** What the frame is sent: the source, its stylesheet and its settings. */
  private get message(): PreviewRender {
    return {
      ...(this.colorMode ? { colorMode: this.colorMode } : {}),
      direction: this.direction ?? 'ltr',
      layout: this.layout ?? 'padded',
      source: this.sending,
      styles: this.styles,
      type: 'helix-preview-render',
    }
  }

  /**
   * Sends the current source to the frame, once it is listening and no
   * module it may import is still compiling.
   */
  private send(): void {
    if (!this.ready || this.compiling.size > 0) {
      return
    }
    this.frame?.contentWindow?.postMessage(this.message, HelixSandboxPreview.target)
    this.sentSource = this.sending
    if (this.blank) {
      this.patience.start(PAINT_PATIENCE, () => this.drawn())
    }
  }

  /**
   * Opens the example in a new tab, and returns the tab's window, or `null`
   * where the browser refused to open one.
   *
   * **The tab runs the example as this preview does**: in a frame that fills
   * it, with this frame's `sandbox` and `allow`, loading `src` or the built-in
   * document, and sent the example once it loads. The example stays on an
   * opaque origin, and the tab's `opener` is cleared, so it cannot reach this
   * page. The tab shows the example as it was when it opened, and edits after
   * that do not reach it. A short inline script in the tab sends the example,
   * so on a page whose Content Security Policy refuses inline scripts the tab
   * opens empty, as the built-in document does there. Dictation in the tab
   * listens through the tab's own recognizer, asked from this page.
   */
  open(): Window | null {
    const tab = window.open('', '_blank')
    if (!tab) {
      return null
    }
    tab.opener = null
    const { body } = tab.document
    tab.document.title = this.label || this.fallbackLabel
    body.style.margin = '0'
    const frame = tab.document.createElement('iframe')
    frame.setAttribute('allow', ALLOW)
    frame.setAttribute('sandbox', SANDBOX)
    frame.title = this.label || this.fallbackLabel
    frame.style.cssText = 'block-size: 100vh; border: none; display: block; inline-size: 100vw'
    if (this.src === '') {
      frame.srcdoc = defaultFrame(this.map)
    } else {
      /* As this element's own frame resolved it, against this page, which the
         tab's blank document does not share. */
      frame.src = this.frame?.src || this.src
    }
    /* **Sent by a script of the tab's own.** A frame takes a render only from
       its parent window, and a message is from the window whose script posted
       it: posted from here it came from this page, and the frame refused it. */
    /* **The tab's frame is relayed by this page**, which still holds the tab:
       a listener added to the tab's window from here hears what its frame
       posts there, under the checks this element's own frame is held to. */
    /* Dictation is listened for the same way, with the tab's own recognizer,
       since the press that may install a language was made in the tab. */
    const relays = relayPrefixes(this.relay).length > 0
    tab.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.origin !== 'null') {
        return
      }
      if (this.speak(event, tab)) {
        return
      }
      if (relays && isFetch(event.data)) {
        void this.answer(event.data, event.source as Window)
      }
    })
    const send = tab.document.createElement('script')
    send.textContent = `const frame = document.currentScript.previousElementSibling
frame.onload = () => frame.contentWindow.postMessage(${JSON.stringify(this.message)}, '*')`
    body.append(frame, send)
    return tab
  }

  override connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('message', this.handleMessage)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('message', this.handleMessage)
    this.speech?.stop()
    this.speech = undefined
  }

  /**
   * Takes a frame's ask to start or stop listening, and returns whether the
   * message was one. `scope` is the window that holds the frame, whose
   * recognizer listens.
   */
  private speak(event: MessageEvent, scope: Window): boolean {
    const data = event.data as PreviewMessage | undefined
    if (data?.type === 'helix-speech-start') {
      this.hear(data, event.source as Window, scope, event.ports[0])
      return true
    }
    if (data?.type === 'helix-speech-stop') {
      if (this.speechId === data.id) {
        this.speech?.stop()
      }
      return true
    }
    return false
  }

  /**
   * Listens for a frame that cannot listen for itself, and sends each guess
   * back to that frame.
   *
   * **An engine this page registered listens in its place**, so a page that
   * gives its own fields another engine gives it to its examples too. The
   * browser's recognizer listens in `scope`, the window that holds the frame:
   * a tab `open()` makes holds its own. A registered engine runs in this page,
   * so it listens only for the frame this page holds.
   */
  private hear(ask: PreviewSpeechStart, source: Window, scope: Window, port?: MessagePort): void {
    this.speech?.stop()
    this.speechId = ask.id
    const tell = (
      kind: 'end' | 'error' | 'final' | 'level' | 'partial' | 'stopped',
      text?: string,
      error?: string,
      level?: number,
    ): void => {
      const message = { error, id: ask.id, kind, level, text, type: 'helix-speech-heard' }
      if (port) {
        port.postMessage(message)
      } else {
        source.postMessage(message, '*')
      }
    }
    const listener: SpeechListener = {
      end: (reason, message) => {
        tell(
          reason === 'error' ? 'error' : reason === 'stopped' ? 'stopped' : 'end',
          undefined,
          message,
        )
        if (this.speechId === ask.id) {
          this.speech = undefined
          this.speechId = undefined
        }
      },
      final: (text) => tell('final', text),
      level: (level) => tell('level', undefined, undefined, level),
      partial: (text) => tell('partial', text),
    }
    const engine = pageSpeechEngine()
    this.speech =
      engine !== browserSpeech && scope === window
        ? engine.listen({ lang: ask.lang, listener })
        : recognizeSpeech(ask.lang, listener, { scope })
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
    this.unready()
    if (this.src === '') {
      frame.srcdoc = defaultFrame(this.map)
      return
    }
    frame.src = this.src
  }

  /** The import map the built-in document was last loaded with, as JSON. */
  private loadedMap = ''

  /**
   * A new document is on its way, so nothing is sent until it listens, and
   * nothing has failed in it. The built-in document loads too.
   */
  private unready(): void {
    this.ready = false
    this.sentSource = undefined
    this.failedSource = undefined
    this.fail()
    this.patience.cancel()
    this.toggleState('loading', true)
    this.setBlank(true)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Held at the last map while a module compiles, so the frame does not load
       without it and fail on the import. */
    if (this.src === '') {
      this.map = this.importMap ?? this.map
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // A new document has to say it is listening again before anything is sent.
    /* A new import map is a new document as well, the built-in one loading
       again with it. */
    const map = this.src === '' ? JSON.stringify(this.map) : ''
    const remapped = map !== this.loadedMap
    this.loadedMap = map
    if (changed.has('src') || remapped) {
      this.unready()
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
    if (changed.has('source') || changed.has('script') || changed.has('styles')) {
      this.scheduleSend()
      return
    }
    /* Only a setting the frame is sent. A failure shown, or the controls
       drawn, is this element's own, and sending on it ran the example again. */
    if (changed.has('colorMode') || changed.has('direction') || changed.has('layout')) {
      this.send()
    }
  }

  /** The reload and open buttons, under `controls`. */
  private renderControls(): TemplateResult | typeof nothing {
    if (!this.controls) {
      return nothing
    }
    /* Read before the template, as the console reads its clear button's, so
       the words audit does not take them for text joined in code. */
    const reload = this.reloadLabel
    const open = this.openLabel
    return html`<div part="controls">
      <button part="reload" type="button" @click=${() => this.reload()}>${reload}</button>
      <button part="open" type="button" @click=${() => this.open()}>${open}</button>
    </div>`
  }

  protected override render(): TemplateResult {
    return html`<iframe
      part="frame"
      @load=${this.handleFrameLoad}
      src=${this.src || nothing}
      srcdoc=${this.src === '' ? defaultFrame(this.map) : nothing}
      title=${this.label || this.fallbackLabel}
      aria-describedby=${this.failure === undefined ? nothing : 'error'}
      allow=${ALLOW}
      sandbox=${SANDBOX}
    ></iframe>${
      this.failure === undefined
        ? nothing
        : html`<pre part="error" id="error">${this.failure}</pre>`
    }${this.renderControls()}`
  }

  static override styles: CSSResultGroup = sheet
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-preview': HelixSandboxPreview
  }
}
