import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  type Middleware,
  offset,
  type Side,
  shift,
  size,
} from '@floating-ui/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

export type { Side }

/**
 * Where a panel lands against its anchor: a side, optionally aligned to an end
 * of it.
 *
 * **Ours, written out, rather than Floating UI's under a re-export.** Theirs is
 * `Prettify<Side | AlignedPlacement>` where `AlignedPlacement` is the template
 * literal `` `${Side}-${Alignment}` ``, and a template literal is not something a
 * reader of this source can expand: the manifest records a property's type as
 * the text somebody wrote, so five families published `placement` as the bare
 * word `Placement` and their reference pages listed no values at all. Written
 * here the twelve are in the text, which every reader of these sources resolves
 * without a type system.
 *
 * **And a public attribute should not be defined by a dependency.** Floating UI
 * adding a placement would widen five components' published API with nobody
 * deciding to, which is the same argument that keeps a `variant` union out of a
 * shared type. The two are held equal in this controller's spec, where a type
 * assertion is a test and is typechecked like one, so the day theirs widens is
 * a failed build rather than a quiet change out there.
 */
export type Placement =
  | 'bottom'
  | 'bottom-end'
  | 'bottom-start'
  | 'left'
  | 'left-end'
  | 'left-start'
  | 'right'
  | 'right-end'
  | 'right-start'
  | 'top'
  | 'top-end'
  | 'top-start'

/** The panel's edge facing its anchor, for each side of it the panel can land on. */
const FACING: Record<Side, Side> = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' }

/**
 * The panel's largest corner radius, which is how far its arrow has to stay
 * from either end.
 *
 * **Without it the arrow is correctly aimed and looks wrong.** Floating UI
 * centers the arrow on the anchor, and on a small trigger that center is inside
 * the panel's own corner: the arrow's base meets the curve instead of a straight
 * run and its outer flank is cut by it. Measured against a 4px radius and an 8px
 * arrow, a 14px trigger put the arrow's near flank 1.5px from the panel's edge
 * and a 20px trigger put it at 4.3px, so anything narrower than the arrow plus
 * two radii is broken by construction. An icon beside a heading is the ordinary
 * way to be under that.
 *
 * `padding` is what Floating UI's `arrow` middleware takes for exactly this, and
 * its own guidance for a rounded surface is the border radius.
 *
 * **Measured rather than named**, so a family that rounds itself differently is
 * right without telling this controller. Reading a token here would put a value
 * from `helix/styles` into a tier that must not name one, and would still be
 * wrong for any component that overrides its own radius. The four corners rather
 * than one, because they can differ and the arrow travels along two of them; the
 * largest clears all of them.
 *
 * A percentage is refused rather than guessed at: it resolves against the box,
 * which is the thing being positioned.
 */
const corner = (floating: HTMLElement): number => {
  const style = getComputedStyle(floating)
  const corners = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ]
  let largest = 0
  for (const each of corners) {
    if (!each.endsWith('px')) {
      continue
    }
    const value = Number.parseFloat(each)
    if (Number.isFinite(value) && value > largest) {
      largest = value
    }
  }
  return largest
}

export interface FloatingOptions {
  /** The element being pointed at. */
  anchor: () => HTMLElement | null | undefined

  /**
   * An element to point at the anchor, positioned against whichever side the
   * floating element landed on.
   */
  arrow?: () => HTMLElement | null | undefined

  /** The element being placed. */
  floating: () => HTMLElement | null | undefined

  /**
   * Whether to try another side when the preferred one does not fit.
   *
   * On by default. A menu that opens off the bottom of the window is one the
   * reader cannot use.
   */
  flip?: boolean

  /**
   * Told the placement the element landed on, after every measurement, and
   * how wide the window leaves it room to be.
   *
   * `data-placement` already says the side, on the floating element, which is
   * inside the host's shadow root. A stylesheet outside reaches that element
   * through `::part()`, and `::part()` cannot be followed by an attribute
   * selector, so a host whose surface is drawn from outside records the side on
   * itself.
   *
   * The room is in pixels, and absent where `resize` is off. It is for a host
   * that changes what it shows to fit, which a stylesheet cannot do when what
   * changes is markup: Date Input shows one month instead of two.
   */
  onPlace?: (placement: Placement, room: number | undefined) => void

  /**
   * Space between the anchor and the floating element, in pixels.
   *
   * A function where it can change. Options are read at construction, and a
   * host's own properties are still at their class defaults then, before any
   * attribute has been parsed.
   */
  offset?: number | (() => number)

  /**
   * Preferred placement. Defaults to `bottom-start`.
   *
   * A function where it can change. Passing the host's property directly reads
   * it at construction, when it is still the class default, so every instance
   * gets the same placement whatever its markup said.
   */
  placement?: Placement | (() => Placement)

  /**
   * Whether to cap the floating element to the space available.
   *
   * On by default, written as `--floating-available-block-size` and
   * `--floating-available-width` rather than as a height. A list decides for
   * itself whether to scroll or to shrink; a controller that sets the height
   * has decided that for every element it places.
   */
  resize?: boolean

  /** Whether to slide along the side to stay in view. On by default. */
  shift?: boolean

  /**
   * A box to keep the surface inside, instead of the viewport.
   *
   * Applied to `shift` and to nothing else, which is the whole of the design.
   * `shift` slides the surface along the axis it is *not* placed on, so for a
   * bubble above its anchor this clamps x and leaves y alone, and a chart can
   * say "stay within my own width" without also saying "stay within my own
   * height", which would jam the bubble inside the drawing.
   *
   * Giving the same box to `flip` or `size` says the second thing. A tooltip
   * above a reading almost never fits above it *within the chart*, so `flip`
   * would send every one of them below the point, and `size` would compute an
   * available height of nearly nothing and squash the box. Both were tried.
   */
  within?: () => Element | null | undefined
}

/**
 * How wide a panel that matches its anchor is drawn: the anchor's width, no
 * wider than the room the panel has inside the window's margins.
 *
 * **A trigger as wide as the window gave a list as wide as the window**, and
 * `shift` keeps a margin it then cannot keep: a Select spanning a phone with no
 * gutter opened its list 8 pixels past the end edge, on both sides of the
 * window at once. The room is Floating UI's `availableWidth` after the shift,
 * so a panel that fits is the anchor's width exactly, as before.
 */
export const matchedInlineSize = (anchor: number, room: number): number =>
  Math.round(Math.max(0, Math.min(anchor, room)))

/**
 * Places one element against another, and keeps it there.
 *
 * Positioning is `@floating-ui/dom` rather than arithmetic written here. Two
 * things in particular are why. A `position: fixed` element inside an ancestor
 * carrying `transform`, `filter`, `will-change`, or `contain` is positioned
 * against that ancestor and not the viewport, so viewport coordinates land it
 * somewhere else entirely. And an overlay has to clear its nearest *clipping*
 * ancestor, not just the window, or it is placed correctly inside a scrolling
 * panel and clipped out of sight by it. Both are ordinary here, and both are a
 * long tail of browser behavior rather than a formula.
 *
 * `autoUpdate` keeps the position through scrolling on any ancestor, resizes of
 * either element, and layout shifts.
 *
 * The side the element actually landed on is written back as `data-placement`,
 * so a styled tier can animate from it rather than from the side that was
 * asked for. An arrow is placed whole, on the edge facing the anchor, so no
 * stylesheet has to know which side that is to point it the right way.
 *
 * **The custom properties are declared here because this is what writes them.**
 * Each carries a measurement taken against the viewport that no stylesheet can
 * take for itself, and `core` ships no CSS, so there is no reader inside this
 * package and none of them is private. the `hooks` rule pairs a documented
 * hook with a rule that reads one, in both directions.
 *
 * @cssproperty --floating-anchor-inline-size - The anchor's width, for a panel that matches it, and never wider than the room the panel has inside the window's margins.
 * @cssproperty --floating-arrow-x - Where the arrow meets the anchor, from the panel's left edge in both text directions.
 * @cssproperty --floating-arrow-y - Where the arrow meets the anchor, from the panel's top edge.
 * @cssproperty --floating-available-block-size - How much room is left below, for a panel that scrolls.
 */
export class FloatingController implements ReactiveController {
  private readonly options: FloatingOptions
  private cleanup: (() => void) | undefined

  /**
   * Which run of placements the results coming back belong to.
   *
   * `computePosition` is async, so a measurement started before `stop()` still
   * resolves after it and would write its result onto a surface that had just
   * been taken down: the inline `position` and `translate` back on, and with
   * them `data-placed`, which is the attribute five families gate visibility
   * on. Opening and closing inside one task is all it takes, since the write
   * lands a microtask later.
   *
   * A counter rather than an `AbortController`, because there is nothing to
   * abort: the work is already done by the time the answer arrives and the only
   * question is whether anybody still wants it.
   */
  private run = 0

  constructor(host: ReactiveControllerHost & HTMLElement, options: FloatingOptions) {
    this.options = options
    // Registered so the host's disconnect releases the tracking, which is the
    // whole reason this is a controller rather than a function.
    host.addController(this)
  }

  /** The placement in use after the last measurement. */
  placement: Placement = 'bottom-start'

  /**
   * How far the arrow keeps from the floating element's ends, measured once.
   *
   * `autoUpdate` runs `update` on every scroll frame of every ancestor, and
   * `corner` is a `getComputedStyle` and four parses, which was a style read
   * per frame for a number that does not change while the surface is up. So it
   * is read as placing starts, when the surface has just been shown and has a
   * computed style to read, and forgotten as placing stops, so a surface
   * restyled between opens is measured again. `update` measures for itself
   * where nothing started it, which is a `reposition` on a surface placed by
   * its own stylesheet.
   */
  private padding: number | undefined

  /** Starts placing, and keeps placing until stopped. */
  start(): void {
    const anchor = this.options.anchor()
    const floating = this.options.floating()
    if (!anchor || !floating || this.cleanup) {
      return
    }
    this.padding = this.options.arrow?.() ? corner(floating) : 0
    this.cleanup = autoUpdate(anchor, floating, this.update)
  }

  /** Stops placing and releases everything it was tracking. */
  stop(): void {
    // Before the teardown, so a measurement already in flight is disowned
    // rather than racing the attribute removal below.
    this.run += 1
    this.cleanup?.()
    this.cleanup = undefined
    this.padding = undefined
    this.options.floating()?.removeAttribute('data-placed')
  }

  /**
   * Takes back what placing wrote, for a surface its own sheet places now.
   *
   * **One surface can be both**, which is why this exists: a megamenu is a card
   * its trigger places on a wide window and a band its sheet places on a narrow
   * one. Opened once as a card, it kept the card's edges and translate, and
   * inline declarations win over the band's own sheet, so the band opened at
   * the card's offset with no right edge to stretch to. `stop` leaves them on
   * purpose, since a panel transitioning out still has to be where it was.
   */
  release(): void {
    const floating = this.options.floating()
    if (!floating) {
      return
    }
    for (const one of [
      '--floating-anchor-inline-size',
      '--floating-arrow-x',
      '--floating-arrow-y',
      '--floating-available-block-size',
      'bottom',
      'left',
      'position',
      'right',
      'top',
      'translate',
    ]) {
      floating.style.removeProperty(one)
    }
    const pointer = this.options.arrow?.()
    for (const one of ['bottom', 'left', 'right', 'top']) {
      pointer?.style.removeProperty(one)
    }
    floating.removeAttribute('data-placement')
  }

  /** Measures both elements and writes the position. */
  readonly update = (): void => {
    const anchor = this.options.anchor()
    const floating = this.options.floating()
    if (!anchor || !floating) {
      return
    }
    const run = this.run

    const pointer = this.options.arrow?.()
    const gap =
      typeof this.options.offset === 'function' ? this.options.offset() : this.options.offset
    const preferred =
      typeof this.options.placement === 'function'
        ? this.options.placement()
        : this.options.placement
    const middleware: Middleware[] = [offset(gap ?? 0)]
    let room: number | undefined
    if (this.options.flip !== false) {
      const side = (preferred ?? 'bottom-start').split('-')[0]
      /* **A panel beside its anchor may leave for the axis across, and one
         above or below may not.** The asymmetry is the one `size` makes further
         down: it writes a block size and no inline one, so a panel on the block
         axis that has no room above or below shrinks into what there is and
         scrolls, which is how every list here copes. Nothing narrows a panel
         beside its anchor, so with neither side free it ran off the window:
         the tour's first stop, `right-start` against a rail as wide as a
         phone, tried `left-start`, found no room there either, and was drawn
         there anyway, measured at 390 wholly past the left edge. Leaving the
         block axis alone is also what keeps every menu, list and picker where
         it was.

         **`'end'`, so below first and above second.** For a side placement the
         axis across is the block axis, and below is where every surface here
         opens when nothing says otherwise, where the page goes on, and where
         the panel covers nothing the reader has already read. The block axis
         does not turn with the writing direction, so neither does this; the
         alignment does, and Floating UI resolves it: `right-start` in
         right-to-left text falls back to `bottom-start` on the anchor's right
         edge, which is its start.

         **`crossAxis: 'alignment'`, or the side is given up too readily.** By
         default an overflow along the side counts as not fitting as well, so
         a panel centered beside a target near the bottom of the window, which
         runs out below on the right and on the left alike, would jump above
         the target where `shift` would have slid it up and kept it beside.
         Measured against Floating UI with `right` 30px from the bottom of the
         window: above without this, beside with it. This way the axis is left
         only when every placement on it runs out of room on its main side,
         and choosing between `-start` and `-end` on one side reads the cross
         axis as it always did. */
      middleware.push(
        flip(
          side === 'left' || side === 'right'
            ? { crossAxis: 'alignment', fallbackAxisSideDirection: 'end' }
            : {},
        ),
      )
    }
    if (this.options.shift !== false) {
      const inside = this.options.within?.()
      middleware.push(shift({ padding: 8, ...(inside ? { boundary: inside } : {}) }))
    }
    if (this.options.resize !== false) {
      middleware.push(
        size({
          /* The height and not the width, which is asymmetric on purpose. A
             panel that runs out of room grows a scrollbar downwards and every
             rule reading this asks for a `max-block-size`; nothing asks for the
             inline twin, so writing it would be a `setProperty` on every
             reposition of every floating element for nobody. Declared and never
             read is a promise on the API page with nothing behind it. It comes
             back the day a rule wants it, together with that rule.

             The width is handed to `onPlace` instead, which costs nothing
             where nobody listens: a host that fits its contents to it is
             deciding markup, which no rule could do with a property. */
          apply: ({ availableHeight, availableWidth, elements, rects }) => {
            room = availableWidth
            elements.floating.style.setProperty(
              '--floating-available-block-size',
              `${Math.round(availableHeight)}px`,
            )
            /* The anchor's width, which a panel that has to match the control
               it hangs off cannot get any other way. `min-inline-size: 100%`
               reads the containing block, and this positions with
               `position: fixed`, so that percentage is the viewport: a select's
               list came out the full width of the window, flush to its left
               edge. It looked like a positioning fault and was a percentage
               resolving against something the CSS could not see. */
            elements.floating.style.setProperty(
              '--floating-anchor-inline-size',
              `${matchedInlineSize(rects.reference.width, availableWidth)}px`,
            )
          },
          padding: 8,
        }),
      )
    }
    if (pointer) {
      middleware.push(arrow({ element: pointer, padding: this.padding ?? corner(floating) }))
    }

    computePosition(anchor, floating, {
      middleware,
      placement: preferred ?? 'bottom-start',
      // `fixed` so the overlay clears an ancestor with `overflow: hidden`.
      // Floating UI resolves the containing block either way, so this is about
      // clipping rather than about which coordinates are correct.
      strategy: 'fixed',
    }).then(({ middlewareData, placement, x, y }) => {
      /* Stopped while this was being measured, so the answer is about a surface
         nobody is showing any more. Writing it would re-mark a closed panel as
         placed. */
      if (run !== this.run) {
        return
      }
      this.placement = placement
      /* **Physical, because the numbers are.** `x` is measured from the
         viewport's left edge whatever the writing direction, so the edge it is
         added to has to be the left one. Written as `inset-inline-start` it was
         the right edge on a right-to-left page, and every panel there landed a
         window's width past its anchor: the tour's first stop at x 1848 in a
         window 1280 wide.

         **The far edges said too, as `auto`.** The user agent gives a popover
         `inset: 0`, so a panel whose sheet leaves that standing has both a left
         and a right. Over-constrained, a box keeps the edge its containing
         block starts from and drops the other, which for the top layer is the
         root's direction: the left in English and the right in Arabic, where
         `left: 0` was then the value thrown away. `auto` on the far side leaves
         nothing to choose between, and takes the auto margins the same agent
         centers a popover with down to zero.

         **And `important`, which is the cascade's doing rather than a
         preference.** A sheet outside the shadow root reaches the panel through
         `::part()`, and for normal declarations the outer tree's win over the
         inner tree's, inline ones included. The headless previews say
         `inset: auto` there, to undo the user agent's centering, and with it
         standing the panel sat at its static position, the viewport's start
         corner: the left in English, where that happened to be right, and the
         right in Arabic. Nothing else has a claim on these four, since a
         surface its own sheet places opts out with `place: false`. */
      for (const [edge, value] of [
        ['bottom', 'auto'],
        ['left', '0'],
        ['right', 'auto'],
        ['top', '0'],
      ] as const) {
        floating.style.setProperty(edge, value, 'important')
      }
      Object.assign(floating.style, {
        position: 'fixed',
        // A translate rather than insets, so the position never lands on a
        // subpixel boundary and blurs the text inside it.
        //
        // **The `translate` property, not `transform`.** They are not
        // interchangeable here. The individual properties compose ahead of
        // `transform`, so a panel that also sets `scale` for an entrance ends
        // up with `scale() translate()`, and a concatenation applies its right
        // hand side first: the position is computed and *then* multiplied by
        // the scale factor. A tooltip 600px down the page scaling from 0.9
        // therefore opens 60px out of place and slides into position, and one
        // scaling from 0 flies in from the viewport corner. As `translate` it
        // composes as `translate() scale()`, the offset is applied in the
        // parent's coordinates, and the scale cannot reach it.
        /* **Written as viewport coordinates, which is what they are.**
         *
         * `computePosition` returns a position in the viewport and this element
         * is `position: fixed`, so the two agree and the translate is the answer
         * unmodified. **Never subtract an ancestor's origin from it.**
         *
         * A surface landing hundreds of pixels from its anchor looks like an
         * ancestor stealing the containing block, which `transform`, `filter`
         * and `backdrop-filter` all do to a `fixed` descendant. Check the edges
         * first: the UA stylesheet's `inset: 0` and `margin: auto` sat a
         * headless tooltip with no sheet of its own mid-viewport, and put every
         * panel on a right-to-left page a window's width out, until the far
         * edges above were written as `auto`. A correction added for either
         * subtracts a real ancestor's origin from an already correct number and
         * throws every tooltip on the page off by it. */
        translate: `${Math.round(x)}px ${Math.round(y)}px`,
      })

      floating.setAttribute('data-placement', placement)
      /* Placed, and it is a separate fact from shown. `computePosition` is
         async, so between the render that reveals a panel and the microtask
         that positions it there is a frame where the panel is visible at
         whatever its stylesheet said, which for an absolutely positioned one
         with no offsets is its host's top-left. Measured on the select: the
         panel appeared 24px up and to the left of the trigger for one frame on
         the first open, and looked correct on every open after, because the
         inline styles from last time were still on it.

         A panel that wants to fade in on placement selects on this. Nothing
         has to. */
      floating.setAttribute('data-placed', '')
      this.options.onPlace?.(placement, room === undefined ? undefined : Math.floor(room))

      const point = middlewareData.arrow
      if (pointer && point) {
        /* **All four edges, so the arrow faces its anchor whatever sheet draws
           it.** Floating UI measures the arrow's offset along the edge from the
           panel's left and top, physical for the reason the panel is. The edge
           it hangs off is the one facing the anchor, across from the side the
           panel landed on, and it used to be the stylesheet's to choose from
           `data-placement`. Only a sheet inside the shadow root can read that:
           a document sheet reaches the arrow through `::part()`, which nothing
           can follow with an attribute, so every headless example pinned its
           arrow to the bottom edge for a `top` placement, and a bubble that
           flipped below its anchor pointed away from it.

           **Half the arrow's own box outward, which centers it on that edge.**
           Not a custom property: the size is `--tooltip-arrow-size` in one
           family, `--tour-arrow-size` in another and a bare `0.5rem` in a
           headless sheet, and `core` naming a tier's hook is the dependency the
           tiers exist to prevent. The box is what whichever sheet it was has
           already decided, border included, every shadow root here being
           `border-box`, and it is read below for `--floating-arrow-x` anyway.
           `offsetWidth` rather than a rect, which reports the rotated box.

           **`important`, and the other edges `auto`, for the panel's reasons
           above.** A document sheet's normal declarations through `::part()`
           outrank inline ones, so an edge pinned there still won, and two
           opposite edges both set leave the writing direction to decide which
           one counts. */
        const facing = FACING[placement.split('-')[0] as Side]
        const reach =
          (facing === 'left' || facing === 'right' ? pointer.offsetWidth : pointer.offsetHeight) / 2
        const edges: Record<Side, string> = {
          bottom: 'auto',
          left: point.x === undefined ? 'auto' : `${point.x}px`,
          right: 'auto',
          top: point.y === undefined ? 'auto' : `${point.y}px`,
        }
        edges[facing] = `${-reach}px`
        for (const [edge, value] of Object.entries(edges)) {
          pointer.style.setProperty(edge, value, 'important')
        }
        /* Where the pointer ended up, as the center of it, published for
           anything that has to grow out of the thing it points at.
         *
         * A panel scaling in wants its `transform-origin` on its own arrow, and
         * the arrow is not reliably where the placement says: `top-start` puts
         * it near one end, and `shift` slides it anywhere along the edge to
         * keep the panel on screen. Selecting on `data-placement` alone gets
         * the axis right and the position wrong, which reads as the panel
         * growing out of a point next to the trigger rather than out of it.
         *
         * Only the axis the arrow travels on is written. On a `top` placement
         * the arrow moves horizontally and its vertical position is the panel's
         * edge, so `--floating-arrow-y` is left unset and a consumer's fallback
         * stands. Cleared rather than zeroed when absent, so the fallback in
         * `var()` is what applies. */
        floating.style.setProperty(
          '--floating-arrow-x',
          point.x === undefined ? '' : `${Math.round(point.x + pointer.offsetWidth / 2)}px`,
        )
        floating.style.setProperty(
          '--floating-arrow-y',
          point.y === undefined ? '' : `${Math.round(point.y + pointer.offsetHeight / 2)}px`,
        )
      }
    })
  }

  hostDisconnected(): void {
    this.stop()
  }
}
