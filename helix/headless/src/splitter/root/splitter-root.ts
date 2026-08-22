import {
  capturePointer,
  customElement,
  HelixChangeEvent,
  HelixElement,
  requestControlledChange,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary Two panes and a divider the reader can move.
 *
 * @description
 * **One axis, and nesting is how you get two.** The sandbox this was taken from
 * moves a cross: a divider down the middle, another across the bottom, and a
 * corner that moves both. That is a layout rather than a component, and every
 * part of it that is worth sharing is one divider between two panes. A splitter
 * inside a splitter gives the cross back, and gives the three-pane and the
 * four-pane arrangements it never had.
 *
 * **Where two of them cross there is a corner, and it moves both.** A splitter
 * slotted into a pane of another, at right angles to it, has one end of its
 * divider sitting exactly on the other's. That end grows a handle: `move` under
 * the pointer, both arrow axes on the keyboard, and a drag that carries the two
 * positions at once.
 *
 * **The outer splitter draws it and the nested one announces itself upward.**
 * Built the other way round first, because a splitter already knows where its
 * own divider begins and needs no measurement of the other, and that version was
 * clipped: the crossing lies on the boundary between a pane and the divider
 * beside it, a handle centered there reaches back over the boundary, and a pane
 * is `overflow: auto`. Exactly half the corner was cut off. The outer separator
 * is the one element that already straddles the seam, so the corner belongs in
 * it.
 *
 * That makes the channel between the two a single call in a single direction:
 * `cross(child, at)` says where the child crosses, `moveTo` drives either one,
 * and neither reads the other's state. The child is what calls it, because a
 * parent cannot poll for a child that has not upgraded yet.
 *
 * The one number it carries is a percentage rather than a measurement, which is
 * what keeps either of them from measuring the other, and it assumes the nested
 * splitter fills its pane. That is what slotting one into a pane does. Give the
 * nested splitter its own inset, or wrap it in something smaller than the pane,
 * and the corner is drawn where the crossing would be rather than where it is.
 *
 * **It is a client-side enhancement and says so.** Finding the parent means
 * inspecting the tree, which a server cannot do, so the corner appears at
 * `firstUpdated` and never in the served markup. That is allowed for exactly
 * this: it is an affordance rather than content, and a splitter with no corner
 * yet is a splitter with two working dividers.
 *
 * Where two dividers are parallel there is no corner, because there is nothing
 * to take hold of. Where they cross without a corner, the inner divider takes
 * the pointer: every separator sits on the same layer, so a tie goes to document
 * order and a deeper splitter is always later.
 *
 * **A divider that is moving says so, whoever is moving it.** `:hover` cannot
 * carry that: a drag holds the pointer through capture and a fast one leaves the
 * target behind, and a corner moves the nested divider while the reader is on
 * the crossing, nowhere near it. So a drag in progress is a state, and both
 * dividers a corner moves are lit for as long as it moves them.
 *
 * **The divider is a real `role="separator"` with `aria-valuenow`, moved by the
 * arrow keys as well as by pointer.** A divider only a mouse can move is
 * unusable without one, which is the reason the sandbox's carries the same, and
 * `Home` and `End` take it to its bounds.
 *
 * **It goes where it is put, all the way to either end.** `min` and `max` are
 * nothing and everything unless a consumer says otherwise, because a divider
 * that stops dead short of the edge gives a reader no way to put a pane away.
 * Where a pane should keep a sliver of itself, only whoever put the tabs on it
 * knows how much, so they say so.
 *
 * **A pane can be shut, and that is not the same as a divider at the edge.**
 * The geometry is identical and the knowledge is not: only a shut pane knows
 * where to open back to. So `collapsed` is a second state rather than a reading
 * of the position, and the position it opens to is simply the one collapsing
 * never overwrote. `collapsed-size` keeps a sliver showing where a pane has a
 * tab strip worth leaving, and collapse overrides `min` and `max`, which is
 * what those are for: they keep a pane from vanishing by accident, and this is
 * the deliberate version.
 *
 * The two are kept in step in one direction only: a drag that settles on the
 * collapsed size latches shut, and any move opens it again. Otherwise a reader
 * could drag a pane closed and the consumer's own button would still be
 * offering to close it.
 *
 * A pane shut to nothing is told apart from one shut to a sliver, because the
 * two want different dividers: a sliver still has a boundary worth drawing, and
 * nothing leaves the divider sitting on the container's own edge.
 *
 * **The box is measured once, when a drag starts.** Measuring per move is a
 * forced layout on every pointer event, in the middle of a gesture whose whole
 * job is to stay ahead of the pointer, and nothing about the box moves while the
 * divider does.
 *
 * **`helix-change` fires when it settles, not while it moves.** A drag is a
 * stream of positions and only the one it ends at is a preference; announcing
 * each would ask a consumer to write to storage a hundred times to record one
 * decision. Nothing is stored here either: where a preference lives, and whether
 * it should be kept at all, is the consumer's to decide, and a component writing
 * to storage on its own would be deciding for all of them under a key it chose.
 *
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
 *
 * @since 0.1.0
 * @status experimental
 * @category layout
 * @aliases SplitPane, Resizable, SplitView
 * @documentation https://helix.fusion.dev/components/splitter
 *
 * @slot start - The pane before the divider.
 * @slot end - The pane after it.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the divider settles, named `position` or `collapsed`.
 *
 * @csspart start - The box holding the first pane.
 * @csspart end - The box holding the second.
 * @csspart separator - The divider itself.
 * @csspart corner - The handle where two dividers cross, added on the client.
 *
 * @cssproperty --splitter-corner-at - Where a nested splitter crosses this one, as a percentage.
 * @cssproperty --splitter-position - Where the divider sits, as a percentage of the box.
 */
@customElement('helix-base-splitter')
export class HelixBaseSplitter extends HelixElement {
  /**
   * Which way the panes are laid out.
   *
   * `horizontal` is side by side with an upright divider between them, and
   * `aria-orientation` on that divider is therefore `vertical`: a separator's
   * orientation is the direction it is *drawn* in, not the axis it moves along,
   * so the two words are opposite each other here on purpose. The code had this
   * right and the sentence beside it said the reverse.
   *
   * Unset is horizontal and stays unset, so a reflected default cannot appear on
   * a host whose server output never had it.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Where the divider sits, as a percentage of the whole.
   *
   * Reading gives where it is; writing declares it the consumer's, and
   * `default-position` seeds one this element owns. The same accessor pair
   * `Pagination.page` and the calendar's `month` carry.
   *
   * @controlled helix-change
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
    /* The consumer has spoken, so the drag stops standing in for them.
       Without this the divider flashed back: `dragging` goes false on
       `pointerup`, `showing` fell straight back to the position they had set
       before the gesture, and it was drawn there for the frame it took them to
       answer the announcement. Snapping to where it started and then jumping to
       where it was dropped, on every drag. */
    this.reached = undefined
    this.requestUpdate('position', previous)
  }

  /** Where the divider starts, where nothing declared it. */
  @property({ attribute: 'default-position', type: Number })
  defaultPosition = 50

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
   *
   * @controlled helix-change
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

  /** Which pane starts shut, where nothing declared it. */
  @property({ attribute: 'default-collapsed' })
  defaultCollapsed?: 'end' | 'start'

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

  /** Nearest the divider may come to the start, as a percentage. */
  @property({ type: Number })
  min = 0

  /** Nearest it may come to the end. */
  @property({ type: Number })
  max = 100

  /** How far one arrow press moves it, as a percentage. */
  @property({ type: Number })
  step = 2

  /** Accessible name for the divider. */
  @property()
  label = 'Resize panes'

  /** Accessible name for the handle where two dividers cross. */
  @property({ attribute: 'corner-label' })
  cornerLabel = 'Resize both'

  /** The position, whoever set it, and `undefined` until somebody has. */
  private positionState: number | undefined = undefined

  /** Whether the consumer owns it, decided once and then fixed. */
  private positionMode: boolean | undefined = undefined

  private get positionIsControlled(): boolean {
    return this.positionMode === true
  }

  /** The collapse, whoever set it, and `undefined` until somebody has. */
  private collapsedState: 'end' | 'none' | 'start' | undefined = undefined

  /** Whether the consumer owns it, decided once and then fixed. */
  private collapsedMode: boolean | undefined = undefined

  private get collapsedIsControlled(): boolean {
    return this.collapsedMode === true
  }

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
   * whole gesture and the divider stayed where it was until the pointer came up
   * and the consumer answered: it jumped to the end rather than following the
   * hand. Reported as resizing that was not seamless and did not work as it had.
   *
   * So a drag draws itself. The number is not announced until it settles, which
   * is the rule that has not changed, and the consumer's answer takes over the
   * moment they give one. It is what the sandbox did for itself before it used
   * this component: write the size on every pointer move, tell anyone once.
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
  private crossings: Array<{ at: number; by: HelixBaseSplitter }> = []

  /** The splitter this one is nested in, once it has found it. */
  private outer: HelixBaseSplitter | null = null

  /** The last position announced upward, so an unchanged one costs nothing. */
  private crossedAt: number | undefined = undefined

  /** The two boxes a corner drag is measured against, taken once. */
  private cornerOrigin: {
    by: HelixBaseSplitter
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

  /*
   * The collapse a settled position amounts to, if any.
   *
   * So that a pane dragged shut and a pane shut by a consumer's button are the
   * same state. Left apart, a reader could drag the panel closed and the button
   * offering to reopen it would read as already open.
   *
   * No separate threshold. Landing on the collapsed size *is* the gesture, and
   * `clamp` puts every overshoot exactly on the bound, so the default of zero
   * latches on any drag that runs off the end.
   */
  /** The collapsed size, held inside the range a percentage can be. */
  private get sliver(): number {
    return Math.min(100, Math.max(0, this.collapsedSize))
  }

  /**
   * Whether the divider is against an edge with nothing beside it.
   *
   * Geometry, not state, which is the second answer here: it asked whether the
   * pane was `collapsed`, and a divider driven to the edge by a consumer setting
   * `position` is just as flush and drew a line anyway. What the stylesheet
   * needs to know is whether there is a pane on both sides, and that is a fact
   * about where the divider is however it got there.
   *
   * Still not the same question as `collapsed`: a pane shut to a sliver has a
   * boundary worth drawing, and one shut to nothing has the container's own edge
   * there instead.
   */
  private get flush(): boolean {
    return this.sliver === 0 && this.shutAt(this.position) !== undefined
  }

  private shutAt(position: number): 'end' | 'start' | undefined {
    const size = this.sliver
    if (position <= size) {
      return 'start'
    }
    return position >= 100 - size ? 'end' : undefined
  }

  /** Pulled between the bounds, which are the ends unless a consumer moved them. */
  private clamp(next: number): number {
    const min = Math.max(0, Math.min(100, this.min))
    const max = Math.max(min, Math.min(100, this.max))
    return Math.min(max, Math.max(min, Number.isFinite(next) ? next : min))
  }

  /** Public because a nested splitter compares axes with the one it is in. */
  get vertical(): boolean {
    return this.orientation === 'vertical'
  }

  /**
   * Asks to move, and applies it where the position is this element's to move.
   *
   * Not announced per step: `helix-change` is the settling, below. A drag that
   * announced every position would be asking a consumer to record a hundred
   * decisions to keep one.
   */
  private move(next: number): void {
    const wanted = this.clamp(next)
    /* Where the gesture has reached, recorded before anything decides whether to
       apply it. A controlled splitter applies nothing, so its `position` is
       whatever the consumer last said, and settling at *that* announces the
       number it already had: the drag ended where it began and the divider never
       moved. Reported as a splitter that could not be dragged at all, and it was
       every controlled one. The keyboard was fine because it computes its next
       position rather than reading it back. */
    this.reached = wanted
    if (wanted === this.position || this.positionIsControlled) {
      return
    }
    const previous = this.position
    this.positionState = wanted
    /* A divider that is moving is a pane that is opening, and a shut one is
       still draggable precisely so it can be. Silent, like the move itself:
       the settling below is what announces either. */
    if (!this.collapsedIsControlled) {
      this.collapsedState = 'none'
    }
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
    requestControlledChange({
      apply: (value) => {
        if (this.positionIsControlled) {
          return
        }
        const previous = this.position
        this.positionState = value
        this.requestUpdate('position', previous)
      },
      controlled: this.positionIsControlled,
      event: (value) => new HelixChangeEvent({ property: 'position', value: String(value) }),
      host: this,
      label: 'position',
      next: wanted,
      read: () => this.position,
    })
    if (shut !== this.collapsed) {
      /* Two values from one gesture, so two announcements. `ChangeDetail`
         carries a name for exactly this, and a consumer listening for one of
         them is not made to care about the other. */
      requestControlledChange({
        apply: (value) => {
          /* A consumer who owns `position` owns the geometry, and collapse is
             geometry: applied here it would win over the number they set, and
             `position` would report the edge forever after. Latched once by a
             drag, a controlled splitter could never be reopened by its own
             consumer. They collapse it by saying `collapsed`, like everything
             else they own. */
          if (this.collapsedIsControlled || this.positionIsControlled) {
            return
          }
          const previous = this.collapsed
          // Back to where the gesture started, so opening it again is a return
          // rather than a jump to the edge it was dragged against.
          if (value !== '' && this.opened !== undefined) {
            this.positionState = this.opened
          }
          this.collapsedState = value === '' ? 'none' : (value as 'end' | 'start')
          this.requestUpdate('collapsed', previous)
        },
        controlled: this.collapsedIsControlled,
        event: (value) => new HelixChangeEvent({ property: 'collapsed', value }),
        host: this,
        label: 'collapsed',
        next: shut ?? '',
        read: () => this.collapsed ?? '',
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
    /* Nothing moved, so nothing is announced.
       Every press on the divider used to settle, which dispatched a change
       carrying the position it already had: a plain click rewrote a consumer's
       stored value from a gesture that moved nothing. Harmless where the value
       round-trips exactly, and not where it does not, which is any consumer
       storing pixels and dividing by a box. */
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
   * *Corrected 18 Aug 2026. This said "both axes, always", on the reasoning
   * `KeyboardNavigationController` uses for a set of items: a reader who guesses
   * the wrong arrow gets nothing. The code has never done it, and measuring the
   * three tab stops of a nested pair is what turned that up, so the prose was
   * describing a decision nobody implemented.*
   *
   * *Leaving it as one axis, because nesting is what settles it. Taking all four
   * would mean `ArrowLeft` moving a horizontal divider up and down, which is not
   * a reader being helped past a guess, it is an arrow that does not go the way
   * it points. And the guess it was protecting against is answered better by the
   * corner: there, all four arrows are live and each moves the divider it points
   * along, which is the only place in a splitter where a second axis means
   * anything.*
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
      next = this.min
    } else if (event.key === 'End') {
      next = this.max
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
    /* `default-position`, not the position at first render, which is what this
       read and which is only the same thing when nobody owns the position. A
       consumer who does owns what it was on that first frame too, and theirs can
       be a number they cannot compute yet: the sandbox sizes its panel in pixels
       and has no box to divide by until it has rendered once, so the divider
       recorded "panel closed" as home and a double click on the crossing shut
       the panel instead of restoring it. Reported.

       Declared rather than remembered, so it is a value a consumer can state and
       change, and it needs no capture at all. */
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
   * It needs its own handler now. Inside the separator this came free by
   * bubbling, and moving the corner out to sit against the host for the stacking
   * reason took the double click with it: the divider reset and the crossing
   * did not. Reported.
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
  cross(by: HelixBaseSplitter, at: number): void {
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
  uncross(by: HelixBaseSplitter): void {
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
   * `parentElement` before `closest`, so a splitter does not find itself.
   */
  private findOuter(): void {
    const outer = this.parentElement?.closest<HelixBaseSplitter>(
      'helix-splitter, helix-base-splitter',
    )
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
   * The corner was a child of the separator first, and every one of its events
   * bubbled there, so the separator started its own drag from the same press.
   * That is worse than moving twice: the separator calls `setPointerCapture`,
   * which retargets every later pointer event to *it*, so the corner's
   * `pointerup` never arrived, its origin was never cleared, and it went on
   * resizing with no button held. Reported as resizing without a press.
   *
   * The corner is a sibling now, for the stacking reason in the stylesheet, so
   * nothing reaches the separator by bubbling. This stays because the fix should
   * not depend on where the element happens to sit, and `preventDefault` is
   * still needed either way: a drag across a pane would otherwise select the
   * text under it.
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
      this.findOuter()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.outer?.uncross(this)
    this.outer = null
    this.crossedAt = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.findOuter()
  }

  /** Keeps the corner in step while this divider moves under it. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
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
    /* `showing` rather than `position`, so a corner drawn on the splitter above
       follows this divider through a drag instead of catching up at the end. */
    if (this.outer && this.showing !== this.crossedAt) {
      this.crossedAt = this.showing
      this.outer.cross(this, this.showing)
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Only the first time, before anything reads it. See `MixinControllerOpen`.
    if (this.positionMode === undefined) {
      this.positionMode = this.positionState !== undefined
    }
    if (this.collapsedMode === undefined) {
      this.collapsedMode = this.collapsedState !== undefined
    }
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
        aria-valuemax=${this.clamp(this.max)}
        aria-valuemin=${this.clamp(this.min)}
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
