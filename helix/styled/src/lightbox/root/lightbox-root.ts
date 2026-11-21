import { customElement, deepActiveElement, reducedMotion } from '@fusion.dev/helix-core'
import { HelixHeadlessLightbox } from '@fusion.dev/helix-headless/lightbox'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './lightbox-root.css.js'

/**
 * @summary A viewer that shows one item at a time over the page.
 *
 * @description
 * A lightbox fills the viewport while it is open. A `Dialog` stops short of the
 * edges because it sits over the page. The scrim is heavier than a dialog's,
 * because the content behind it is not meant to be read.
 *
 * The host sets `color-scheme: dark`, as `Video` does. The components in the
 * chrome are yours and resolve their own tokens, so without a scheme on the
 * region they would draw page-colored text on the black background.
 *
 * When there is no input, the chrome fades out and keeps its place in the
 * layout, so the picture does not change size.
 *
 * **It opens from the thumbnail pressed.** The viewer fades in over the page,
 * and where what had focus as it opened shows a picture, the picture grows
 * from that thumbnail, so the reader sees where it came from. Opened from a
 * button of words or from code, the picture settles in from a little
 * smaller. It fades out as it closes. The
 * next item slides in from the side the reader is going, and the previous
 * one from the other. Under `prefers-reduced-motion` each change is at once.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Photo viewer, Image viewer, Gallery overlay
 * @use Pictures from a gallery opened large over the page, one at a time.
 * @instead image - A picture that stays in its place on the page.
 * @instead carousel - Slides that take turns in one place on the page.
 * @instead dialog - A task or a decision over the page.
 * @anatomy header
 * @anatomy item
 * @anatomy description
 * @practice {preview} Set `controls`, or compose the chrome in the `header` and `footer` slots with buttons that send `--previous`, `--next`, and `--close`. - Without either, the viewer has no control a pointer presses to move or to close.
 * @practice Set `max-zoom`, such as 3, where a reader needs the detail of a picture. - Without it, the shown item stays at its own size.
 * @documentation https://fusion.dev/design/components/lightbox
 *
 * @event {HelixActivateEvent} helix-activate - Fired after the shown item changes, when the element already holds the new item.
 *
 * @cssproperty --lightbox-control-size - Size of the previous, next and close controls drawn with `controls`.
 * @cssproperty --lightbox-foreground - Color of the controls and text drawn over the content.
 * @cssproperty --lightbox-gap - Space between the header or footer and the content.
 * @cssproperty --lightbox-padding - Inset from the edges of the screen.
 * @cssproperty --lightbox-scrim - The overlay color on the page behind the viewer. Set it on the host, because a `var()` inside `::backdrop` cannot resolve a token.
 */
@customElement('helix-lightbox')
export class HelixLightbox extends HelixHeadlessLightbox {
  static override styles: CSSResultGroup = [liveStyles, styles]

  /** The thumbnail the viewer is opening from, where what had focus as it opened shows one. */
  private openedFrom: DOMRect | undefined

  /** The item shown before this update, to tell which way the reader went. */
  private shownBefore: HTMLElement | undefined

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    if (!this.hasUpdated) {
      return
    }
    if (changed.has('open') && this.open) {
      this.openedFrom = this.thumbnailBox(deepActiveElement())
    }
    this.shownBefore = this.shownItem()
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    if (!this.hasUpdated || reducedMotion() || typeof document === 'undefined') {
      return
    }
    if (changed.has('open') && this.open) {
      const from = this.openedFrom
      this.openedFrom = undefined
      /* **Once the item showing has drawn itself**: it is marked current in
         this update and shows its picture in its own, a microtask later, so
         measured now the picture has no box. Still before the frame paints. */
      const item = this.shownItem() as
        | (HTMLElement & { updateComplete?: Promise<unknown> })
        | undefined
      void (item?.updateComplete ?? Promise.resolve()).then(() => this.growIn(from))
      return
    }
    const before = this.shownBefore
    const now = this.shownItem()
    if (this.open && before && now && before !== now) {
      this.slideIn(before, now)
    }
  }

  /**
   * **The thumbnail the viewer opened from**: a picture that is what had
   * focus as it opened, or inside it, or inside what holds it, found through
   * shadow roots. Its own box, not the control's. Nothing where what opened
   * the viewer shows no picture, such as a button of words, which a picture
   * growing from it would make look like its words flying to the middle.
   */
  private thumbnailBox(from: Element | null): DOMRect | undefined {
    const pictures = 'img, picture, video, canvas, helix-image'
    let at: Element | null = from
    for (let step = 0; at && at !== document.body && step < 4; step += 1) {
      if (this.contains(at)) {
        return undefined
      }
      const picture = at.matches(pictures) ? at : at.querySelector(pictures)
      const box = picture?.getBoundingClientRect()
      if (box && box.width > 0 && box.height > 0) {
        return box
      }
      at = at.parentElement ?? (at.getRootNode() as ShadowRoot).host ?? null
    }
    return undefined
  }

  /** The item showing, as the headless tier marks it. */
  private shownItem(): HTMLElement | undefined {
    return [...this.children].find(
      (one): one is HTMLElement =>
        one instanceof HTMLElement && (one as { current?: boolean }).current === true,
    )
  }

  /** What an item shows: the first thing slotted in it, or its own box. */
  private pictureOf(item: HTMLElement): HTMLElement {
    const own = item.shadowRoot?.querySelector<HTMLElement>('[part="item"]')
    const slotted = [...item.children].find(
      (one): one is HTMLElement => one instanceof HTMLElement && one.slot === '',
    )
    return slotted ?? own ?? item
  }

  /** A duration token in milliseconds, read off the host, or 0. */
  private time(name: string): number {
    const written = getComputedStyle(this).getPropertyValue(name).trim()
    const amount = Number.parseFloat(written)
    const ms = written.endsWith('ms') ? amount : amount * 1000
    return ms >= 1 ? ms : 0
  }

  /**
   * **The picture grows from what was pressed**, from that box's place and
   * size to its own, as the viewer fades in around it. With nothing to grow
   * from, it settles in from a little smaller.
   */
  private growIn(thumbnail: DOMRect | undefined): void {
    const item = this.shownItem()
    const duration = this.time('--helix-duration-slow') || this.time('--helix-duration-normal')
    if (!item || duration === 0) {
      return
    }
    /* **The picture, or the box it shows in where the picture has no box
       yet**, as an image still loading has none. Only the picture grows from
       a thumbnail: the viewport holds the caption too, which would fly from
       the thumbnail with it, so it settles in from a little smaller. */
    const own = this.pictureOf(item)
    const sized = (one: Element | null | undefined): one is HTMLElement => {
      const rect = one?.getBoundingClientRect()
      return one instanceof HTMLElement && rect !== undefined && rect.width > 0 && rect.height > 0
    }
    const viewport = this.renderRoot.querySelector<HTMLElement>('[part="viewport"]')
    const picture = sized(own) ? own : sized(viewport) ? viewport : undefined
    if (!picture || typeof picture.animate !== 'function') {
      return
    }
    const from = picture === own ? thumbnail : undefined
    const to = picture.getBoundingClientRect()
    const easing =
      getComputedStyle(this).getPropertyValue('--helix-easing-emphasized').trim() || 'ease-out'
    const start = from
      ? `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${
          from.top + from.height / 2 - (to.top + to.height / 2)
        }px) scale(${Math.min(from.width / to.width, from.height / to.height)})`
      : 'scale(0.94)'
    picture.animate([{ transform: start }, { transform: 'none' }], { duration, easing })
  }

  /**
   * **The next item slides in from the end the reader is going toward**, and
   * the previous one from the start, fading in on the way. Which way is the
   * order of the two in the set, so a set that loops from its last item to
   * its first still reads as going on.
   */
  private slideIn(before: HTMLElement, now: HTMLElement): void {
    const items = [...this.children].filter((one) => one.localName === now.localName)
    const was = items.indexOf(before)
    const is = items.indexOf(now)
    if (was === -1 || is === -1) {
      return
    }
    const onward =
      is === (was + 1) % items.length || (is > was && !(was === 0 && is === items.length - 1))
    const duration = this.time('--helix-duration-normal')
    const picture = this.pictureOf(now)
    if (duration === 0 || typeof picture.animate !== 'function') {
      return
    }
    const style = getComputedStyle(this)
    const travel = style.getPropertyValue('--helix-space-xl').trim() || '2rem'
    const sign = (onward ? 1 : -1) * (style.direction === 'rtl' ? -1 : 1)
    picture.animate(
      [
        { opacity: 0, transform: `translateX(calc(${travel} * ${sign}))` },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration,
        easing: style.getPropertyValue('--helix-easing-decelerate').trim() || 'ease-out',
      },
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-lightbox': HelixLightbox
  }
}
