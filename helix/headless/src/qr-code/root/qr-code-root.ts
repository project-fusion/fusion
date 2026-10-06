import {
  customElement,
  HelixElement,
  reportRuntime,
  rgbOf,
  slotFilled,
} from '@fusion.dev/helix-core'
import {
  html,
  nothing,
  type PropertyValues,
  type SVGTemplateResult,
  svg,
  type TemplateResult,
} from 'lit'
import { property } from 'lit/decorators.js'
import { encode } from 'uqr'
import { boxIn, logoBox, type QrLogo, qrSvg } from '../export.js'
import { qrName } from '../name.js'

/** How much of the code can be lost and still read. */
export type QrCorrection = 'H' | 'L' | 'M' | 'Q'

/** How the modules are drawn. */
export type QrStyle = 'dots' | 'rounded' | 'square'

/** The quiet zone in modules, which the specification requires around a code. */
const QUIET = 4

/**
 * An image's pixels as a data address, where the page may read them, and its
 * address otherwise. A file drawn into a PNG loads nothing from outside
 * itself, so only the pixels reach a PNG; the address still reaches an SVG.
 */
const pixelsOf = (image: HTMLImageElement): string => {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    canvas.getContext('2d')?.drawImage(image, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return image.currentSrc || image.src
  }
}

/** Whether a module is one of the three finder squares, or their separators. */
const isFinder = (x: number, y: number, size: number): boolean => {
  const near = (a: number, b: number): boolean => a < 8 && b < 8
  return near(x, y) || near(size - 1 - x, y) || near(x, size - 1 - y)
}

/**
 * The dark modules of a matrix, as one path.
 *
 * One `<path>` rather than a rect per module. A modest code is 33 by 33, so a
 * rect apiece is a thousand elements the browser lays out and the accessibility
 * tree walks, and every one of them is a one-unit square.
 *
 * **`square` joins runs and the other styles cannot.** A row of eight square
 * modules is one `h8`; a row of eight *rounded* ones is eight shapes, because
 * the corners are what is being drawn and a joined run has none in the middle.
 *
 * `only` splits the drawing in two without walking the matrix twice: the finder
 * squares are structural, at three known corners, so a caller can ask for them
 * alone and get a second path to paint differently.
 */
const pathFor = (
  matrix: readonly (readonly boolean[])[],
  style: QrStyle,
  only: 'all' | 'body' | 'finders' = 'all',
): string => {
  const size = matrix.length
  const wanted = (x: number, y: number): boolean => {
    if (!matrix[y]?.[x]) {
      return false
    }
    if (only === 'all') {
      return true
    }
    return only === 'finders' ? isFinder(x, y, size) : !isFinder(x, y, size)
  }

  const parts: string[] = []
  if (style === 'square') {
    for (let y = 0; y < size; y += 1) {
      let run = 0
      for (let x = 0; x <= size; x += 1) {
        if (wanted(x, y)) {
          run += 1
          continue
        }
        if (run > 0) {
          parts.push(`M${x - run} ${y}h${run}v1h-${run}z`)
          run = 0
        }
      }
    }
    return parts.join('')
  }

  /* A circle for `dots` and a squircle for `rounded`, both drawn as arcs on a
     one-unit square. The radius is a little under half so neighboring dots do
     not touch, which is what makes a dotted code read as dots rather than as a
     square one with soft edges. */
  const r = style === 'dots' ? 0.45 : 0.28
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!wanted(x, y)) {
        continue
      }
      if (style === 'dots') {
        parts.push(
          `M${x + 0.5 - r} ${y + 0.5}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`,
        )
      } else {
        parts.push(
          `M${x + r} ${y}h${1 - r * 2}a${r} ${r} 0 0 1 ${r} ${r}` +
            `v${1 - r * 2}a${r} ${r} 0 0 1 ${-r} ${r}` +
            `h${-(1 - r * 2)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
            `v${-(1 - r * 2)}a${r} ${r} 0 0 1 ${r} ${-r}z`,
        )
      }
    }
  }
  return parts.join('')
}

/**
 * @summary A scannable QR code for a short piece of text.
 *
 * @description
 * The code is drawn as one `<path>`. Runs of adjacent dark modules are joined,
 * so a row of eight is one horizontal move. A code of useful length has about a
 * thousand modules, and an element for each would be a thousand nodes for one
 * image.
 *
 * The element has `role="img"` and an accessible name. Set `label` to what
 * the code is for, such as "Open the menu". With no `label`, a code is named
 * by `code-label`, "QR code", followed by its value where the value is a web
 * address, which a URL read aloud makes a destination. Any other value is
 * never read out: a code that sets up an authenticator or joins a network
 * carries a secret in it.
 *
 * The quiet zone of four modules is required by the specification, and a
 * scanner rejects a code cropped to its edge. It is drawn inside the `viewBox`,
 * so it stays at any size, including a size set in CSS.
 *
 * `correction` sets how much of the code can be lost. At `H` a code can lose
 * thirty percent and still scan, so a mark in the center slot is safe. At `L`
 * the same mark makes the code unscannable. The default is `M`, and `H` when the
 * `logo` slot is filled. A code that holds a logo at a `correction` below `H`
 * warns once with the kind `unscannable-logo`.
 *
 * A higher level holds fewer characters, so a value that fits at `M` can be too
 * long once a logo raises the level to `H`. A value too long for the level
 * draws no code: the element fires `error`, carries `:state(overflow)`, and
 * shows what is in the `fallback` slot, such as the link written out.
 *
 * `toSvg()`, `toPng()` and `download()` give the drawn code as a file of its
 * own, in the colors it is drawn in, with a slotted image or SVG logo where
 * it sits, for a page that offers it to save or print, as Zag's download
 * trigger does. `download()` saves an SVG for a name ending in `.svg`, and a
 * PNG for any other.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases QR, Barcode, Scan code
 * @documentation https://fusion.dev/helix/components/qr-code
 *
 * @slot fallback - Shown in place of the code when the value is too long for it, such as the link as text.
 * @slot logo - A logo for the center. A code with a logo scans only at a high correction level.
 *
 * @event {Event} error - The value is too long for a code at the correction level, so no code is drawn.
 *
 * @csspart code - The square code image.
 * @csspart fallback - The box around the `fallback` slot, drawn only when the value is too long for a code.
 * @csspart finders - The three corner squares, which can take their own color.
 * @csspart logo - The box that holds the center logo.
 * @csspart modules - Every module except the three corner squares.
 *
 * @cssstate overflow - The value is too long for a code at the correction level, so the fallback shows.
 */
@customElement('helix-headless-qr-code')
export class HelixHeadlessQrCode extends HelixElement {
  /**
   * The words a code with no `label` is named by, followed by its value where
   * the value is a web address.
   */
  @property({ attribute: 'code-label' })
  codeLabel = 'QR code'

  /**
   * The error correction level, which sets how much of the code can be lost
   * and still scan.
   *
   * `M` by default, which is the level almost every code in the world uses and
   * costs about fifteen percent redundancy. `H` where a mark covers the center,
   * chosen automatically when the slot is filled: it is the level that makes
   * covering safe, and a consumer who fills the slot has said what they want
   * without having to know that.
   */
  @property({ attribute: 'correction' })
  correction?: QrCorrection

  /**
   * The image's accessible name: what the code is for, such as "Open the
   * menu".
   *
   * Absent names it by `code-label` and, for a web address, the address,
   * which is what a reader who cannot scan it needs. Any other value is left
   * out of the name, since it may hold a secret, such as an authenticator's
   * key or a network's password.
   */
  @property()
  label = ''

  /**
   * How the modules are drawn.
   *
   * `square` is the resting state and is written by not writing it, per the
   * rule that a reflected property takes no default. It is also the only one
   * that joins runs of adjacent modules into a single subpath, which is what
   * keeps a thousand modules to a handful of nodes. `rounded` and `dots` draw
   * each module on its own, because the corners are the thing being drawn and a
   * joined run has none in the middle. That cost is paid only by a code that
   * asks for them.
   *
   * A scanner reads contrast between cells, not their shape, so all three
   * scan. `dots` sits a little under half a module so neighbors do not touch,
   * which is what makes it read as dots rather than as a softened square code.
   */
  @property({ reflect: true })
  shape?: QrStyle

  /**
   * What the code encodes, which is usually a URL.
   */
  @property()
  value = ''

  /** Whether anything is slotted into the middle. */
  private logo = false

  /* Read from the children before each render, so the first draws the code at
     the level a logo needs and with the logo in it. Heard from the slot alone,
     the first render drew it without and a second followed, and a hydrated code
     kept a hole-free pattern and no logo: a declarative shadow root reports its
     slots before anything listens. `slotchange` still answers a later change. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.childrenKnown) {
      this.logo = this.knownChildren.some((child) => child.slot === 'logo')
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /** The level actually used, which the slot can raise. */
  private get level(): QrCorrection {
    return this.correction ?? (this.logo ? 'H' : 'M')
  }

  /** Whether this code has warned that its logo may keep it from scanning. */
  private toldLogo = false

  /**
   * Warns once when a logo covers a code whose level was set below `H`, where
   * the cover can take more than the level can lose. A level the code chose
   * itself is `H` already.
   */
  private auditLogo(): void {
    if (this.toldLogo || !this.logo || (this.correction ?? 'H') === 'H') {
      return
    }
    this.toldLogo = true
    reportRuntime({
      kind: 'unscannable-logo',
      message: `<${this.localName}> holds a logo at correction "${this.correction}", which may keep it from scanning. Set \`correction\` to "H", or leave it unset.`,
      tag: this.localName,
    })
  }

  /** The value and level that did not fit, so `error` fires once for each. */
  private overflowed = ''

  /**
   * The code for the value at the level, or undefined where the value is too
   * long for it.
   *
   * `encode` throws for a value past the level's capacity, and it threw inside
   * the render: the update rejected and the last code stayed on screen. A
   * logo raising the level to `H` was the easy way to get there, since `H`
   * holds the fewest characters.
   */
  private encoded(): ReturnType<typeof encode> | undefined {
    try {
      return encode(this.value, { border: 0, ecc: this.level })
    } catch (error) {
      if (error instanceof RangeError) {
        return undefined
      }
      throw error
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Told once per value and level, after the render that drew nothing, as an
       image says it failed. Not on a server, which runs no `updated`. */
    this.auditLogo()
    const key = `${this.level}:${this.value}`
    const overflow = this.value !== '' && this.encoded() === undefined
    this.toggleState('overflow', overflow)
    if (overflow) {
      if (this.overflowed !== key) {
        this.overflowed = key
        this.dispatchEvent(
          new Event('error', { bubbles: false, cancelable: false, composed: false }),
        )
      }
    } else {
      this.overflowed = ''
    }
  }

  /**
   * The code as an SVG file of its own, `size` pixels square, in the colors it
   * is drawn in, with its background under the quiet zone.
   *
   * `''` where no code is drawn, before the first render or for a value too
   * long for the level. A slotted `<img>` or `<svg>` logo is written in where
   * it is drawn: an image as its address, or as its pixels where the page may
   * read them, which a PNG needs. A logo of text is left out, a file having
   * none of the page's fonts; the code still scans without it.
   */
  toSvg(size = 512): string {
    const code = this.renderRoot?.querySelector('svg[part="code"]')
    const modules = code?.querySelector('[part="modules"]')
    const finders = code?.querySelector('[part="finders"]')
    if (!code || !modules || !finders) {
      return ''
    }
    /* A transparent ground is no ground for a scanner, so a code drawn over
       nothing of its own is saved on white. */
    const ground = getComputedStyle(this).backgroundColor
    const clear = ground === '' || ground === 'transparent' || /^rgba\(.*,\s*0\)$/.test(ground)
    const background = clear ? '#ffffff' : rgbOf(ground)
    const box = Number(code.getAttribute('viewBox')?.split(' ')[2] ?? 0)
    const logo = this.logoDrawing(code, box, background)
    return qrSvg(
      {
        background,
        box,
        finderColor: rgbOf(getComputedStyle(finders).fill || '#000000'),
        finders: finders.getAttribute('d') ?? '',
        moduleColor: rgbOf(getComputedStyle(modules).fill || '#000000'),
        modules: modules.getAttribute('d') ?? '',
        quiet: QUIET,
        ...(logo ? { logo } : {}),
      },
      size,
    )
  }

  /**
   * The slotted logo as the file draws it, measured against the drawn code, or
   * nothing where none is slotted, where it is not over the code (the headless
   * tier sets it beside it), or where it is neither an image nor an SVG.
   */
  private logoDrawing(code: Element, box: number, background: string): QrLogo | undefined {
    const holder = this.renderRoot.querySelector<HTMLElement>('[part="logo"]')
    const mark = this.knownChildren.find((child) => child.slot === 'logo')
    const area = code.getBoundingClientRect()
    if (!holder || holder.hidden || !mark || area.width === 0) {
      return undefined
    }
    const frame = logoBox(holder.getBoundingClientRect(), area, box)
    if (!frame) {
      return undefined
    }
    const fill = getComputedStyle(holder).backgroundColor
    const ground = fill === '' || fill === 'transparent' || /^rgba\(.*,\s*0\)$/.test(fill)
    const logo = {
      frame,
      ground: ground ? background : rgbOf(fill),
      mark: boxIn(mark.getBoundingClientRect(), area, box),
    }
    if (mark instanceof HTMLImageElement) {
      return { ...logo, href: pixelsOf(mark) }
    }
    if (mark instanceof SVGSVGElement) {
      return { ...logo, svg: new XMLSerializer().serializeToString(mark) }
    }
    return undefined
  }

  /**
   * The code as a PNG, `size` pixels square, drawn from `toSvg()`.
   *
   * `null` where no code is drawn.
   */
  async toPng(size = 512): Promise<Blob | null> {
    const markup = this.toSvg(size)
    if (markup === '') {
      return null
    }
    const image = new Image()
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.getContext('2d')?.drawImage(image, 0, 0, size, size)
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  /**
   * Saves the code as a file named `filename`, `size` pixels square: an SVG
   * where the name ends in `.svg`, and a PNG otherwise.
   *
   * Call it from a press, since a browser lets a page start a download only
   * in answer to one. Does nothing where no code is drawn.
   */
  async download(filename = 'qr-code.png', size = 512): Promise<void> {
    const svg = /\.svg$/i.test(filename) ? this.toSvg(size) : ''
    const file = svg ? new Blob([svg], { type: 'image/svg+xml' }) : await this.toPng(size)
    if (!file) {
      return
    }
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    /* Later, so the download has the address before it is let go. */
    setTimeout(() => URL.revokeObjectURL(url))
  }

  private renderCode(
    result: ReturnType<typeof encode> | undefined,
  ): SVGTemplateResult | typeof nothing {
    if (result === undefined) {
      return nothing
    }
    const size = result.size
    /* The quiet zone, in the `viewBox` rather than in a wrapper's padding. Four
       modules is what the specification requires and what a scanner looks for,
       so it has to scale with the code and not with whatever box the component
       was given. */
    const quiet = QUIET
    const box = size + quiet * 2
    /* The three corner squares as their own path, so they can take their own
       color. Their positions are structural rather than guessed: seven by
       seven at each of three corners, plus the separator ring, which is what
       `isFinder` describes. Drawn square whatever the body's style is, because
       they are what a scanner locks onto first and rounding them costs
       reliability for decoration. */
    const finders = pathFor(result.data, 'square', 'finders')
    return svg`<svg
      part="code"
      viewBox="0 0 ${box} ${box}"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label=${qrName(this.label, this.value, this.codeLabel)}
      shape-rendering="crispEdges"
    >
      <path
        part="modules"
        d=${pathFor(result.data, this.shape ?? 'square', 'body')}
        transform="translate(${quiet} ${quiet})"
        fill="currentColor"
      />
      <path
        part="finders"
        d=${finders}
        transform="translate(${quiet} ${quiet})"
        fill="currentColor"
      />
    </svg>`
  }

  protected override render(): TemplateResult {
    /* Regenerated on every render rather than cached. It is a pure function of
       two properties, Lit only renders when one of them moved, and a cache here
       would be a second place for them to disagree. */
    const result = this.value === '' ? undefined : this.encoded()
    /* The fallback only for a value too long for a code, so a code that fits
       renders what it always did. Decided on a server too, which encodes. */
    const overflow = this.value !== '' && result === undefined
    return html`${this.renderCode(result)}${
      overflow ? html`<span part="fallback"><slot name="fallback"></slot></span>` : nothing
    }
    <span ?hidden=${!this.logo} part="logo">
      <slot
        name="logo"
        @slotchange=${(event: Event) => {
          const next = slotFilled(event.target as HTMLSlotElement)
          if (next !== this.logo) {
            this.logo = next
            this.requestUpdate()
          }
        }}
      ></slot>
    </span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-qr-code': HelixHeadlessQrCode
  }
}
