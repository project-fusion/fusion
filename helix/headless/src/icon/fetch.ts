import type { HelixIcon } from '@fusion.dev/helix-icons'

/**
 * The attributes a source `<svg>` may draw its shapes with from its root, such
 * as Lucide's `fill="none" stroke="currentColor"`. The element draws its own
 * `<svg>`, so these are carried onto a group around the shapes.
 */
const PAINT = [
  'fill',
  'fill-rule',
  'stroke',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-width',
]

/** What a fetched file answered, or the wait for it, by URL. `undefined` is a file that drew nothing. */
interface Fetched {
  answers: Map<string, HelixIcon | Promise<HelixIcon | undefined> | undefined>
}

const KEY = Symbol.for('helix.icon-fetched')

/* On `globalThis`, as the registry is, so two copies of the module share one
   cache and a file is fetched once a page. */
const fetched = (): Fetched => {
  const held = globalThis as unknown as Record<symbol, Fetched | undefined>
  let found = held[KEY]
  if (!found) {
    found = { answers: new Map() }
    held[KEY] = found
  }
  return found
}

/**
 * Reads an SVG file's text as an icon, or `undefined` where it is no SVG.
 *
 * **What could run is taken out**, because the markup is drawn as it is: every
 * `<script>` and `<foreignObject>`, every `on…` attribute, every link to a
 * `javascript:` URL, and every animation that writes a link or a handler. The
 * root's paint attributes are kept on a group around the shapes, and its
 * `viewBox`, or its width and height, is the box.
 *
 * @param text The file's text.
 * @param name What the icon is known by, its URL.
 */
export const readIconFile = (text: string, name: string): HelixIcon | undefined => {
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = parsed.documentElement
  if (!root || root.localName !== 'svg' || parsed.getElementsByTagName('parsererror').length > 0) {
    return undefined
  }
  for (const unsafe of [...root.querySelectorAll('script, foreignObject')]) {
    unsafe.remove()
  }
  /* An animation can write a link or a handler after the file is read. */
  for (const animation of [...root.querySelectorAll('animate, set')]) {
    const target = (animation.getAttribute('attributeName') ?? '').toLowerCase()
    if (target.endsWith('href') || target.startsWith('on')) {
      animation.remove()
    }
  }
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      const link = attribute.localName === 'href' && /^\s*javascript:/i.test(attribute.value)
      if (attribute.localName.toLowerCase().startsWith('on') || link) {
        element.removeAttribute(attribute.name)
      }
    }
  }
  const width = Number.parseFloat(root.getAttribute('width') ?? '') || 24
  const height = Number.parseFloat(root.getAttribute('height') ?? '') || width
  const viewBox = root.getAttribute('viewBox') ?? `0 0 ${width} ${height}`
  const paint = PAINT.filter((one) => root.hasAttribute(one))
    .map((one) => `${one}="${(root.getAttribute(one) ?? '').replaceAll('"', '&quot;')}"`)
    .join(' ')
  const shapes = [...root.childNodes]
    .map((node) => (node instanceof Element ? new XMLSerializer().serializeToString(node) : ''))
    .join('')
  return { content: paint ? `<g ${paint}>${shapes}</g>` : shapes, name, viewBox }
}

/**
 * The icon in the SVG file at `src`: at once where it has been fetched, or a
 * promise of it the first time, fetched once a page however many elements ask.
 * `undefined` where the file could not be fetched or is no SVG.
 */
export const fetchIcon = (src: string): HelixIcon | Promise<HelixIcon | undefined> | undefined => {
  const held = fetched()
  if (held.answers.has(src)) {
    return held.answers.get(src)
  }
  const pending = fetch(src)
    .then((response) => (response.ok ? response.text() : undefined))
    .then((text) => (text === undefined ? undefined : readIconFile(text, src)))
    .catch(() => undefined)
  held.answers.set(src, pending)
  void pending.then((icon) => {
    if (held.answers.get(src) === pending) {
      held.answers.set(src, icon)
    }
  })
  return pending
}
