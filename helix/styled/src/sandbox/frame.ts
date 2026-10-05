import type { PreviewMessage, PreviewRender } from './preview/sandbox-preview.js'

/** How `servePreview` serves a frame document. */
export interface ServePreviewOptions {
  /**
   * The element each example is written into. Defaults to `#preview-root`,
   * and to the body where there is none.
   */
  root?: HTMLElement

  /**
   * Whether the frame adds the rules for the four `layout` values, `padded`,
   * `centered`, `hug` and `fullscreen`, to its own head. Defaults to `true`.
   * Set `false` where your frame's stylesheet places the root itself.
   */
  layouts?: boolean

  /** Called before new markup replaces the old, to take down what it mounted. */
  onReplace?: (root: HTMLElement) => void

  /** Called after each render, with whether the markup was new or only restyled. */
  onRender?: (root: HTMLElement, fresh: boolean) => void
}

/**
 * The rules that place the root for each `layout` a preview sends.
 *
 * `centered` gives the example a measure and centers that box, and `hug`
 * shrinks each top-level child to its own content and centers it, which is
 * the difference for a component whose root is a full-width block. They
 * select the root by its `data-preview-root` attribute, so they reach nothing
 * an example draws inside it.
 */
export const LAYOUT_RULES = `
:root { --preview-measure: 48rem; }
[data-preview-root][data-layout="padded"] { padding: var(--helix-space-lg, 1.5rem); }
[data-preview-root][data-layout="centered"], [data-preview-root][data-layout="hug"] {
  align-content: center; display: block; inline-size: min(100%, var(--preview-measure));
  margin-inline: auto; min-block-size: 100dvh; padding: var(--helix-space-lg, 1.5rem);
}
[data-preview-root][data-layout="centered"] { text-align: center; }
[data-preview-root][data-layout="centered"] > * { margin-inline: auto; text-align: start; }
[data-preview-root][data-layout="hug"] > * {
  inline-size: fit-content; margin-inline: auto; max-inline-size: 100%;
}
[data-preview-root][data-layout="fullscreen"] { min-block-size: 100dvh; padding: 0; }
`

/** Whether `data` is a render message, as the preview sends one. */
export const isRender = (data: unknown): data is PreviewRender =>
  typeof data === 'object' &&
  data !== null &&
  (data as { type?: unknown }).type === 'helix-preview-render'

/**
 * The markup an example renders, without the stylesheet links it carries.
 *
 * An example that needs CSS says so the way a consumer would, with a `<link>`
 * beside it, and the stylesheet arrives in the render message already read.
 * The frame is on an opaque origin, so a request for the link would fail and
 * log an error into the reader's console on every render.
 */
export const withoutStylesheets = (source: string): string =>
  source.replace(/<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>\s*/gi, '')

/** A logged value as text, without throwing on a cycle. */
export const loggedText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Runs the `<script>` elements in a rendered example, each as a module.
 *
 * `innerHTML` parses a script and never runs it, and a fresh element is the
 * only way to: a parsed one is marked as started. A module has a scope of its
 * own, so a second render of the same example does not throw on a `const` the
 * first one declared. A script that names its own `type` keeps it.
 */
const runScripts = (root: HTMLElement): void => {
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

/**
 * The boxes one top-level child draws. A `display: contents` element draws
 * none of its own, so its descendants are asked, leaving out a `fixed` one,
 * which the viewport sizes and which would otherwise chase the frame's height.
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
 * Serves the frame side of a sandbox preview, in the document its `src` loads.
 *
 * Call it once from that document, after the elements your examples use are
 * defined. It does what the preview's protocol asks of a frame:
 *
 * - Posts `helix-preview-ready` once it listens.
 * - Writes each `helix-preview-render` into the root: the markup, the
 *   stylesheet, the direction, the layout and the color mode. Scripts in the
 *   markup run.
 * - Posts every console call and uncaught error as `helix-preview-console`.
 * - Posts `helix-preview-size` whenever what was drawn changes height.
 * - Posts `helix-preview-press` on every press, so menus outside close.
 *
 * Only a message from the parent window is rendered. Answers go to `*`, which
 * is the only target a sandboxed frame can name, and carry only what the
 * example itself wrote.
 *
 * @returns A function that stops serving and puts the console back.
 */
export const servePreview = (options: ServePreviewOptions = {}): (() => void) => {
  const root = options.root ?? document.getElementById('preview-root') ?? document.body
  root.toggleAttribute('data-preview-root', true)
  root.dataset.layout ??= 'padded'

  if (options.layouts !== false) {
    const rules = document.createElement('style')
    rules.textContent = LAYOUT_RULES
    document.head.prepend(rules)
  }

  const post = (message: PreviewMessage): void => window.parent?.postMessage(message, '*')

  const levels = ['log', 'info', 'warn', 'error'] as const
  const originals = levels.map((level) => console[level])
  for (const level of levels) {
    const original = console[level]
    console[level] = (...args: unknown[]) => {
      original(...args)
      post({ level, text: args.map(loggedText).join(' '), type: 'helix-preview-console' })
    }
  }

  const failed = (event: ErrorEvent): void => {
    post({ level: 'error', text: event.message, type: 'helix-preview-console' })
  }

  /* The children's own extent, top of the highest to bottom of the lowest,
     with the root's padding: what was drawn, in either direction. */
  const measure = (): void => {
    const boxes = [...root.children].flatMap(drawn)
    if (boxes.length === 0) {
      return
    }
    const top = Math.min(...boxes.map((box) => box.top))
    const bottom = Math.max(...boxes.map((box) => box.bottom))
    const style = getComputedStyle(root)
    const padding =
      (Number.parseFloat(style.paddingBlockStart) || 0) +
      (Number.parseFloat(style.paddingBlockEnd) || 0)
    post({ size: Math.ceil(bottom - top + padding), type: 'helix-preview-size' })
  }

  let rendered: string | undefined
  const render = (event: MessageEvent): void => {
    if (!isRender(event.data) || event.source !== window.parent) {
      return
    }
    const { colorMode, direction = 'ltr', layout = 'padded', source = '', styles = '' } = event.data
    document.documentElement.dir = direction
    root.dataset.layout = layout
    if (colorMode) {
      document.documentElement.dataset.colorMode = colorMode
      document.documentElement.style.colorScheme = colorMode
    }
    const fresh = source !== rendered
    if (fresh) {
      options.onReplace?.(root)
      root.innerHTML = withoutStylesheets(source)
      runScripts(root)
      rendered = source
    }
    let sheet = document.getElementById('preview-styles')
    if (!sheet) {
      sheet = document.createElement('style')
      sheet.id = 'preview-styles'
      document.head.append(sheet)
    }
    sheet.textContent = styles
    options.onRender?.(root, fresh)
    measure()
  }

  const press = (): void => post({ type: 'helix-preview-press' })
  const watcher = new ResizeObserver(measure)
  watcher.observe(root)
  window.addEventListener('error', failed)
  window.addEventListener('message', render)
  document.addEventListener('pointerdown', press, { capture: true, passive: true })
  post({ type: 'helix-preview-ready' })

  return () => {
    levels.forEach((level, index) => {
      console[level] = originals[index] as (typeof console)[typeof level]
    })
    watcher.disconnect()
    window.removeEventListener('error', failed)
    window.removeEventListener('message', render)
    document.removeEventListener('pointerdown', press, { capture: true })
  }
}
