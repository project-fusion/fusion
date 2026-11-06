import {
  type ColorBytesAlpha,
  customElement,
  HelixElement,
  hostAria,
  internalsOf,
  PaintGateController,
  readColorAlpha,
  slotFilled,
  words,
  wordsConverter,
} from '@fusion.dev/helix-core'
import {
  ORB_MIN_RADIUS,
  OrbClock,
  type OrbState,
  orbDotColor,
  orbShown,
} from '@fusion.dev/helix-core/orb'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './orb-root.generated.css.js'

/** What an unreadable color answers with, mid gray in both modes. */
const GRAY: ColorBytesAlpha = [128, 128, 128, 1]

/**
 * @summary An animated shape that shows what an agent is doing.
 *
 * @description
 * A cloud of dots drawn to a canvas, with one shape per state:
 *
 * - `connecting` and `thinking`: the same leaning sash, differing in how
 *   agitated it is.
 * - `waiting` and `done`: the same settled ball at different tempos.
 * - `fetching`: a globe with a light moving around it.
 * - `listening`: a closed sphere with a ripple crossing it.
 * - `working`: a ring.
 *
 * Every state is the same banded grid with different parameters. Changing state
 * interpolates the parameters, so every frame in between is a complete shape. A
 * small change gets less time than a large one, such as a sash becoming a ring.
 * The outline changes first, so the light starts orbiting only after the shape
 * is round.
 *
 * The cloud does not rotate, and all movement happens inside it. The exception
 * is the light, which travels because a ring of evenly spaced dots looks the
 * same when rotated, so a turning state needs something fixed passing over it.
 *
 * Colors come from `--orb-color` and `--orb-ground`. Each dot's color is mixed
 * toward the ground color by its depth, so depth holds when the theme changes.
 *
 * The animation stops when the orb is off screen or in a background tab. With
 * `prefers-reduced-motion`, it draws one still frame.
 *
 * The orb is styled only and has behavior, which the tier split does not
 * otherwise allow. Its role, name and busy state follow `state`, unless
 * `announce` makes it a status region, and the rest is drawing dots to a
 * canvas.
 *
 * **A shape of your own goes in the default slot**, such as an SVG, an
 * image, or an animation. The orb draws it over its box in place of the dots
 * and stops drawing them, and keeps its role, name, busy state and custom
 * states, so your stylesheet can change what you slotted by state, such as
 * `helix-orb:state(working) svg { animation-duration: 1s }`. What you slot is
 * for the eye: a screen reader hears the orb's name.
 *
 * `--orb-speed` scales how fast the dots move, so `0.5` is a calmer orb at
 * half the tempo.
 *
 * Each state is also a custom state, such as `:state(thinking)` or
 * `:state(done)`, so a page can style what sits around an orb by what it shows,
 * whether the state was written as an attribute or set from script.
 *
 * @since 0.8.0
 * @status stable
 * @category feedback
 * @aliases Thinking, Activity, Agent, Status
 * @documentation https://fusion.dev/helix/components/orb
 *
 * @slot - A shape of your own, drawn over the orb's box in place of the dots.
 *
 * @csspart canvas - The canvas the dots are drawn on. Hidden while the default slot holds a shape.
 * @csspart live - The word for the state, which the orb says as it changes when `announce` is set. Rendered only then, and clipped out of view.
 *
 * @cssproperty --orb-color - The color of the nearest dots. Defaults to `currentColor`.
 * @cssproperty --orb-ground - The color the farthest dots fade toward. Defaults to the page's background.
 * @cssproperty --orb-size - The diameter. Overrides `size`.
 * @cssproperty --orb-speed - How fast the dots move, as a multiple of each state's own tempo. Defaults to `1`.
 *
 * @cssstate connecting - The orb shows `connecting`.
 * @cssstate done - The orb shows `done`.
 * @cssstate fetching - The orb shows `fetching`.
 * @cssstate listening - The orb shows `listening`.
 * @cssstate thinking - The orb shows `thinking`, which is also what a state it does not draw shows.
 * @cssstate waiting - The orb shows `waiting`.
 * @cssstate working - The orb shows `working`.
 */
@customElement('helix-orb')
export class HelixOrb extends HelixElement {
  /**
   * The key this family's words are registered under, its tag:
   * `registerWords('de', { 'helix-orb': { stateLabels: { thinking: 'Denkt nach' } } })`.
   */
  static words = 'helix-orb'

  static override styles: CSSResultGroup = [liveStyles, styles]

  /**
   * Says each new state politely, such as "Working" and then "Done".
   *
   * **The orb becomes the live region**: its role is `status` rather than
   * `progressbar` or `img`, and it holds the state's word. A region inside a
   * progress bar or an image may never be heard, because assistive technology
   * treats what those two hold as presentation. The name is still `label` or
   * the state's word.
   *
   * Off by default, because the name and the busy state already change with
   * the state, and an orb beside a stream of messages would otherwise talk
   * over them. Set it on an orb that is the only sign of progress on the page.
   *
   * **Without it, finishing is silent.** `done` turns the orb into an image
   * named "Done" that is no longer busy, which a screen reader reports when it
   * next reaches the orb and does not say as it happens. A page whose own
   * result arrives in a live region, such as a chat reply, already says the
   * work is done; one that shows nothing else sets `announce`.
   */
  @property({ type: Boolean })
  announce = false

  /**
   * The name read by screen readers. Defaults to the name of the state, such
   * as "Thinking".
   *
   * Empty is the state's word, which is what most callers want and none of them
   * should have to write. A caller with something better to say says it here:
   * the name of the tool being run, or the file being read.
   */
  @property()
  label = ''

  /**
   * The diameter, relative to the surrounding text.
   *
   * **`Loader`'s three steps, because the two are swapped for each other.** An
   * orb and a spinner are the same job drawn differently, a wait a reader is
   * looking at, and a product that replaces one with the other should not find
   * that a step it was writing has stopped existing. `md` is the resting one
   * and selects nothing, landing on the base rule the way a written resting
   * value does everywhere else.
   *
   * Reflected because the stylesheet selects on it. The mesh is chosen from the
   * rendered box rather than from this, so `--orb-size` and a consumer's own
   * `inline-size` get the same treatment as the named steps.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  /**
   * What the agent is doing.
   *
   * **A name we do not draw is drawn as `thinking` rather than as nothing.**
   * The set of things an agent can be doing grows faster than this list, and a
   * verb we have not made a shape for should cost a reader a less specific
   * indicator, not an empty box where the indicator was.
   *
   * Not reflected, because a state set from script would then write an
   * attribute onto the host after a server sent it without one. Each state is
   * a custom state instead, such as `:state(working)`.
   */
  @property()
  state: OrbState = 'thinking'

  /**
   * The word for each state, for a page in another language.
   *
   * A state left out keeps its English word, and `label` wins over both.
   * Keyed by state, such as `{ thinking: '…' }`. As an attribute it is that
   * object as JSON, such as `state-labels='{"done":"Terminé"}'`, so server
   * markup and plain HTML can carry the words too.
   */
  @words
  @property({ attribute: 'state-labels', converter: wordsConverter })
  stateLabels: Partial<Record<OrbState, string>> = {
    connecting: 'Connecting',
    done: 'Done',
    fetching: 'Fetching',
    listening: 'Listening',
    thinking: 'Thinking',
    waiting: 'Waiting',
    working: 'Working',
  }

  private canvas: HTMLCanvasElement | undefined
  private context: CanvasRenderingContext2D | null = null

  /**
   * Whether the default slot holds a shape of the page's, which the dots give
   * way to. A plain field, written to the canvas by hand as a lost context is,
   * so finding a shape on the first update asks for no second one.
   */
  private own = false

  /**
   * Whether anybody is looking, and the loop that draws for them.
   *
   * A context it has not been given and one the browser has taken are both
   * reasons to draw nothing that the gate cannot see, so they are said here.
   *
   * Every frame paints: a settled orb has movement of its own in every state,
   * and only the gate's own three answers stop it.
   */
  private readonly gate = new PaintGateController(this, {
    canRun: () => !!this.context && !this.lost && !this.own,
    onFrame: (delta) => {
      this.paint(delta)
    },
    onMotion: (reduced) => {
      if (reduced) {
        this.clock.still()
        this.paint(0)
      }
    },
    onResize: () => {
      this.measure()
      this.paint(0)
    },
  })

  /** Whether the browser has taken the canvas, as its own two events say. */
  private lost = false

  /** The box the canvas was last measured at, in CSS pixels. */
  private box = 0

  /**
   * Where the cloud is now, where it is heading, and the state's own clock,
   * as core's `OrbClock` keeps them for the web and a phone alike.
   */
  private readonly clock = new OrbClock('thinking')

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const state = this.shown
    /* `progressbar` while there is work outstanding, and a plain image once
       there is not: a finished orb that still announced itself as a progress
       bar would leave a screen reader waiting for a bar that never fills.

       A `status` under `announce`, and never busy: a busy live region holds
       back what it says until it is not. */
    hostAria(internalsOf(this), {
      label: this.label || this.word,
      role: this.announce ? 'status' : state === 'done' ? 'img' : 'progressbar',
    })
    internalsOf(this).ariaBusy = this.announce ? null : state === 'done' ? 'false' : 'true'

    /* One literal per state, so each is documented and checked by name. */
    this.toggleState('connecting', state === 'connecting')
    this.toggleState('done', state === 'done')
    this.toggleState('fetching', state === 'fetching')
    this.toggleState('listening', state === 'listening')
    this.toggleState('thinking', state === 'thinking')
    this.toggleState('waiting', state === 'waiting')
    this.toggleState('working', state === 'working')

    if (changed.has('state') && changed.get('state') !== undefined) {
      this.turn()
    }
  }

  /** The state drawn: `state`, or `thinking` for one it does not draw. */
  private get shown(): OrbState {
    return orbShown(this.state)
  }

  /** The word for the state drawn, in the page's words where it gave them. */
  private get word(): string {
    return this.stateLabels?.[this.shown] ?? ''
  }

  protected override render(): TemplateResult {
    /* `aria-hidden` on the canvas rather than the host: the host carries the
       name and the role through `ElementInternals`, and the canvas has nothing
       of its own to announce.

       Under `announce` the word is served with the first render, so the orb
       arrives saying its first state and speaks only when the word changes. */
    return html`<canvas part="canvas" aria-hidden="true"></canvas
      ><slot @slotchange=${this.handleSlotChange}></slot>${
        this.announce ? html`<span part="live">${this.word}</span>` : nothing
      }`
  }

  /** Stops the dots for a shape the page slotted, and starts them again once it is gone. */
  private readonly handleSlotChange = (event: Event): void => {
    this.own = slotFilled(event.target as HTMLSlotElement)
    this.canvas?.toggleAttribute('hidden', this.own || this.lost)
    if (this.own) {
      this.gate.stop()
    } else if (this.hasUpdated) {
      this.box = 0
      this.measure()
      this.paint(0)
      this.gate.play()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    /* The base class's first, which is what records the settled state a frame
       from now. Without it `whenSettled` never resolves and the transition
       guard never lifts, so a consumer's transition on the host never runs. */
    super.firstUpdated(changed)
    this.start()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Guarded on `hasUpdated`, because the first connection happens before the
       first render and there is no canvas yet. */
    if (this.hasUpdated) {
      this.start()
    }
  }

  override disconnectedCallback(): void {
    /* The gate goes down in here, which is what stops the loop and forgets
       that the orb was ever on screen: a change of state after a removal calls
       `turn`, which is the one path to `play` that no observer gates. */
    super.disconnectedCallback()
    /* A detached orb has no box, so a return measures again: a context lost and
       given back while it was away comes back in its default state, and
       `measure` is what sets the transform. */
    this.box = 0
    this.canvas?.removeEventListener('contextlost', this.handleLost)
    this.canvas?.removeEventListener('contextrestored', this.handleRestored)
    this.canvas?.removeEventListener('transitionend', this.handleRestyle)
  }

  /**
   * **One frame for a still orb, once a color the canvas carries has moved**,
   * as Strands and Aura draw one. A running orb reads the colors on its next
   * frame, but one drawn once, under reduced motion or with its loop stopped,
   * kept the ink of the theme it was drawn in: after a switch to dark, dark
   * dots on a dark ground.
   */
  private readonly handleRestyle = (): void => {
    if (!this.gate.running) {
      this.paint(0)
    }
  }

  /* Everything the canvas needs, in one place both lifecycles can reach.
   *
   * `firstUpdated` runs once for the life of the element, while
   * `disconnectedCallback` drops the observers and runs every time the element
   * moves. Setup that lived only in `firstUpdated` would leave an orb reordered
   * by a framework with no observers and nothing to rebuild them: a live
   * component painting one frame forever, with no error anywhere. */
  private start(): void {
    /* **Connected, and not only rendered.** Lit runs the first update in the
       microtask after the first connection whether or not the element is still
       there, so one inserted and removed in the same task reaches
       `firstUpdated` detached, and what it installed there no disconnection was
       left to take down: the document listener held the element for the life
       of the page. */
    if (!this.isConnected) {
      return
    }
    const canvas = this.renderRoot.querySelector('canvas')
    /* Client only, and by contract. There is no canvas on a server, and a
       machine that refuses a 2D context gets an empty box rather than a
       thrown error. */
    if (!canvas) {
      return
    }
    this.canvas = canvas
    this.own = slotFilled(this.renderRoot.querySelector('slot'))
    canvas.toggleAttribute('hidden', this.own || this.lost)
    this.context ??= canvas.getContext('2d')
    if (!this.context) {
      return
    }
    canvas.addEventListener('contextlost', this.handleLost)
    canvas.addEventListener('contextrestored', this.handleRestored)
    canvas.addEventListener('transitionend', this.handleRestyle)
    /* A restore that landed while it was away, which nothing heard. Asked only
       once a loss was: the method is newer than the canvas, and an engine that
       never reports a loss may not have it. */
    if (this.lost && !this.context.isContextLost()) {
      this.lost = false
      canvas.toggleAttribute('hidden', this.own)
    }

    this.gate.watch()

    this.measure()
    this.paint(0)
  }

  /**
   * Matches the drawing buffer to the box, and reports whether it changed.
   *
   * Capped at two device pixels: past that the dot count is unchanged and the
   * fill cost doubles again for a mesh already drawn sub-pixel.
   */
  private measure(): boolean {
    const canvas = this.canvas
    if (!canvas) {
      return false
    }
    const size = Math.round(this.getBoundingClientRect().width)
    if (size <= 0 || size === this.box) {
      return false
    }
    this.box = size
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    this.context?.setTransform(dpr, 0, 0, dpr, 0, 0)
    return true
  }

  /**
   * Begins a transition from whatever is on the screen right now.
   *
   * **The shape drawn is read before the clock takes the new state**, so the
   * cloud departs from it. Read after, as it was until November 5, 2026, the
   * blend already ended at the new state, and every change jumped.
   */
  private turn(): void {
    this.clock.turn(this.state, performance.now())
    if (!this.gate.running) {
      this.paint(0)
      this.gate.play()
    }
  }

  /**
   * Stops for a canvas the browser has taken, on a GPU reset, until it is
   * given back.
   *
   * **Not canceled, which is the aura's contract turned over.** A 2D context
   * comes back on its own unless its loss is canceled, where a WebGL one comes
   * back only if it is. Hidden meanwhile, because a lost canvas is not reliably
   * transparent (the aura's `handleLost` has what was measured), and hidden it
   * leaves the empty box a machine with no 2D context is shown.
   */
  private readonly handleLost = (): void => {
    this.lost = true
    this.gate.stop()
    this.canvas?.toggleAttribute('hidden', true)
  }

  /**
   * Draws again on the canvas the browser gave back.
   *
   * **Sized again, because it comes back in its default state.** Found 15 Sep
   * 2026 by crashing the GPU process under headless Chromium: the transform
   * `measure` sets came back the identity, and `measure` sets it only when the
   * box changes. At twice the density that is an orb drawn at half its size in
   * the top left corner, for as long as the box holds still.
   */
  private readonly handleRestored = (): void => {
    this.lost = false
    this.canvas?.toggleAttribute('hidden', this.own)
    this.box = 0
    this.measure()
    this.paint(0)
    this.gate.play()
  }

  /** One frame: core's dots for the clock, painted back to front in the canvas's two colors. */
  private paint(dt: number): void {
    const ctx = this.context
    const size = this.box
    if (!ctx || size <= 0) {
      return
    }
    /* Read off the canvas rather than the host: the stylesheet resolves both
       ends of the ramp onto color-typed properties there, for the reason its
       comment gives. A mid gray is what an unreadable value answers, which is
       visible against either mode's ground rather than disappearing into one. */
    const painted = getComputedStyle(ctx.canvas)
    /* Carried on an inert property for the reason the colors are. */
    const speed = Number.parseFloat(painted.animationIterationCount)
    const ink = readColorAlpha(painted.color) ?? GRAY
    const ground = readColorAlpha(painted.textDecorationColor) ?? GRAY
    const dots = this.clock.frame(size, performance.now(), dt, speed, this.gate.reduced)
    ctx.clearRect(0, 0, size, size)
    for (const dot of dots) {
      const color = orbDotColor(dot, ink, ground)
      if (color === undefined) {
        continue
      }
      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, Math.max(ORB_MIN_RADIUS, dot.radius), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-orb': HelixOrb
  }
}
