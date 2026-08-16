import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Links to the headings on this page, marking the one being read.
 *
 * @description
 * A table of contents, named for the job. Three of the obvious names are taken
 * by things that are not this: `Outline` is a CSS property and the focus ring's
 * whole vocabulary, `Contents` is `display: contents` and the `content` part
 * half this library renders, and `TableOfContents` would sit beside `Table` and
 * `TableColumn` and read as a third part of that family. `PageNav` sits beside
 * `NavBar`, which is the same job at the other scale: one navigates a site, the
 * other navigates a document.
 *
 * **The links are the consumer's own anchors**, the same as `NavBar`. A router
 * renders its own `<a>` and cannot render one inside this shadow root, and the
 * hrefs are fragments the page already knows.
 *
 * **What is current is decided by position, not by intersection.** The obvious
 * build is an `IntersectionObserver` with a thin band near the top of the
 * window, and it fails in both directions: with headings far apart nothing is
 * in the band and the marker goes out entirely, and with headings close
 * together several are and it flickers between them. So the observer is only
 * the *trigger*, and the answer is computed from where the headings actually
 * are: the current section is the last one whose top has passed the reading
 * line, or the first heading before any of them has.
 *
 * That rule is what a reader means. Two headings on screen at once are not
 * ambiguous to a person: they are reading under the upper one.
 *
 * **`aria-current="location"`, and it is written onto the consumer's anchor.**
 * This library does not normally write to light-DOM children, because an
 * attribute added after upgrade is one a server's markup never had. It is right
 * here for the reason `Carousel` names its slides: what is current is derived
 * from scroll position, so no server could have rendered it and there is
 * nothing for hydration to disagree with. `location` rather than `page`, which
 * is what `NavBar` uses: `page` means this is the page, and every one of these
 * is the same page.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Table of contents, On this page, Outline
 * @documentation https://helix.fusion.dev/components/page-nav
 *
 * @slot - The links, as anchors with fragment hrefs.
 *
 * @csspart nav - The navigation landmark.
 */
@customElement('helix-base-page-nav')
export class HelixBasePageNav extends HelixElement {
  /** Accessible name for the navigation. */
  @property()
  label = 'On this page'

  /**
   * How far below the top of the window a heading counts as reached, in pixels.
   *
   * The reading line. A page with a sticky masthead sets this to its height, or
   * a little more: without it the current section changes as a heading slides
   * under the chrome rather than as it reaches the top of what can be seen.
   */
  @property({ type: Number })
  offset = 0

  /** The id of the section being read, or empty before anything is measured. */
  @property({ attribute: false })
  current = ''

  private observer: IntersectionObserver | undefined

  /** The links, in document order. Empty on the server, which has no tree. */
  private get links(): HTMLAnchorElement[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot')
    return (slot?.assignedElements({ flatten: true }) ?? []).filter(
      (element): element is HTMLAnchorElement =>
        element instanceof HTMLAnchorElement &&
        element.getAttribute('href')?.startsWith('#') === true,
    )
  }

  /** What each link points at, paired with the link, skipping anything missing. */
  private get sections(): { link: HTMLAnchorElement; target: Element }[] {
    const root = this.getRootNode() as Document | ShadowRoot
    return this.links.flatMap((link) => {
      const id = decodeURIComponent(link.getAttribute('href')?.slice(1) ?? '')
      const target = id ? root.getElementById?.(id) : null
      return target ? [{ link, target }] : []
    })
  }

  /**
   * Works out which section is being read, and marks its link.
   *
   * Positional rather than a reading of what intersects, for the reason above.
   * The comparison is against `offset` and not zero, so the reading line is
   * wherever the page says the top of the readable area is.
   */
  private mark(): void {
    const sections = this.sections
    if (sections.length === 0) {
      return
    }
    const passed = sections.filter(
      ({ target }) => target.getBoundingClientRect().top - this.offset <= 1,
    )
    const active = passed.at(-1) ?? sections[0]
    for (const { link, target } of sections) {
      if (target === active?.target) {
        link.setAttribute('aria-current', 'location')
      } else {
        link.removeAttribute('aria-current')
      }
    }
    this.current = active?.target.id ?? ''
  }

  /**
   * Watches every section, and re-marks whenever any of them crosses anything.
   *
   * The thresholds are what make the trigger frequent enough: an observer fires
   * on entering and leaving, and a long section scrolled slowly crosses neither
   * for a long time. Asking for a callback at each quarter of visibility is
   * cheap and keeps the marker honest without a scroll listener.
   */
  private watch(): void {
    this.observer?.disconnect()
    if (this.sections.length === 0) {
      return
    }
    this.observer = new IntersectionObserver(() => this.mark(), {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    })
    for (const { target } of this.sections) {
      this.observer.observe(target)
    }
    this.mark()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer?.disconnect()
    this.observer = undefined
  }

  protected override firstUpdated(): void {
    this.watch()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* The reading line moved, so where the reader is may have changed without
       the page having moved at all. Nothing else would notice: the observer
       fires on sections crossing the viewport, and this changes what crossing
       means rather than whether anything did. */
    if (changed.has('offset')) {
      this.mark()
    }
  }

  protected override render(): TemplateResult {
    return html`<nav part="nav" aria-label=${this.label}>
      <slot @slotchange=${() => this.watch()}></slot>
    </nav>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-page-nav': HelixBasePageNav
  }
}
