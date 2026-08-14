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
  host.innerHTML = source

  let sheet = document.getElementById('preview-styles')
  if (!sheet) {
    sheet = document.createElement('style')
    sheet.id = 'preview-styles'
    document.head.append(sheet)
  }
  sheet.textContent = styles
})

post({ type: 'helix-preview-ready' })

/** Stringifies a logged value without throwing on a cycle. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
