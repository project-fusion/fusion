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

import '@fusion.dev/helix'

interface RenderMessage {
  colorMode?: 'dark' | 'light'
  direction?: 'ltr' | 'rtl'
  layout?: 'padded' | 'centered' | 'fullscreen' | 'hug'
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
  const { colorMode, direction = 'ltr', layout = 'padded', source = '', styles = '' } = event.data
  document.documentElement.dir = direction
  host.dataset.layout = layout
  /* **Both, because they answer different questions.** `color-scheme` is what
     the platform paints form controls and scrollbars against; `data-color-mode`
     is what `light-dark()` resolves through once Lightning CSS has compiled it
     into a shim. Setting only the first leaves 37 of the 56 two-armed tokens on
     their light arm, the 24 series colors among them.

     Absent leaves both alone, so a frame nobody has told follows the reader's
     own `prefers-color-scheme`, which is what a preview of a component should
     do. A tool with a scheme control of its own says which. */
  if (colorMode) {
    document.documentElement.dataset.colorMode = colorMode
    document.documentElement.style.colorScheme = colorMode
  }
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
  measure()
})

/**
 * The boxes one top-level child actually draws.
 *
 * **A `display: contents` element generates no box of its own**, so asking it
 * for a rect answers zero and a frame sized to that answer collapses onto the
 * floor. Six styled roots are `contents` on purpose, Dialog, Drawer, Menu,
 * Popover, Tooltip and Tour, because an overlay owner should not become a box
 * in its owner's layout. Measured on the Popover example: the element reported
 * `0x0` while what it had drawn was 77 by 40, and the preview came back 180
 * because that is the floor rather than because anything was 180 tall.
 *
 * So an empty rect is a question rather than an answer, and the descendants are
 * where it is answered.
 *
 * **`fixed` is excluded, and that is what keeps this from running away.** An
 * open Drawer is `100dvh`, so counting it would make the frame taller, which
 * makes the drawer taller, which makes the frame taller: the measurement would
 * chase its own result and never settle. A viewport-anchored overlay is sized
 * by the viewport by definition, so it is not content the frame can be fitted
 * to. What the frame owes such an example is room for its trigger, which is in
 * flow and is measured.
 */
const drawn = (child: Element): DOMRect[] => {
  const own = child.getBoundingClientRect()
  if (own.width > 0 || own.height > 0) {
    return [own]
  }
  return [...child.querySelectorAll('*')]
    .filter((node) => getComputedStyle(node).position !== 'fixed')
    .map((node) => node.getBoundingClientRect())
    .filter((box) => box.width > 0 || box.height > 0)
}

/**
 * How tall what was drawn actually is, reported outward.
 *
 * **Measured from the children rather than from the document**, and that is the
 * whole difficulty. `scrollHeight` on the body answers the viewport whenever the
 * content is shorter than it, so a frame sized to that number can grow and can
 * never shrink: swap a tall example for a short one and the measurement keeps
 * reporting the height the frame already has. Taking the furthest bottom edge of
 * the host's own children answers what was drawn, at any frame size, in both
 * directions.
 *
 * **Watched rather than measured once.** A custom element is an unstyled inline
 * box until its definition arrives, so a measurement taken at the end of the
 * render handler is a measurement of markup that has not become components yet.
 * A `ResizeObserver` on the host reports again when they upgrade, when a web
 * font lands, and when an example animates something open.
 */

const measure = (): void => {
  if (!host) {
    return
  }
  const boxes = [...host.children].flatMap(drawn)
  if (boxes.length === 0) {
    return
  }
  /* **The children's own extent, not their distance from the host.** Measuring
     down from the host's top edge is right in `padded` and wrong in `centered`,
     where the host is `min-block-size: 100dvh` and the content is placed in the
     middle of it: the gap above the first child would be counted as content, so
     the number would come back as the viewport, the frame would be sized to the
     viewport, and the next measurement would agree with itself forever. Top of
     the highest to bottom of the lowest is what was drawn, wherever it was put. */
  const top = Math.min(...boxes.map((box) => box.top))
  const bottom = Math.max(...boxes.map((box) => box.bottom))
  const style = getComputedStyle(host)
  const padding =
    (Number.parseFloat(style.paddingBlockStart) || 0) +
    (Number.parseFloat(style.paddingBlockEnd) || 0)
  post({ size: Math.ceil(bottom - top + padding), type: 'helix-preview-size' })
}

if (host) {
  new ResizeObserver(measure).observe(host)
}

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
 * **Each one runs as a module, and that is not a nicety.** A classic script's
 * top-level `const` belongs to the shared script scope, so the second render
 * threw `Identifier 'terms' has already been declared` and the example stopped
 * working: the listener never attached, and a controlled checkbox with nothing
 * answering it is a checkbox that does not move. Caught in Chromium against the
 * running sandbox, not here, because it takes a second render to happen and the
 * first one looks perfect. A module has its own scope, so a re-render is a new
 * one and nothing collides.
 *
 * An explicit `type` is left alone. Only a script that named none becomes a
 * module, which is also what a consumer copying an example into a page wants.
 *
 * Side effects still outlive a re-render, the way they do in any live preview:
 * an example that adds a listener to `document` has added it, and the next
 * render adds another. Scope is what is fixed here, not lifetime.
 */
function runScripts(root: HTMLElement): void {
  for (const original of [...root.querySelectorAll('script')]) {
    const script = document.createElement('script')
    for (const { name, value } of original.attributes) {
      script.setAttribute(name, value)
    }
    if (!script.type) {
      script.type = 'module'
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
