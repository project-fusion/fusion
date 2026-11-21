import {
  customElement,
  HelixElement,
  motionPaused,
  onMotionChange,
  reducedMotion,
  reportRuntime,
  timeConverter,
} from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './rotating-text-root.css.js'

/** The most words the stylesheet turns through. */
const MOST = 6

/**
 * @summary A word in a line of text that turns through others in its place, one at a time.
 *
 * @description
 * The first word shows while the rest wait below it. Every `interval`, the
 * word showing rises out and the next rises in, and after the last comes the
 * first again. The console says once when there are more than six.
 *
 * **It takes the width of its widest word**, so the line around it never
 * shifts as the words turn.
 *
 * **A screen reader reads every word once**, in order, since each stays in the
 * page; only the eye sees them one at a time. The words turn by themselves for
 * as long as the page is open, so a press on `Motion Toggle` holds the word
 * showing, as `:state(paused)`. Where the reader asked for less movement, the
 * first word stays.
 *
 * A single tier, as `Marquee` is: the turn is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Rotating words, Word rotator, Flip words, Typewriter, Changing word
 * @use A word in a headline that turns through a few others, such as faster and simpler.
 * @instead marquee - A row of items that scrolls by itself, such as a band of logos.
 * @instead sliding-number - A number that rolls to a new value.
 * @practice {preview} Put each word in an element of its own, six at most. - The words turn one element at a time, and a seventh never shows.
 * @documentation https://fusion.dev/design/components/rotating-text
 *
 * @slot - The words, each in an element of its own.
 *
 * @cssproperty --rotating-text-distance - How far below its place a word waits, and above it a word leaves to. Defaults to `0.6em`.
 *
 * @cssstate leave-1 - The first word is leaving.
 * @cssstate leave-2 - The second word is leaving.
 * @cssstate leave-3 - The third word is leaving.
 * @cssstate leave-4 - The fourth word is leaving.
 * @cssstate leave-5 - The fifth word is leaving.
 * @cssstate leave-6 - The sixth word is leaving.
 * @cssstate paused - The page's motion is paused, so the word showing stays.
 * @cssstate rotating - The words have begun to turn, so the word showing is the one a `show-` state names.
 * @cssstate show-1 - The first word is showing.
 * @cssstate show-2 - The second word is showing.
 * @cssstate show-3 - The third word is showing.
 * @cssstate show-4 - The fourth word is showing.
 * @cssstate show-5 - The fifth word is showing.
 * @cssstate show-6 - The sixth word is showing.
 */
@customElement('helix-rotating-text')
export class HelixRotatingText extends HelixElement {
  static override styles: CSSResultGroup = styles

  /** How long each word shows, in milliseconds, or as `2.5s`. */
  @property({ converter: timeConverter('interval', 2500) })
  interval = 2500

  /** The word showing, from 1. */
  private showing = 1

  /** How many words there are to turn through, at most six. */
  private count = 0

  private timer: ReturnType<typeof setInterval> | undefined

  /** Whether more than six words have been reported, which is said once. */
  private warnedAboutCount = false

  /** What stops hearing the page's pause. */
  private stop: (() => void) | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.toggleState('paused', motionPaused())
    this.stop = onMotionChange((paused) => {
      this.toggleState('paused', paused)
      this.run()
    })
  }

  override disconnectedCallback(): void {
    this.stop?.()
    this.stop = undefined
    clearInterval(this.timer)
    this.timer = undefined
    super.disconnectedCallback()
  }

  /* Counted at the first render too: words written before the definition
     loaded are slotted from the start, and a slot fires no change for them
     in every engine. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.counted()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('interval')) {
      this.run()
    }
  }

  /** Counts the words, and starts or stops turning through them. */
  private readonly counted = (): void => {
    this.count = Math.min(this.children.length, MOST)
    /* **Said, since the words past the sixth never show.** Each word takes a
       state of its own in the sheet, and the sheet writes out six. */
    if (this.children.length > MOST && !this.warnedAboutCount) {
      this.warnedAboutCount = true
      reportRuntime({
        kind: 'too-many-words',
        message:
          `<helix-rotating-text> holds ${this.children.length} words and turns through the ` +
          `first ${MOST} only. Keep it to ${MOST} or fewer.`,
        tag: this.localName,
      })
    }
    if (this.showing > this.count) {
      this.show(1, undefined)
    }
    this.run()
  }

  /** Turns while there are two words or more, the page's motion runs, and the reader has not asked for less. */
  private run(): void {
    clearInterval(this.timer)
    this.timer = undefined
    if (this.count < 2 || motionPaused() || reducedMotion() || !(this.interval > 0)) {
      return
    }
    this.timer = setInterval(() => this.turn(), this.interval)
  }

  /** Shows the next word, and has the one showing leave. */
  turn(): void {
    if (this.count < 2) {
      return
    }
    const leaving = this.showing
    this.show((this.showing % this.count) + 1, leaving)
  }

  /* Each state written out, so each pairs with its `@cssstate`. */
  private show(next: number, leaving: number | undefined): void {
    this.toggleState('show-1', next === 1)
    this.toggleState('show-2', next === 2)
    this.toggleState('show-3', next === 3)
    this.toggleState('show-4', next === 4)
    this.toggleState('show-5', next === 5)
    this.toggleState('show-6', next === 6)
    this.toggleState('leave-1', leaving === 1)
    this.toggleState('leave-2', leaving === 2)
    this.toggleState('leave-3', leaving === 3)
    this.toggleState('leave-4', leaving === 4)
    this.toggleState('leave-5', leaving === 5)
    this.toggleState('leave-6', leaving === 6)
    this.toggleState('rotating', true)
    this.showing = next
  }

  protected override render(): TemplateResult {
    return html`<slot @slotchange=${this.counted}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-rotating-text': HelixRotatingText
  }
}
