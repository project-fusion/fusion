import {
  capturePointer,
  closestInstance,
  customElement,
  HelixBeforeCollapseEvent,
  HelixBeforeResizeEvent,
  HelixElement,
  requestChange,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * The inline size under which `orientation="auto"` stacks, in pixels.
 *
 * 32rem at the default root size. Two panes side by side under this have about
 * 240px each before the divider, which is narrower than the content anybody
 * puts in one: the sandbox at 390 gave its source pane 237px and cut every line
 * mid-token, which is the measurement this number comes from.
 *
 * A constant and not a property, until something wants a different one. The
 * axis is the decision worth exposing; where it turns is a detail of this
 * component doing what it was asked.
 */
const STACK_BELOW = 512

/**
 * @summary Two panes and a divider the reader can move.
 *
 * @description
 * **One axis, and nesting is how you get two.** A splitter inside a splitter
 * gives back the cross, and gives the three-pane and four-pane arrangements a
 * single divider never had.
 *
 * **Where two of them cross there is a corner, and it moves both.** A splitter
 * slotted into a pane of another, at right angles to it, grows a handle at the
 * crossing: `move` under the pointer, both arrow axes on the keyboard, and a
 * drag that carries the two positions at once. It appears at `firstUpdated`
 * rather than in the served markup, being an affordance rather than content,
 * and a splitter with no corner yet is a splitter with two working dividers.
 *
 * **The divider is a real `role="separator"` with `aria-valuenow`**, moved by
 * the arrow keys as well as by pointer, with `Home` and `End` taking it to its
 * bounds. A drag in progress is a state rather than `:hover`, so both dividers
 * a corner moves are lit for as long as it moves them.
 *
 * **It goes where it is put, all the way to either end.** `min` and `max` are
 * nothing and everything unless a consumer says otherwise, because a divider
 * that stops short of the edge gives a reader no way to put a pane away.
 *
 * **A pane can be shut, and that is not the same as a divider at the edge.**
 * The geometry is identical and the knowledge is not: only a shut pane knows
 * where to open back to. So `collapsed` is a second state rather than a reading
 * of the position, and the position it opens to is the one collapsing never
 * overwrote. `collapsed-size` keeps a sliver showing where a pane has a tab
 * strip worth leaving, and collapse overrides `min` and `max`, which is what
 * those are for.
 *
 * @since 0.1.0
 * @status experimental
 * @category layout
 * @aliases SplitPane, Resizable, SplitView
 * @documentation https://helix.fusion.dev/components/splitter
 *
 * @slot end - The pane after it.
 * @slot start - The pane before the divider.
 *
 * @event {HelixBeforeCollapseEvent} helix-before-collapse - Fired before a pane shuts or reopens, and cancelable.
 * @event {HelixBeforeResizeEvent} helix-before-resize - Fired before the divider settles, and cancelable.
 *
 * @csspart corner - The handle where two dividers cross, added on the client.
 * @csspart end - The box holding the second.
 * @csspart separator - The divider itself.
 * @csspart start - The box holding the first pane.
 *
 * @cssproperty --splitter-corner-at - Where a nested splitter crosses this one, as a percentage.
 * @cssproperty --splitter-position - Where the divider sits, as a percentage of the box.
 */
/*
 * How a corner is drawn, which is not a consumer's business and is worth
 * writing down.
 *
 * **The outer splitter draws it and the nested one announces itself upward.**
 * The nested one drawing its own is the tempting version, since it already knows
 * where its divider begins, and it is clipped: the crossing lies on the boundary
 * between a pane and the divider beside it, a handle centered there reaches back
 * over the boundary, and a pane is `overflow: auto`. Exactly half the corner is
 * cut off. The outer separator is the one element that straddles the seam.
 *
 * That makes the channel a single call in a single direction: `cross(child, at)`
 * says where the child crosses, `moveTo` drives either one, and neither reads
 * the other's state. The child calls it, because a parent cannot poll for a
 * child that has not upgraded yet.
 *
 * The one number it carries is a percentage rather than a measurement, which is
 * what keeps either from measuring the other, and it assumes the nested splitter
 * fills its pane. Give it its own inset and the corner is drawn where the
 * crossing would be rather than where it is.
 *
 * Where two dividers are parallel there is no corner, there being nothing to
 * take hold of. Where they cross without one, the inner divider takes the
 * pointer: every separator sits on the same layer, so a tie goes to document
 * order and a deeper splitter is always later.
 */
@customElement('helix-headless-splitter')
export class HelixHeadlessSplitter extends HelixElement {
  /**
   * How much of a shut pane is still shown, as a percentage.
   *
   * Zero by default, which is a pane fully gone. A tab strip or a title bar
   * that should survive its own collapse says how much of itself to keep, and
   * only whoever put it there knows that, which is the same reason `min` is a
   * consumer's to set.
   */
  @property({ attribute: 'collapsed-size', type: Number })
  collapsedSize = 0

  /**
   * Where the divider sits, as a percentage of the whole.
   *
   * Reading gives where it is; writing declares it the consumer's, and
   * `default-position` seeds one this element owns. The same accessor pair
   * `Pagination.page` and the calendar's `month` carry.
   */
  @property({ type: Number })
  get position(): number {
    const shut = this.collapsed
    if (shut) {
      return shut === 'start' ? this.sliver : 100 - this.sliver
    }
    return this.clamp(this.positionState ?? this.defaultPosition)
  }

  set position(next: number) {
    const previous = this.position
    this.positionState = next
    /* The consumer has spoken, so the drag stops standing in for them. Without
       this the divider flashes back: `showing` falls to the position set before
       the gesture and is drawn there for the frame it takes them to answer the
       announcement, snapping to where the drag started and then jumping to
       where it was dropped. */
    this.reached = undefined
    this.requestUpdate('position', previous)
  }

  /**
   * Accessible name for the handle where two dividers cross.
   */
  @property({ attribute: 'corner-label' })
  cornerLabel = 'Resize both'

  /**
   * Which pane is shut, if either.
   *
   * The same accessor pair as `position`, and deliberately a second state
   * rather than a reading of the first. A pane shut by dragging the divider to
   * the edge and a pane shut on purpose look identical in geometry and are not
   * the same thing: only the second knows where to go back to. Kept apart, the
   * open position is simply the one collapsing never overwrote, so restoring
   * needs no memory of its own.
   *
   * It overrides `min` and `max`, which is the point of it. Those keep a sliver
   * of a pane during a drag; this is the thing that says the sliver can go.
   */
  @property()
  get collapsed(): 'end' | 'start' | undefined {
    const held = this.collapsedState
    if (held === undefined) {
      return this.defaultCollapsed
    }
    return held === 'none' ? undefined : held
  }

  set collapsed(next: 'end' | 'start' | undefined) {
    const previous = this.collapsed
    /* `none` rather than `undefined`, because the two mean different things
       here and conflating them cost a spec: `undefined` is nobody having
       spoken, which is the seed's cue to answer, so clearing a collapse handed
       it straight back to `default-collapsed` and the pane would not open. */
    this.collapsedState = next ?? 'none'
    this.requestUpdate('collapsed', previous)
  }

  /**
   * Which pane starts shut, where nothing declared it.
   */
  @property({ attribute: 'default-collapsed' })
  defaultCollapsed?: 'end' | 'start'

  /**
   * Where the divider starts, where nothing declared it.
   */
  @property({ attribute: 'default-position', type: Number })
  defaultPosition = 50

  /**
   * Accessible name for the divider.
   */
  @property()
  label = 'Resize panes'

  /**
   * Nearest it may come to the end, on the same terms as `min`.
   */
  @property()
  max: number | string = 100

  /**
   * Either kind of bound as a percentage of the box.
   *
   * Measured rather than cached: a length is only meaningful against the size
   * the splitter is right now, and the drag that asks is already reading layout.
   * Falls back where there is nothing to measure, which is the server and an
   * element that is not displayed, so `aria-valuemin` is a number either way.
   */
  private toPercent(value: number | string, fallback: number): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback
    }
    const text = value.trim()
    if (text === '') {
      return fallback
    }
    const bare = Number(text)
    if (Number.isFinite(bare)) {
      return bare
    }
    const length = /^(-?[\d.]+)(em|px|rem)$/.exec(text)
    if (!length || typeof window === 'undefined') {
      return fallback
    }
    const amount = Number(length[1])
    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const own = Number.parseFloat(getComputedStyle(this).fontSize) || root
    const pixels = length[2] === 'px' ? amount : amount * (length[2] === 'rem' ? root : own)
    const box = this.getBoundingClientRect()
    const extent = this.vertical ? box.height : box.width
    return extent > 0 ? (pixels / extent) * 100 : fallback
  }

  /** `min` as a percentage, whichever way it was written. */
  private get minPercent(): number {
    return this.toPercent(this.min, 0)
  }

  /** `max` as a percentage, whichever way it was written. */
  private get maxPercent(): number {
    return this.toPercent(this.max, 100)
  }

  /**
   * Nearest the divider may come to the start.
   *
   * A bare number is a percentage, which is what this always took. A CSS length
   * is resolved against the splitter's own box along its axis, so `min="15rem"`
   * means fifteen rem of pane whatever the container is doing.
   *
   * **The length is the one that holds.** A percentage minimum does not: twenty
   * per cent is 280px in a 1400px splitter and 100px in a 500px one, and the
   * number a consumer picked was almost certainly about how much text fits
   * rather than about a ratio. The pane that a percentage protects at desk
   * width is squeezed past reading at half of it.
   *
   * **It does not fight `collapsed`.** Collapse overrides `min` and `max`, as
   * the class docstring says, so a pane can still be shut and reopened. What a
   * minimum forbids is the space between shut and usable: a pane wide enough to
   * be there and too narrow to read is the state nobody wants and every drag
   * passes through.
   */
  @property()
  min: number | string = 0

  /**
   * Which way the panes are laid out.
   *
   * `horizontal` is side by side with an upright divider between them, and
   * `aria-orientation` on that divider is therefore `vertical`: a separator's
   * orientation is the direction it is *drawn* in, not the axis it moves along,
   * so the two words are opposite each other here on purpose.
   *
   * Unset is horizontal and stays unset, so a reflected default cannot appear on
   * a host whose server output never had it.
   *
   * **`auto` lays the panes out along whichever axis the splitter has room for**,
   * stacking them once its own inline size falls under `STACK_BELOW`. It is a
   * value rather than a default because turning a splitter is not a style
   * change: the drag axis, the arrow keys and `aria-orientation` all turn with
   * it, so a CSS-only version would look stacked and behave side by side, with
   * the keyboard moving the wrong way and the accessibility tree saying
   * something untrue. Everything here reads `vertical` rather than this
   * property, which is what makes one getter enough to turn all three together.
   *
   * **Its own width and not the viewport**, per the responsiveness policy in
   * `.claude/rules/helix.md`: a splitter in a 300px panel of a 1400px window has
   * no room for two panes side by side, and a media query would hand it the
   * desktop branch. A `ResizeObserver` on the host asks the only question that
   * has an honest answer.
   */
  @property({ reflect: true })
  orientation?: 'auto' | 'horizontal' | 'vertical'

  /**
   * How far one arrow press moves it, as a percentage.
   */
  @property({ type: Number })
  step = 2

  /** The position, whoever set it, and `undefined` until somebody has. */
  private positionState: number | undefined = undefined

  /** The collapse, whoever set it, and `undefined` until somebody has. */
  private collapsedState: 'end' | 'none' | 'start' | undefined = undefined

  /**
   * Where the divider was before the gesture that may be about to shut it.
   *
   * A drag writes a position on every pointer move, so by the time it reaches
   * the edge the number it started from is gone. Taken once, on the press, and
   * written back if the gesture ends shut, so the pane opens to where it was
   * rather than to the edge it was dragged against.
   */
  private opened: number | undefined = undefined

  /**
   * Where the gesture has moved to, whether or not it was applied. See `move`.
   *
   * `@state`, because the divider is drawn from it while a drag is under way.
   */
  @state()
  private reached: number | undefined = undefined

  /**
   * The position to draw, which is not always the position to report.
   *
   * A controlled splitter applies nothing, so `position` holds still for the
   * whole gesture: drawn from it, the divider stays where it was until the
   * pointer comes up and the consumer answers, jumping to the end rather than
   * following the hand.
   *
   * So a drag draws itself. The number is still not announced until it settles,
   * and the consumer's answer takes over the moment they give one.
   */
  private get showing(): number {
    return this.reached === undefined ? this.position : this.clamp(this.reached)
  }

  /**
   * Whether this divider is being moved right now, by anything.
   *
   * `:hover` is not enough on its own. A drag holds the pointer through capture
   * and a fast one leaves the eight pixel target behind, and a corner moves a
   * divider the pointer is nowhere near: the nested one, while the reader is on
   * the crossing. Both are dividers that are moving and should say so.
   *
   * A `data-` attribute on an element in this shadow root, never on the host.
   */
  @state()
  private dragging = false

  /**
   * Nested splitters that cross this one, and how far along they cross it.
   *
   * Written by the child, not found by the parent: a parent cannot poll for a
   * child that has not upgraded, so the child announces itself once it has. The
   * number is the child's own `position`, which is also its offset along this
   * divider, because the child fills the pane and the pane spans this splitter
   * end to end on the axis the divider runs.
   *
   * Not `@state`, because the array is mutated in place. `cross` and `uncross`
   * request the update themselves.
   */
  private crossings: Array<{ at: number; by: HelixHeadlessSplitter }> = []

  /** The splitter this one is nested in, once it has found it. */
  private outer: HelixHeadlessSplitter | null = null

  /** The last position announced upward, so an unchanged one costs nothing. */
  private crossedAt: number | undefined = undefined

  /** The two boxes a corner drag is measured against, taken once. */
  private cornerOrigin: {
    by: HelixHeadlessSplitter
    inner: { length: number; start: number }
    outer: { length: number; start: number }
  } | null = null

  /**
   * The host's box, measured once when a drag starts.
   *
   * Measuring per move is a forced layout on every pointer event, in the middle
   * of a gesture whose whole job is to stay ahead of the pointer. Nothing about
   * it moves while the divider does.
   */
  private origin: { length: number; start: number } | null = null

  /**
   * Moves the divider, and optionally says so.
   *
   * Public because a corner on a nested splitter has to drive the one it is
   * nested in, and that is the whole of what it needs: the pair are not
   * otherwise coupled and neither reads the other's state. `settled` is false
   * for each step of a drag and true once, at the end, for the reason a drag
   * announces once: only the position it ends at is a preference.
   */
  moveTo(next: number, settled = false): void {
    /* An unsettled move is a drag in progress, which is what `settled` already
       means, so the nested splitter a corner drives lights up without either of
       them being told about the other's presentation. */
    this.dragging = !settled
    if (settled) {
      this.settle(next)
    } else {
      this.move(next)
    }
  }

  /** The collapsed size, held inside the range a percentage can be. */
  private get sliver(): number {
    return Math.min(100, Math.max(0, this.collapsedSize))
  }

  /**
   * Whether the divider is against an edge with nothing beside it.
   *
   * Geometry, not state. Asking whether the pane is `collapsed` is the wrong
   * question: a divider driven to the edge by a consumer setting `position` is
   * just as flush and would still get a line drawn. What the stylesheet needs
   * to know is whether there is a pane on both sides, which is a fact about
   * where the divider is however it got there.
   *
   * Still not the same question as `collapsed`: a pane shut to a sliver has a
   * boundary worth drawing, and one shut to nothing has the container's own edge
   * there instead.
   */
  private get flush(): boolean {
    return this.sliver === 0 && this.shutAt(this.position) !== undefined
  }

  /**
   * The collapse a settled position amounts to, if any, so a pane dragged shut
   * and a pane shut by a consumer's button are the same state.
   *
   * No separate threshold. Landing on the collapsed size *is* the gesture, and
   * `clamp` puts every overshoot exactly on the bound, so the default of zero
   * latches on any drag that runs off the end.
   */
  private shutAt(position: number): 'end' | 'start' | undefined {
    const size = this.sliver
    if (position <= size) {
      return 'start'
    }
    return position >= 100 - size ? 'end' : undefined
  }

  /** Pulled between the bounds, which are the ends unless a consumer moved them. */
  private clamp(next: number): number {
    const min = Math.max(0, Math.min(100, this.minPercent))
    const max = Math.max(min, Math.min(100, this.maxPercent))
    return Math.min(max, Math.max(min, Number.isFinite(next) ? next : min))
  }

  /**
   * Whether `auto` has resolved to stacked, which only the observer sets.
   */
  @state()
  private stacked = false

  /** Watches this element's own width while `auto` is what it was asked for. */
  private sizes: ResizeObserver | undefined

  /**
   * Starts or stops watching, according to what the axis was asked to be.
   *
   * Called from `firstUpdated` and from `updated`, so a consumer switching to
   * `auto` after mount is observed and one switching away stops being: an
   * observer left running would keep writing `stacked` that nothing reads, and
   * a splitter told `horizontal` has been given its answer already.
   */
  private watchWidth(): void {
    if (this.orientation !== 'auto') {
      this.sizes?.disconnect()
      this.sizes = undefined
      return
    }
    if (this.sizes) {
      return
    }
    this.sizes = new ResizeObserver(([entry]) => {
      const width = entry?.borderBoxSize?.[0]?.inlineSize ?? entry?.contentRect.width ?? 0
      /* Zero while the element is `display: none` or not yet laid out, and a
         zero is not a narrow splitter: taking it would stack every instance
         that starts hidden and never turn it back. */
      if (width > 0) {
        this.stacked = width < STACK_BELOW
      }
    })
    this.sizes.observe(this)
  }

  /**
   * Public because a nested splitter compares axes with the one it is in.
   *
   * The one place the axis is decided, which is why `auto` costs a single line
   * here rather than a pass over seventeen readers: the drag, the arrow keys and
   * `aria-orientation` all ask this and all turn together.
   */
  get vertical(): boolean {
    return this.orientation === 'vertical' || (this.orientation === 'auto' && this.stacked)
  }

  /**
   * Asks to move, and applies it where the position is this element's to move.
   *
   * Not announced per step: `helix-before-resize` is the settling, below. A drag that
   * announced every position would be asking a consumer to record a hundred
   * decisions to keep one.
   */
  private move(next: number): void {
    const wanted = this.clamp(next)
    /* Where the gesture has reached, recorded before anything decides whether to
       apply it. A controlled splitter applies nothing, so its `position` is
       whatever the consumer last said, and settling at *that* would announce
       the number it already had: the drag ends where it began and the divider
       never moves. Only the pointer is exposed to it, the keyboard computing
       its next position rather than reading it back. */
    this.reached = wanted
    if (wanted === this.position) {
      return
    }
    const previous = this.position
    this.positionState = wanted
    /* A divider that is moving is a pane that is opening, and a shut one is
       still draggable precisely so it can be. Silent, like the move itself:
       the settling below is what announces either. */
    this.collapsedState = 'none'
    this.requestUpdate('position', previous)
  }

  /**
   * Says the arrangement has settled, so a consumer can keep it.
   *
   * Through the audited path, so a consumer who owns `position` is told what was
   * asked for and decides, and one who does not has already had it applied.
   */
  private settle(next: number): void {
    const wanted = this.clamp(next)
    const shut = this.shutAt(wanted)
    requestChange({
      apply: (value) => {
        const previous = this.position
        this.positionState = value
        this.requestUpdate('position', previous)
      },
      event: (value) => new HelixBeforeResizeEvent({ value: String(value) }),
      host: this,
      next: wanted,
    })
    if (shut !== this.collapsed) {
      /* Two values from one gesture, so two announcements. `ChangeDetail`
         carries a name for exactly this, and a consumer listening for one of
         them is not made to care about the other. */
      requestChange({
        apply: (value) => {
          const previous = this.collapsed
          // Back to where the gesture started, so opening it again is a return
          // rather than a jump to the edge it was dragged against.
          if (value !== '' && this.opened !== undefined) {
            this.positionState = this.opened
          }
          this.collapsedState = value === '' ? 'none' : (value as 'end' | 'start')
          this.requestUpdate('collapsed', previous)
        },
        event: (value) => new HelixBeforeCollapseEvent({ value }),
        host: this,
        next: shut ?? '',
      })
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const separator = event.currentTarget as HTMLElement
    const box = this.getBoundingClientRect()
    this.origin = this.vertical
      ? { length: box.height, start: box.top }
      : { length: box.width, start: box.left }
    /* Captured, so the divider keeps the pointer once it has it: a drag that
       outruns a thin target otherwise ends the moment the pointer leaves it,
       which on a fast gesture is immediately. */
    capturePointer(separator, event.pointerId)
    this.opened = this.collapsed ? undefined : this.position
    // Cleared, so a number from the last gesture cannot settle this one.
    this.reached = undefined
    // On the press rather than the first move, so holding it still says so too.
    this.dragging = true
    event.preventDefault()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const origin = this.origin
    if (!origin || origin.length === 0) {
      return
    }
    const along = this.vertical ? event.clientY : event.clientX
    /* Signed against the writing direction, because a pointer is physical and
       the panes are not: in a right-to-left document the start pane is on the
       right, so dragging right makes it *larger*. */
    const raw = ((along - origin.start) / origin.length) * 100
    const rtl = !this.vertical && getComputedStyle(this).direction === 'rtl'
    this.move(rtl ? 100 - raw : raw)
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.origin) {
      return
    }
    const separator = event.currentTarget as HTMLElement
    if (separator.hasPointerCapture(event.pointerId)) {
      separator.releasePointerCapture(event.pointerId)
    }
    this.origin = null
    this.dragging = false
    /* Nothing moved, so nothing is announced. Settling on every press would
       dispatch a change carrying the position it already had, so a plain click
       rewrites a consumer's stored value from a gesture that moved nothing:
       harmless where the value round-trips exactly, and not where it does not,
       which is any consumer storing pixels and dividing by a box. */
    if (this.reached === undefined) {
      return
    }
    /* `reached` is deliberately left standing. It is what the divider is drawn
       from until the consumer answers, and the setter is what clears it. */
    this.settle(this.reached)
  }

  /**
   * The keys a separator answers.
   *
   * One axis, the one the divider actually travels along, plus `Home` and `End`
   * for its bounds. The other two arrows are left alone and the page scrolls
   * under them as it would anywhere else.
   *
   * **Not all four, which is the tempting version.** Taking every arrow would
   * mean `ArrowLeft` moving a horizontal divider up and down: not a reader
   * being helped past a wrong guess, an arrow that does not go the way it
   * points. A reader who guesses wrong is answered better by the corner, where
   * all four are live and each moves the divider it points along, which is the
   * only place in a splitter where a second axis means anything.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const back = this.vertical ? 'ArrowUp' : 'ArrowLeft'
    const forward = this.vertical ? 'ArrowDown' : 'ArrowRight'
    let next: number
    if (event.key === back) {
      next = this.position - this.step
    } else if (event.key === forward) {
      next = this.position + this.step
    } else if (event.key === 'Home') {
      next = this.minPercent
    } else if (event.key === 'End') {
      next = this.maxPercent
    } else {
      return
    }
    this.move(next)
    this.settle(next)
    // Or the arrows scroll the page under the divider being moved.
    event.preventDefault()
  }

  /** Puts the divider back where the markup put it. */
  private reset(): void {
    /* `default-position`, never the position captured at first render. Those
       are the same only when nobody owns the position: a consumer who does owns
       what it was on that first frame too, and theirs can be a number they
       cannot compute yet, as the sandbox's is, sizing its panel in pixels with
       no box to divide by until it has rendered once. Home would then be
       "panel closed" and a double click would shut the panel rather than
       restore it.

       Declared rather than remembered, so it is a value a consumer can state
       and change, and it needs no capture at all. */
    const home = this.clamp(this.defaultPosition)
    this.move(home)
    this.settle(home)
  }

  private readonly handleDoubleClick = (): void => {
    this.reset()
  }

  /**
   * Both of them, because the corner moves both.
   *
   * Its own handler, because the corner is a sibling of the separator rather
   * than a child of it, for the stacking reason in the stylesheet, so nothing
   * reaches the separator's own double click by bubbling.
   */
  private readonly handleCornerDoubleClick = (event: MouseEvent): void => {
    const crossing = this.crossings[Number((event.currentTarget as HTMLElement).dataset.cross)]
    if (!crossing) {
      return
    }
    this.reset()
    crossing.by.reset()
    this.leaveSeparator(event)
  }

  /**
   * Records that a nested splitter crosses this one at `at` percent along it.
   *
   * Public because it is the whole of the channel between the two, and it runs
   * one way: the child tells the parent where it is, and the parent draws the
   * corner and drives them both. Nothing is read back, so neither has to know
   * anything about the other's state.
   */
  cross(by: HelixHeadlessSplitter, at: number): void {
    const found = this.crossings.find((crossing) => crossing.by === by)
    if (found) {
      if (found.at === at) {
        return
      }
      found.at = at
    } else {
      this.crossings.push({ at, by })
    }
    this.requestUpdate()
  }

  /** Forgets a nested splitter that has left the tree. See `cross`. */
  uncross(by: HelixHeadlessSplitter): void {
    const at = this.crossings.findIndex((crossing) => crossing.by === by)
    if (at === -1) {
      return
    }
    this.crossings.splice(at, 1)
    this.requestUpdate()
  }

  /**
   * Announces this splitter to the one it is nested in, if they cross.
   *
   * Client only. The server has no tree to walk, and a parent that has not
   * upgraded has no `orientation` to compare against, so this waits for
   * `firstUpdated`. That is what the corner is allowed to be: an affordance
   * rather than content, absent from the served markup and appearing at
   * hydration, with two working dividers in the meantime.
   *
   * `parentElement` first, so a splitter does not find itself.
   *
   * **By identity rather than by tag, which is what `closestInstance` exists
   * for.** A selector like `'helix-splitter, helix-headless-splitter'` names a
   * styled tag from a headless package and misses any third tag, which is
   * exactly what subclassing a headless element produces: the lookup returns
   * null, the nested splitter gets no corner, and nothing reports an error.
   *
   * It also crosses shadow boundaries, which `closest` does not: a splitter
   * slotted into another component's shadow root has a `parentNode` chain
   * ending at a `ShadowRoot`, and nesting through a slot is the ordinary case
   * for anything composable.
   */
  private findOuter(): void {
    const outer = closestInstance(this.parentElement, HelixHeadlessSplitter)
    if (!outer || outer === this || outer.vertical === this.vertical) {
      // Parallel dividers never meet, so there is no corner to take hold of.
      return
    }
    this.outer = outer
    this.crossedAt = this.position
    outer.cross(this, this.position)
  }

  private readonly handleCornerDown = (event: PointerEvent): void => {
    const handle = event.currentTarget as HTMLElement
    const crossing = this.crossings[Number(handle.dataset.cross)]
    if (!crossing) {
      return
    }
    const mine = this.getBoundingClientRect()
    const theirs = crossing.by.getBoundingClientRect()
    this.cornerOrigin = {
      by: crossing.by,
      inner: crossing.by.vertical
        ? { length: theirs.height, start: theirs.top }
        : { length: theirs.width, start: theirs.left },
      outer: this.vertical
        ? { length: mine.height, start: mine.top }
        : { length: mine.width, start: mine.left },
    }
    capturePointer(handle, event.pointerId)
    this.opened = this.collapsed ? undefined : this.position
    crossing.by.opened = crossing.by.collapsed ? undefined : crossing.by.position
    this.reached = undefined
    crossing.by.reached = undefined
    /* Both of them, on the press. The nested one is reachable here because it is
       the same class, and this is the whole of what the corner needs beyond
       `moveTo`: a divider being moved looks like one. */
    this.dragging = true
    crossing.by.dragging = true
    this.leaveSeparator(event)
  }

  /** Both axes at once, each measured against the splitter that owns it. */
  private readonly handleCornerMove = (event: PointerEvent): void => {
    const origin = this.cornerOrigin
    if (!origin) {
      return
    }
    const rtl = getComputedStyle(this).direction === 'rtl'
    const along = (
      box: { length: number; start: number },
      at: number,
      inline: boolean,
    ): number | undefined => {
      if (box.length === 0) {
        return undefined
      }
      const raw = ((at - box.start) / box.length) * 100
      return inline && rtl ? 100 - raw : raw
    }
    const mine = along(origin.outer, this.vertical ? event.clientY : event.clientX, !this.vertical)
    const theirs = along(
      origin.inner,
      origin.by.vertical ? event.clientY : event.clientX,
      !origin.by.vertical,
    )
    if (mine !== undefined) {
      this.moveTo(mine)
    }
    if (theirs !== undefined) {
      origin.by.moveTo(theirs)
    }
    this.leaveSeparator(event)
  }

  private readonly handleCornerUp = (event: PointerEvent): void => {
    const origin = this.cornerOrigin
    if (!origin) {
      return
    }
    const handle = event.currentTarget as HTMLElement
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId)
    }
    this.cornerOrigin = null
    this.moveTo(this.reached ?? this.position, true)
    origin.by.moveTo(origin.by.reached ?? origin.by.position, true)
    this.leaveSeparator(event)
  }

  /**
   * The corner takes every arrow, each moving the splitter whose axis it points
   * along, which is the only reading a keyboard can give a handle that moves in
   * two directions.
   */
  private readonly handleCornerKeydown = (event: KeyboardEvent): void => {
    const crossing = this.crossings[Number((event.currentTarget as HTMLElement).dataset.cross)]
    if (!crossing) {
      return
    }
    const inner = crossing.by
    const mineBack = this.vertical ? 'ArrowUp' : 'ArrowLeft'
    const mineForward = this.vertical ? 'ArrowDown' : 'ArrowRight'
    const theirsBack = inner.vertical ? 'ArrowUp' : 'ArrowLeft'
    const theirsForward = inner.vertical ? 'ArrowDown' : 'ArrowRight'

    if (event.key === mineBack || event.key === mineForward) {
      this.moveTo(this.position + (event.key === mineBack ? -this.step : this.step), true)
    } else if (event.key === theirsBack || event.key === theirsForward) {
      inner.moveTo(inner.position + (event.key === theirsBack ? -inner.step : inner.step), true)
    } else {
      return
    }
    this.leaveSeparator(event)
  }

  /**
   * Keeps a gesture on the corner to itself.
   *
   * The stop is not redundant with the corner being a sibling of the separator.
   * Should a press on the corner ever reach the separator, the separator calls
   * `setPointerCapture`, which retargets every later pointer event to *it*: the
   * corner's `pointerup` never arrives, its origin is never cleared, and it
   * goes on resizing with no button held. Worse than moving twice.
   *
   * `preventDefault` is needed either way: a drag across a pane would otherwise
   * select the text under it.
   */
  private leaveSeparator(event: Event): void {
    event.stopPropagation()
    event.preventDefault()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // Only on a re-connect. The first pass waits for `firstUpdated`, which is
    // where a parent is guaranteed to have upgraded.
    if (this.hasUpdated) {
      /* The width watch too, and it belongs here for a plainer reason than the
         one above: `disconnectedCallback` drops the observer on every move, so
         a splitter reordered in the DOM would stop watching its own width and
         `auto` would freeze on whatever it last saw. */
      this.watchWidth()
      this.findOuter()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.sizes?.disconnect()
    this.sizes = undefined
    this.outer?.uncross(this)
    this.outer = null
    this.crossedAt = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watchWidth()
    this.findOuter()
  }

  /** Keeps the corner in step while this divider moves under it. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('orientation')) {
      this.watchWidth()
    }
    /* The resolved collapse, mirrored for a consumer's own rules: a shut pane
       usually wants its contents to stop being read as well as stop being seen.
       `data-` and not `collapsed`, so a serialized host cannot be re-parsed with
       it declared, which is the trap `value` records. It carries which pane
       rather than a bare boolean, and that is still a state and not a payload:
       two names for the two sides, nothing of the consumer's in it. */
    if (this.collapsed) {
      this.dataset.collapsed = this.collapsed
    } else {
      delete this.dataset.collapsed
    }
    /* The resolved axis, mirrored for the same reason and on the same terms: a
       stylesheet selecting `[orientation="vertical"]` cannot see an `auto` that
       has turned, so the layout would stay side by side while the drag, the keys
       and `aria-orientation` had all gone the other way. That is the lie the
       policy warns a CSS-only version tells, arrived at from the other side.

       Only where `auto` produced it. An explicit `vertical` already carries an
       attribute saying so, and writing a second would put two sources of one
       truth on the host and a flash of the wrong axis before hydration. */
    if (this.orientation === 'auto' && this.stacked) {
      this.dataset.axis = 'vertical'
    } else {
      delete this.dataset.axis
    }
    /* `showing` rather than `position`, so a corner drawn on the splitter above
       follows this divider through a drag instead of catching up at the end. */
    if (this.outer && this.showing !== this.crossedAt) {
      this.crossedAt = this.showing
      this.outer.cross(this, this.showing)
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
  }

  protected override render(): TemplateResult {
    const position = this.showing
    /* The panes are marked while the divider moves, so the styled tier can take
       them out of the pointer's way.
       A pane holds whatever a consumer put in it, and an `<iframe>` is the case
       that breaks: a cross-origin frame is its own hit-testing world, and a drag
       whose path crosses one can be lost to it. The sandbox is exactly this, a
       sandboxed preview sitting against the panel divider, so the drag that
       makes the panel bigger is the drag that goes straight over it.
       On the panes rather than on the host, which the `dragging` state above
       records as a rule: a `data-` attribute here is one this element owns, and
       one on the host is one a React consumer's server markup never had. */
    return html`<div
        part="start"
        ?data-dragging=${this.dragging}
        style="--splitter-position: ${position}%"
      >
        <slot name="start"></slot>
      </div>
      <div
        part="separator"
        role="separator"
        tabindex="0"
        aria-label=${this.label}
        aria-orientation=${this.vertical ? 'horizontal' : 'vertical'}
        aria-valuemax=${this.clamp(this.maxPercent)}
        aria-valuemin=${this.clamp(this.minPercent)}
        aria-valuenow=${Math.round(position)}
        ?data-dragging=${this.dragging}
        ?data-flush=${this.flush}
        @dblclick=${this.handleDoubleClick}
        @keydown=${this.handleKeydown}
        @pointercancel=${this.handlePointerUp}
        @pointerdown=${this.handlePointerDown}
        @pointermove=${this.handlePointerMove}
        @pointerup=${this.handlePointerUp}
      ></div>
      <div part="end" ?data-dragging=${this.dragging}>
        <slot name="end"></slot>
      </div>
      ${this.crossings.map(
        (crossing, index) => html`<div
          part="corner"
          role="separator"
          tabindex="0"
          aria-label=${this.cornerLabel}
          aria-orientation=${crossing.by.vertical ? 'horizontal' : 'vertical'}
          aria-valuemax="100"
          aria-valuemin="0"
          aria-valuenow=${Math.round(crossing.at)}
          data-cross=${index}
          style="--splitter-corner-at: ${crossing.at}%; --splitter-position: ${position}%"
          @dblclick=${this.handleCornerDoubleClick}
          @keydown=${this.handleCornerKeydown}
          @pointercancel=${this.handleCornerUp}
          @pointerdown=${this.handleCornerDown}
          @pointermove=${this.handleCornerMove}
          @pointerup=${this.handleCornerUp}
        ></div>`,
      )}`
  }
}
