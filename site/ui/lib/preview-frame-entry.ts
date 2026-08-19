/**
 * The preview document's own script.
 *
 * Bundled to a classic script by `tooling/scripts/build-frame.mjs` and served as
 * a static file, not rendered by a route. That is a security decision, not a
 * packaging one.
 *
 * **The frame is sandboxed, so it has an opaque origin**, and from there a
 * module import or a `fetch` back to the site's origin is cross-origin and
 * fails without CORS headers. A classic `<script src>` is not CORS-checked, so
 * this is the shape that can carry the component library into a document the
 * page cannot reach into and which cannot reach back out.
 *
 * What that buys: markup typed into the sandbox runs here, and an
 * `<img onerror>` in it can no longer read the site's cookies, its
 * `localStorage`, or the editor's contents. Before this it could, measured.
 *
 * `console` is patched here rather than in the sandbox, which is the point of
 * the frame: this catches what the example itself logs, and nothing the page
 * around it does.
 */

import '@helix-io/web'

interface RenderMessage {
  direction?: 'ltr' | 'rtl'
  layout?: 'padded' | 'centered' | 'fullscreen'
  source?: string
  styles?: string
  type?: string
}

const host = document.getElementById('preview-root')

/**
 * Answered at `*`, which is the only thing an opaque origin can do.
 *
 * A sandboxed document cannot name its parent's origin as a target: there is no
 * string for "null" that `postMessage` accepts. It costs nothing here. What
 * goes out is the example's own console output, back to the page the example
 * came from, and the sandbox checks the sending window rather than the origin.
 */
const post = (message: unknown): void => window.parent?.postMessage(message, '*')

const levels = ['log', 'info', 'warn', 'error'] as const
for (const level of levels) {
  const original = console[level]
  console[level] = (...args: unknown[]) => {
    original(...args)
    post({
      level,
      text: args.map((arg) => (typeof arg === 'string' ? arg : safeStringify(arg))).join(' '),
      type: 'helix-preview-console',
    })
  }
}

window.addEventListener('error', (event) => {
  post({ level: 'error', text: event.message, type: 'helix-preview-console' })
})

window.addEventListener('message', (event: MessageEvent<RenderMessage>) => {
  // The window, not the origin. This document's parent is the sandbox and
  // nothing else can be, where the origin of a sandboxed frame's parent is not
  // something it can check against anything useful.
  if (event.data?.type !== 'helix-preview-render' || event.source !== window.parent || !host) {
    return
  }
  const { direction = 'ltr', layout = 'padded', source = '', styles = '' } = event.data
  document.documentElement.dir = direction
  host.dataset.layout = layout
  /* The stylesheet link is for the reader, and it is dropped before the markup
     is rendered.

     An example that needs CSS says so the way a consumer would, with a `<link>`
     to the file sitting beside it, because a preview that quietly applied a
     stylesheet the markup never mentions teaches the example wrong: copy it and
     nothing is styled, with nothing on screen to say why.

     The frame cannot resolve that href and should not try. It is a sandboxed
     document with an opaque origin, so a request back to the site is
     cross-origin and fails, and the file is not at that path anyway. What it
     would do is log a failed request into the terminal on every render, which
     is a console the reader is meant to trust. The stylesheet arrives in the
     same message instead, already read from disk. */
  host.innerHTML = source.replace(/<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>\s*/gi, '')
  runScripts(host)

  let sheet = document.getElementById('preview-styles')
  if (!sheet) {
    sheet = document.createElement('style')
    sheet.id = 'preview-styles'
    document.head.append(sheet)
  }
  sheet.textContent = styles
})

post({ type: 'helix-preview-ready' })

/**
 * Executes the `<script>` elements in a rendered example.
 *
 * **`innerHTML` parses a script and refuses to run it**, which is why no example
 * in the library demonstrated an event: the two ways markup can respond to one
 * are a `<script>` tag and an inline handler attribute, and measured in Chrome
 * against this exact injection, neither reached a Helix event:
 *
 * ```
 * inline custom    did not run     <helix-checkbox onhelix-toggle="…">
 * inline native    RAN             <helix-button onclick="…">
 * inline onerror   RAN             <img onerror="…">
 * script tag       did not run     <script>…</script>
 * ```
 *
 * The inline attribute is inert for a reason nothing here can change: HTML's
 * event handler content attributes are a fixed list and a custom element cannot
 * add to it, so `onhelix-toggle` is an ordinary attribute and always will be. A
 * script tag is the only route left.
 *
 * **This grants the example no capability it did not have.** Rows two and three
 * are the whole argument: an example can already run arbitrary JavaScript in
 * this document through `onclick` or `onerror`, and could already append a
 * script element from one. What `innerHTML` was providing was not a control, it
 * was an inconsistency, and the cost of it was that the legible way to write the
 * thing was the one way that did not work.
 *
 * The boundary is where it always was. This document is sandboxed with
 * `allow-scripts` and never `allow-same-origin`, so it holds an opaque origin
 * and cannot reach the site's storage, cookies, or DOM. Running a reader's code
 * is what the frame is for.
 *
 * A fresh element is required. The parser marks a script inserted by `innerHTML`
 * as already started, so re-appending the same node runs nothing; a new one
 * carrying the same attributes and text is a new script and runs. Attributes are
 * copied rather than filtered, `src` and `type` included, because a sandbox
 * should render what was typed and a cross-origin classic script was reachable
 * from an inline handler already.
 *
 * Side effects outlive a re-render, the way they do in any live preview: an
 * example that adds a listener to `document` has added it, and the next render
 * adds another. The frame reloads on a source change in development, which is
 * where that would otherwise accumulate.
 */
function runScripts(root: HTMLElement): void {
  for (const original of [...root.querySelectorAll('script')]) {
    const script = document.createElement('script')
    for (const { name, value } of original.attributes) {
      script.setAttribute(name, value)
    }
    script.text = original.text
    original.replaceWith(script)
  }
}

/** Stringifies a logged value without throwing on a cycle. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
