import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { DismissController } from '../dismiss-controller/dismiss-controller.js'
import { FloatingController, type Placement } from '../floating-controller/floating-controller.js'

export interface PopoverOptions {
  /** The element the surface opens against. */
  anchor: () => HTMLElement | null | undefined

  /**
   * The element that points at the anchor, where the surface has one.
   *
   * Passed through to the floating pass, which positions it against whichever
   * side the surface ended up on. Optional because most surfaces have none: a
   * menu and a select are read as belonging to the control they hang off, and
   * only a bubble has to say which thing it is describing.
   */
  arrow?: () => HTMLElement | null | undefined

  /**
   * What counts as inside for the purpose of a press landing elsewhere.
   *
   * Defaults to the surface. A host that draws no box of its own points this at
   * itself instead, so a press on its trigger is inside rather than out.
   */
  boundary?: () => Element | readonly (Element | null | undefined)[] | null | undefined

  /** Space between the anchor and the surface, in pixels. */
  offset?: number | (() => number)

  /**
   * A box to keep the surface inside, instead of the viewport.
   *
   * Not `boundary` above, and the two are easy to confuse: that one decides
   * what counts as inside for a *press*, and this one decides what counts as
   * inside for the *placement*. A tooltip on a chart wants the second and has
   * no use for the first.
   */
  within?: () => Element | null | undefined

  /**
   * Whether to measure the anchor and place the surface against it.
   *
   * On unless said otherwise, which is every surface that hangs off something:
   * a menu, a select, a tooltip. Off is for a surface whose position is a fact
   * about the page rather than about its trigger, and the one that asked for
   * it is a full-bleed navigation panel: it spans the viewport and sits under
   * the header, so there is nothing to measure and nothing to flip or shift
   * to. Placing it anyway wrote a `translate` of the trigger's own offset over
   * a band that is meant to start at the edge.
   *
   * The rest still applies, which is why this is an option here rather than a
   * reason to do without the controller: the top layer and the dismissal are
   * exactly what such a panel needs, and they are what this bundles. What it
   * gives up is the measuring pass, and the surface's own stylesheet says where
   * it goes.
   */
  place?: boolean | (() => boolean)

  /**
   * Called when a press outside or an Escape asks for it to close.
   *
   * The host decides what closing means, because it is the only thing that
   * knows what else has to happen: a menu forgets which page it was on, a
   * select puts focus back on its trigger, and a tooltip does neither.
   */
  onDismiss: () => void

  /** Preferred side. It moves if that side does not fit. */
  placement?: Placement | (() => Placement)

  /** The panel that floats. */
  surface: () => HTMLElement | null | undefined
}

/**
 * A surface that floats against something, in the top layer, until dismissed.
 *
 * Three things always travel together and were written out longhand three
 * times: the popover API, a `FloatingController` and a `DismissController`.
 * Individually each is small, which is exactly why the copies drifted rather
 * than being noticed. **`Select` never called `showPopover` at all**, so its
 * list was an ordinary positioned panel and any ancestor with `overflow:
 * hidden` clipped it, while a menu two folders away in the same position did
 * not. That is not a difference anyone chose.
 *
 * **The top layer is the whole point.** A floating panel has to escape every
 * clipping ancestor between it and the page, and `position: fixed` does not do
 * that: it is clipped by `overflow` on any ancestor and re-anchored entirely by
 * an ancestor carrying `transform`, `filter` or `contain`. The popover API
 * lifts the element out of the tree's paint order for real, and it is the only
 * thing that does.
 *
 * `manual` rather than `auto`, because the host owns dismissal. `auto`
 * popovers light-dismiss themselves and close each other, which is close to
 * what is wanted and not the same: a select that closed itself before its own
 * change event landed, or a submenu that closed its parent, are both things the
 * platform would do here and neither is right.
 *
 * **The order matters on the way up.** `showPopover` first, then position:
 * measuring an element that is still `display: none` gives zeroes, so a surface
 * positioned before it is shown lands at the origin and slides into place on
 * the next frame. On the way down it is the reverse, and stopping the observer
 * before hiding avoids a final measurement of an element on its way out.
 *
 * What this does not own is *when*. Opening is the host's, because a menu opens
 * on click, a tooltip on hover and a select on either, and none of that is
 * about surfaces.
 */
export class PopoverController implements ReactiveController {
  private readonly options: PopoverOptions

  private readonly floating: FloatingController

  private readonly dismisser: DismissController

  /** Whether the surface is currently shown, so the calls can be idempotent. */
  private shown = false

  constructor(host: ReactiveControllerHost & HTMLElement, options: PopoverOptions) {
    this.options = options
    this.floating = new FloatingController(host, {
      anchor: options.anchor,
      ...(options.arrow === undefined ? {} : { arrow: options.arrow }),
      floating: options.surface,
      ...(options.offset === undefined ? {} : { offset: options.offset }),
      ...(options.placement === undefined ? {} : { placement: options.placement }),
      ...(options.within === undefined ? {} : { within: options.within }),
    })
    this.dismisser = new DismissController(host, {
      boundary: options.boundary ?? options.surface,
      onDismiss: options.onDismiss,
    })
    host.addController(this)
  }

  /** Whether the surface is showing. */
  get open(): boolean {
    return this.shown
  }

  /** Whether this one is placed by measurement, read fresh so it may change. */
  private get places(): boolean {
    const asked = this.options.place
    if (asked === undefined) {
      return true
    }
    return typeof asked === 'function' ? asked() : asked
  }

  /**
   * Shows the surface, positions it, and starts listening for a way out.
   *
   * Safe to call when already open, so a host may call it from whatever
   * combination of a property, an event and a command it likes without keeping
   * track of which one got there first.
   */
  show(): void {
    const surface = this.options.surface()
    if (this.shown || !surface) {
      return
    }
    this.shown = true
    /* Feature-detected rather than assumed. The popover API is recent enough
       that a browser without it should still get a positioned panel, which is
       what every one of these was before the API existed: worse, because it can
       be clipped, and not broken. */
    if (typeof surface.showPopover === 'function') {
      /* And said plainly where the surface is not one. `showPopover` on an
         element with no `popover` attribute throws `NotSupportedError`, from
         inside the promise the host called this in, so it surfaces as an
         unhandled rejection naming a method rather than as the thing that is
         actually wrong. Which is how `Select` looked for as long as it was
         broken: no error at all, just a panel that could be clipped. */
      if (!surface.hasAttribute('popover')) {
        throw new Error(
          'PopoverController: the surface needs a `popover` attribute to reach the top layer',
        )
      }
      surface.showPopover()
    }
    if (this.places) {
      this.floating.start()
    }
    this.dismisser.activate()
  }

  /** Hides the surface and stops everything watching it. */
  hide(): void {
    const surface = this.options.surface()
    if (!this.shown) {
      return
    }
    this.shown = false
    this.dismisser.deactivate()
    this.floating.stop()
    surface?.hidePopover?.()
  }

  /** Whichever of the two the surface is not already doing. */
  toggle(): void {
    if (this.shown) {
      this.hide()
    } else {
      this.show()
    }
  }

  /*
   * Leaves the top layer when the host does.
   *
   * An element removed while its popover is showing is removed from the top
   * layer by the platform, but the controllers watching it are this host's to
   * stop, and `autoUpdate` in particular holds listeners on every scrolling
   * ancestor of something no longer in the document.
   */
  /**
   * Places the surface again, for an anchor that moved without the page moving.
   *
   * `autoUpdate` watches scrolling, resizing and layout shift, which covers
   * everything that moves an anchor *with* its surroundings. It does not cover
   * an absolutely positioned anchor being moved by an inline style, and that is
   * exactly what a chart does: the mark walks from reading to reading while the
   * page holds still, so the bubble was placed once and stayed there.
   */
  reposition(): void {
    this.floating.update()
  }

  hostDisconnected(): void {
    this.shown = false
  }
}
