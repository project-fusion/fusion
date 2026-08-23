import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** A color as the three channels in `0..1` that a shader or a canvas takes. */
export type TokenColor = [number, number, number]

/**
 * Reads a design token as the sRGB triple a shader or a 2D canvas can take, and
 * tells the host when the palette underneath it moves.
 *
 * **Two hops, and both are load-bearing.** A custom property's own value is the
 * unevaluated function text, so `getComputedStyle` on a probe is the only way
 * to see what it resolves to. And what it resolves to is not `rgb()`: the
 * palette derives from an `oklch()` seed, and Chrome answers `lab(100 0 0)` for
 * white. Parsing that with a regular expression for numbers reads the three
 * channels as 100, 0 and 0, which divided by 255 is a dark red.
 *
 * That is not hypothetical. It shipped, and `--helix-color-foreground` arrived
 * as a dark red that painted a warm streak down a shader for an afternoon. It
 * survived review because a warm cast on a saturated gradient is also what a
 * screenshot's chroma subsampling produces, so the picture agreed with the bug.
 *
 * The conversion is therefore the browser's own: fill a pixel and read it back.
 * That holds for `lab()`, `oklch()`, `color-mix()` and whatever a token is
 * written in next, which is the property worth having in a design system whose
 * palette is derived rather than listed.
 *
 * **A controller and not a mixin**, by this repository's own line: it adds no
 * property or method a consumer sets. It reacts to lifecycle, holding a probe
 * that has to be created after the host connects and removed when it leaves,
 * and it watches for the color mode changing so the host can repaint.
 *
 * **Client only, and that is the contract rather than a limitation.** There is
 * no computed style on a server and no canvas to convert with, so `read`
 * answers the fallback there. Every caller is drawing into a canvas, which does
 * not exist on a server either.
 */
export class TokenColorController implements ReactiveController {
  /** Where a resolved color is converted, one pixel at a time. */
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: read in three places below, and this rule's own automatic fix removed it, which failed `typecheck` immediately. The suppression has to sit under the doc comment rather than over it, being directional.
  private context: CanvasRenderingContext2D | null = null

  /** Watches the document for `data-color-mode`. */
  private modes: MutationObserver | undefined

  /** The hidden element a token is resolved against. */
  private probe: HTMLSpanElement | undefined

  /** Watches the operating system's answer, where nothing overrides it. */
  private scheme: MediaQueryList | undefined

  /**
   * @param host The element to update when the palette changes.
   * @param onChange Called when the mode moves, after the host has updated. A
   *   host that paints outside Lit's cycle needs to know, because a canvas
   *   holds its last frame and no re-render repaints it.
   */
  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly onChange?: () => void,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    /* Guarded on `document` rather than on `window`, which the server shim does
       provide. There is nothing to append a probe to without one. */
    if (typeof document === 'undefined') {
      return
    }

    this.probe = document.createElement('span')
    this.probe.style.display = 'none'
    document.body.appendChild(this.probe)

    const swatch = document.createElement('canvas')
    swatch.width = 1
    swatch.height = 1
    this.context = swatch.getContext('2d', { willReadFrequently: true })

    /* The color mode is an attribute, and the system's answer is a media query.
       Watching only the first leaves a reader on system light with the dark
       palette, which is the half that is easy to miss because a developer
       toggling the site's own control never sees it. */
    this.modes = new MutationObserver(() => this.announce())
    this.modes.observe(document.documentElement, {
      attributeFilter: ['data-color-mode'],
      attributes: true,
    })
    this.scheme = window.matchMedia('(prefers-color-scheme: light)')
    this.scheme.addEventListener('change', this.announce)
  }

  hostDisconnected(): void {
    this.modes?.disconnect()
    this.modes = undefined
    this.scheme?.removeEventListener('change', this.announce)
    this.scheme = undefined
    this.probe?.remove()
    this.probe = undefined
    this.context = null
  }

  /**
   * The token's current value, or the fallback where it cannot be resolved.
   *
   * @param token The custom property's name, including its leading dashes.
   * @param fallback What to answer on a server, or where the token is unset.
   */
  read(token: string, fallback: TokenColor): TokenColor {
    const { context, probe } = this
    if (!context || !probe) {
      return [...fallback]
    }
    probe.style.color = `var(${token})`
    /* Reset first. An unparseable value leaves `fillStyle` where it was, which
       would silently hand back the previous token's color. */
    context.fillStyle = '#000000'
    context.fillStyle = getComputedStyle(probe).color
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return [(r ?? 0) / 255, (g ?? 0) / 255, (b ?? 0) / 255]
  }

  private readonly announce = (): void => {
    this.host.requestUpdate()
    this.onChange?.()
  }
}
