import { customElement, HelixElement, hostAria, reportRuntime } from '@fusion.dev/helix-core'
import type { HelixIcon } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { resolveIcon, watchIcons } from '../registry.js'
import { afterPageSettles } from '../settle.js'

/**
 * @summary A named icon from the Helix set.
 *
 * @description
 * The icons are Phosphor, drawn on a 256 box at stroke-width 16. Each glyph
 * renders its full inner markup, because most icons are several elements, each
 * with its own stroke and fill.
 *
 * The markup is generated at build time from SVG files in this repository and
 * never comes from user input, so rendering it with `unsafeSVG` is safe.
 *
 * The `<svg>` carries `fill="currentColor"`. The generator keeps only the inner
 * markup, and Phosphor sets its fill on the root tag that the generator
 * discards. Without it, the 65 solid glyphs fall back to black and disappear on
 * a dark background. Shapes that set their own `fill` or `stroke` are
 * unaffected.
 *
 * **A name is looked up in a registry.** The family's entry registers the
 * whole set, so any name in it draws. The element's own entry,
 * `@fusion.dev/helix-headless/icon/root`, registers none: a page that imports
 * it and calls `registerIcons` with the glyphs it names ships those and no
 * others. `registerIconLibrary` resolves names under a prefix of your own,
 * such as `lucide:camera`, at once or later, and the element fires `load` when
 * a glyph that came later is drawn. A glyph registered after the element
 * rendered is drawn then.
 *
 * A name with no match renders nothing, and the element fires `error`, so a
 * typo in a name can be heard. It waits until the page has loaded and painted
 * first, so a library a later module registers is not taken for a typo.
 *
 * An icon is decorative by default and hidden from assistive technology. Set
 * `label` only when the icon is the only carrier of meaning, such as in a
 * button with no text. An `aria-label` on the element works too: the element
 * is then an image with that name.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Glyph, Symbol
 * @documentation https://fusion.dev/helix/components/icon
 *
 * @event {Event} error - `name` matches no registered icon and no library answers it, so nothing is drawn.
 * @event {Event} load - A glyph a library gave later for `name` is drawn.
 *
 * @csspart svg - The rendered SVG.
 */
@customElement('helix-headless-icon')
export class HelixHeadlessIcon extends HelixElement {
  /**
   * The icon to draw, as an object you import.
   *
   * **The scalable door, and the one this library uses internally.** An icon is
   * data, `{ content, name, viewBox }`, so a value imported by name ships one
   * glyph rather than the set, a weight is a subpath rather than an index of
   * every weight, and the supply stops being ours: anything exporting that
   * shape works, whether it is Phosphor at another weight, Lucide, or a
   * consumer's own drawings.
   *
   * **A property and not an attribute**, because an object is not a string. The
   * frameworks set properties and plain markup cannot, which is what `name` is
   * for. Set both and this wins, the value being the more specific statement.
   */
  @property({ attribute: false })
  icon?: HelixIcon

  /**
   * The icon's name, read by screen readers. Set it for an icon that is not
   * decorative.
   */
  @property()
  label = ''

  /**
   * Flips the glyph on a right-to-left page. Use it for an arrow that means
   * forward or back.
   *
   * Asked for rather than inferred from the name. The names are physical, and
   * `arrow-left` drawn pointing right on an Arabic page would be the icon
   * disagreeing with its own name for every reader who meant the left.
   */
  @property({ type: Boolean })
  mirror = false

  /**
   * The name of the icon in the Helix set.
   *
   * **A lookup, and the reason both this and `icon` exist.** A name is a string,
   * so it is what markup can carry, and resolving one means an index of the
   * whole set that no bundler can shake: 15 kB for a consumer who renders one
   * mark. An attribute is the only thing an HTML author can write, and that is
   * worth the index; a consumer who would rather not pay it imports the
   * element from `icon/root` and registers the glyphs it names, or hands over
   * the value instead.
   *
   * A name written `prefix:name` asks the library registered under that
   * prefix.
   */
  @property()
  name = ''

  /**
   * Hears an `aria-label` written on the element, which no property mirrors.
   *
   * Lit observes the attributes of its own properties only, and `ariaLabel`
   * belongs to the platform.
   */
  static override get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: super runs Lit's getter with the subclass as this, so a styled icon keeps its own attributes, where the class name would read the base's
    return [...super.observedAttributes, 'aria-label']
  }

  /**
   * Called by the browser when an observed attribute changes. A new
   * `aria-label` asks for an update, because the element takes the image role
   * while one names it.
   */
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value)
    if (name === 'aria-label') {
      this.requestUpdate()
    }
  }

  /** The name the last `error` was fired for, so it fires once per name. */
  private missed = ''

  /** The glyph this render draws, from `icon` or the registry. */
  private drawn: HelixIcon | undefined

  /** A library is still answering for `name`, so it is not missing yet. */
  private waiting = false

  /** The name whose late glyph arrived and has not been announced with `load`. */
  private arrived = ''

  /** Stops listening to the registry. */
  private unwatch: (() => void) | undefined

  /* A glyph or a library registered after this element rendered may be the
     one its name was waiting for, so it looks again. */
  override connectedCallback(): void {
    super.connectedCallback()
    this.unwatch = watchIcons(() => {
      if (this.icon === undefined && this.name !== '') {
        this.requestUpdate()
      }
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unwatch?.()
    this.unwatch = undefined
  }

  /** What the registry gives for `name` now, starting the wait for a late glyph. */
  private lookup(): HelixIcon | undefined {
    const found = this.name === '' ? undefined : resolveIcon(this.name)
    this.waiting = found instanceof Promise
    if (!(found instanceof Promise)) {
      return found
    }
    const name = this.name
    void found.then(() => {
      if (this.name === name && this.isConnected) {
        this.arrived = name
        this.requestUpdate()
      }
    })
    return undefined
  }

  /* **An `aria-label` on the element names it.** The glyph is hidden unless
     `label` is set, so an `aria-label` written on the host, the way a page
     names anything, left a generic element with a name nobody heard. The host
     takes the image role then, and its own attribute is its name. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const named = this.label === '' && (this.getAttribute?.('aria-label') ?? '') !== ''
    hostAria(this.internals, { role: named ? 'img' : '' })
    this.drawn = this.icon ?? this.lookup()
  }

  /* Said once per name, once the page has settled after the render that drew
     nothing. A server runs no `updated`, so nothing fires there. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (this.arrived === this.name && this.drawn !== undefined) {
      this.dispatchEvent(new Event('load', { bubbles: false, cancelable: false, composed: false }))
    }
    this.arrived = ''
    if (this.drawn === undefined && this.name !== '' && !this.waiting) {
      if (this.missed !== this.name && this.pending !== this.name) {
        this.pending = this.name
        afterPageSettles(() => this.reportMissing())
      }
    } else {
      this.missed = ''
    }
  }

  /** The name a report is waiting on the page to settle for, so it is asked once. */
  private pending = ''

  /**
   * Says a name drew nothing, once the page has had its chance to register
   * it: a library registered by a module further down the page, or by the
   * page's own script after this element, is not a missing glyph. Asked again
   * then, and said only where the name still draws nothing and nothing is
   * still on its way.
   */
  private reportMissing(): void {
    const name = this.pending
    this.pending = ''
    if (this.name !== name || this.drawn !== undefined || this.waiting || !this.isConnected) {
      return
    }
    this.missed = name
    this.dispatchEvent(new Event('error', { bubbles: false, cancelable: false, composed: false }))
    reportRuntime({
      kind: 'unknown-icon',
      message:
        `<${this.localName} name="${name}"> names no registered icon, so it draws ` +
        'nothing. Check the name, register the glyph with `registerIcons`, or import it ' +
        'and pass it as `icon`.',
      tag: this.localName,
    })
  }

  protected override render(): TemplateResult | typeof nothing {
    /* The registry is a `Map`, so an inherited `Object.prototype` key such as
       `constructor` resolves to nothing rather than a sized, empty
       `<svg viewBox="">`. */
    const icon = this.drawn
    if (!icon) {
      return nothing
    }

    // A labeled icon is content and needs a role to carry the label. An
    // unlabelled one is decoration sitting beside text that already says the
    // same thing, so it is removed from the accessibility tree rather than
    // announced twice.
    const labeled = this.label.length > 0
    return html`<svg
      part="svg"
      ?data-mirror=${this.mirror}
      fill="currentColor"
      viewBox=${icon.viewBox}
      role=${labeled ? 'img' : nothing}
      aria-label=${labeled ? this.label : nothing}
      aria-hidden=${labeled ? nothing : 'true'}
    >
      ${unsafeSVG(icon.content)}
    </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-icon': HelixHeadlessIcon
  }
}
