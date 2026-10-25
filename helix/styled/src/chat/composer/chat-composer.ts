import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessChatComposer } from '@fusion.dev/helix-headless/chat/composer'
import { type CSSResultGroup, html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { styles as dictationStyles } from '../../shared/dictation/dictation.css.js'
import { styles } from './chat-composer.css.js'
import '../../tooltip/index.js'
import '../../voice-level/index.js'

/** Where the glow's light is on the edge, which the sweep moves along it. */
const LIGHT_X = '--_chat-composer-light-x'
const LIGHT_Y = '--_chat-composer-light-y'

/** How far the light may reach across the box: half its width, and half its height. */
const REACH_X = '--_chat-composer-reach-x'
const REACH_Y = '--_chat-composer-reach-y'

/**
 * How fast the light travels the edge, in pixels a millisecond, and the
 * shortest and longest one lap takes.
 */
const PACE = 1.2
const SHORTEST = 800
const LONGEST = 1600

/**
 * Registers the light's position, once, so the browser can animate it.
 *
 * **From script, because a sheet cannot.** An `@property` rule inside a
 * shadow root is ignored, and a gradient's position only interpolates once
 * its properties are registered as lengths. A registration is the
 * document's, so it reaches every composer's shadow root. Where the browser
 * has no `registerProperty`, or on the server, the edge still lights, without
 * the light traveling.
 */
let registered = false
function registerLight(): void {
  if (registered || typeof CSS === 'undefined' || !('registerProperty' in CSS)) {
    return
  }
  registered = true
  for (const name of [LIGHT_X, LIGHT_Y]) {
    try {
      CSS.registerProperty({ inherits: false, initialValue: '0px', name, syntax: '<length>' })
    } catch {
      // Registered already, by another copy of this module on the page.
    }
  }
}

/**
 * The keyframes of one lap of the light around a box `w` wide and `h` tall,
 * clockwise from its top-left corner, each side taking the share of the lap
 * its length is of the edge, so the light moves at one speed. None for a box
 * with no size.
 */
export function lapOf(w: number, h: number): Keyframe[] {
  const edge = 2 * (w + h)
  if (edge === 0) {
    return []
  }
  const at = (x: number, y: number, offset: number): Keyframe => ({
    [LIGHT_X]: `${x}px`,
    [LIGHT_Y]: `${y}px`,
    offset,
  })
  return [
    { ...at(0, 0, 0), opacity: 0 },
    at(w, 0, w / edge),
    at(w, h, (w + h) / edge),
    at(0, h, (2 * w + h) / edge),
    { ...at(0, 0, 1), opacity: 0 },
    // Up quickly, and down over the last stretch, so the lap fades out where
    // it began rather than stopping there.
    { offset: 0.08, opacity: 1 },
    { offset: 0.82, opacity: 1 },
  ].sort((one, two) => (one.offset ?? 0) - (two.offset ?? 0))
}

/**
 * @summary A field for writing a turn in a conversation.
 *
 * @description
 * The composer is one box. What the draft carries sits at its top, in a row
 * that wraps, inset to the line the caret starts on. The field grows with its
 * text up to a maximum height, through `field-sizing: content`. Where that is
 * not supported, the field keeps its rows and scrolls. The maximum height
 * keeps the composer from covering the transcript.
 *
 * With two `placeholders` or more, each example rolls into the next: the one
 * showing rises a little as it fades and blurs, and the next rises into its
 * place from below as it fades in, the two crossing so the field is never
 * empty. A box that changes height for the next example changes as it
 * lands. Where the browser has no CSS anchor
 * positioning, the examples fade into each other in the field's own
 * placeholder.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot attachments - What the draft carries, such as images or files, inside the box and above the field.
 * @slot end - Content under the field, beside the send button.
 * @slot start - Content under the field at the leading edge, such as an attachment button or a model picker.
 *
 * @csspart attachments - The row above the field that holds the `attachments` slot, inset to the field's text and hidden while the slot is empty.
 * @csspart example - The example drawn over the empty field while `placeholders` holds two or more, in the field's box. It is a second field that shows only its placeholder, hidden from screen readers. Style its `::placeholder` where you style the field's.
 * @csspart example-leaving - The example on its way out while the next comes in, for its first 250 milliseconds. Set together with `example`.
 * @csspart field - The text field.
 * @csspart send - The send button.
 * @csspart tools - The row under the field.
 *
 * @cssproperty --chat-composer-background-color - Fill behind the composer.
 * @cssproperty --chat-composer-border-width - Width of the composer's edge, so your theme can remove it.
 * @cssproperty --chat-composer-glow-color - Color of the focus glow under `glow`. Defaults to the primary color.
 * @cssproperty --chat-composer-max-block-size - Maximum height the field grows to.
 */
@customElement('helix-chat-composer')
export class HelixChatComposer extends HelixHeadlessChatComposer {
  static override tier = 'helix-'

  /**
   * Draws the composer's focus as a glow: a light that runs once around the
   * edge as the composer takes focus, then a soft steady edge while it holds
   * it, in place of the focus ring.
   *
   * **On focus, and only then.** It says the composer is listening. A glow
   * that ran while a reply was on its way would be a second indicator of what
   * the conversation already shows, and one that ran all the time would be
   * decoration that moves. With reduced motion asked for, the edge lights
   * without the sweep.
   *
   * The steady edge is the focus indicator, so the ring is not drawn as well.
   * Its color is `--chat-composer-glow-color`, the primary color unless set.
   */
  @property({ reflect: true, type: Boolean })
  glow = false

  /** The light's lap, and its bloom's, while they run. */
  private laps: Animation[] = []

  override connectedCallback(): void {
    super.connectedCallback()
    registerLight()
    this.addEventListener('focusin', this.arrive)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusin', this.arrive)
    for (const lap of this.laps) {
      lap.cancel()
    }
  }

  /**
   * Runs the light once as focus arrives. Focus moving between the
   * composer's own controls, such as from the field to the send button, has
   * not arrived, so the light stays down.
   */
  private readonly arrive = (event: FocusEvent): void => {
    const from = event.relatedTarget
    const within =
      from instanceof Node &&
      (from === this || this.contains(from) || this.renderRoot.contains(from))
    if (!this.glow || within || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    this.sweep()
  }

  /**
   * One lap of the light around the edge, **at one speed all the way**.
   *
   * A conic gradient turned through a full circle moves its light by angle,
   * so on a composer many times wider than it is tall the light crawls along
   * the middle of each long side and races through the corners. Here the lap
   * is measured: each side takes the share of the time its length is of the
   * edge, and the whole lap takes as long as the edge is, within a range.
   */
  private sweep(): void {
    const frame = this.renderRoot.querySelector<HTMLElement>('[part="composer"]')
    if (!frame || typeof frame.animate !== 'function') {
      return
    }
    const { height, width } = frame.getBoundingClientRect()
    const keyframes = lapOf(width, height)
    if (keyframes.length === 0) {
      return
    }
    const edge = 2 * (width + height)
    const timing = {
      duration: Math.min(LONGEST, Math.max(SHORTEST, edge / PACE)),
      easing: 'linear',
    }
    for (const lap of this.laps) {
      lap.cancel()
    }
    // The sheet caps the light's size with these. Chromium refuses a
    // gradient size that mixes a percentage with a length, in `calc()` or
    // `min()`, so the box's size comes from here. Measured October 16, 2026
    // in Chromium 153.
    frame.style.setProperty(REACH_X, `${width / 2}px`)
    frame.style.setProperty(REACH_Y, `${height / 2}px`)
    // The light on the edge, and its bloom across it, on one clock.
    this.laps = ['::before', '::after'].map((pseudoElement) =>
      frame.animate(keyframes, { ...timing, pseudoElement }),
    )
  }

  /**
   * The examples the empty field shows, drawn over the field so they can
   * move: the one showing, and while two cross, the one leaving.
   *
   * **Each is a field showing only its placeholder**, so the example is drawn
   * by the same rules as the field's own: the browser's placeholder color,
   * and the same wrapping and clipping at every width and in either
   * direction. A field's `::placeholder` cannot move, blur, or take a
   * transform, and this whole box can. The sheet places each on the field's
   * box and makes the field's own placeholder transparent, which stays the
   * example a screen reader hears. These are `inert` and `aria-hidden`, and
   * take no pointer.
   *
   * **Keyed by the example's place in the list**, so the example showing is
   * the same element as it starts to leave, and its exit starts from where it
   * rests.
   */
  protected override renderExample(
    example: { index: number; text: string },
    leaving?: { index: number; text: string },
  ): TemplateResult {
    const drawn =
      leaving === undefined
        ? [{ ...example, out: false }]
        : leaving.index === example.index
          ? [{ ...leaving, out: true }]
          : [
              { ...leaving, out: true },
              { ...example, out: false },
            ]
    return html`${repeat(
      drawn,
      (one) => one.index,
      (one) => html`<textarea
        part="example${one.out ? ' example-leaving' : ''}"
        aria-hidden="true"
        inert
        readonly
        tabindex="-1"
        placeholder=${one.text}
        ?disabled=${this.isDisabled}
      ></textarea>`,
    )}`
  }

  /**
   * Holds the field at the height it has as the next example appears, so a
   * box that grows for it grows at once and one that shrinks waits for the
   * example to land. Only where the sheet draws the examples.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (!changed.has('example') || !this.hasUpdated || !this.matches(':state(example-leaving)')) {
      return
    }
    const field = this.partNamed<HTMLTextAreaElement>('field')
    if (field && typeof CSS !== 'undefined' && CSS.supports('anchor-name: --a')) {
      field.style.setProperty('--_chat-composer-held', `${field.getBoundingClientRect().height}px`)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (this.placeholders.length < 2) {
      this.exampleLanded()
    }
  }

  /**
   * Lets the field take the height of the example showing.
   *
   * **On the element's clock, never on an animation event.** WebKit sends no
   * `animationcancel`, so a hold released by one stayed on whenever the
   * entrance was cut short, and the field kept the leaving example's height
   * until the next turn. Measured in Linux WebKit on October 17, 2026.
   */
  protected override exampleLanded(): void {
    this.partNamed<HTMLElement>('field')?.style.removeProperty('--_chat-composer-held')
  }

  static override styles: CSSResultGroup = [styles, dictationStyles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat-composer': HelixChatComposer
  }
}
