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

  /**
   * Told the placement the surface landed on, after every measurement. Passed
   * through to the floating pass, which says why a host would want it.
   */
  onPlace?: (placement: Placement) => void

  /**
   * Whether the host wants the surface up, read after every update.
   *
   * **The open state is a property, and a consumer may set it directly**, so
   * raising the surface from a `show()` method alone leaves a panel opened by
   * declaring `open` visible, out of the top layer and unanchored: every
   * imperative path works and every declarative one is half-open. Ten
   * families wrote the same `if (this.open) show() else hide()` into their
   * `updated()` for that reason, and this is that paragraph once.
   *
   * After the update and never before it, because the render has to have
   * been written: until then the surface is still `display: none` and
   * `showPopover` on it measures zeroes. A controller's `hostUpdated` runs
   * after the commit and before the host's own `updated`, so a host that has
   * to act on a surface that is up, focusing into it or centering a wheel,
   * finds it up.
   *
   * Left unset, the host drives `show()` and `hide()` itself.
   */
  open?: () => boolean

  /** Preferred side. It moves if that side does not fit. */
  placement?: Placement | (() => Placement)

  /** The panel that floats. */
  surface: () => HTMLElement | null | undefined
}

/**
 * A surface that floats against something, in the top layer, until dismissed.
 *
 * Bundles the three things that always travel together: the popover API, a
 * `FloatingController` and a `DismissController`.
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
      ...(options.onPlace === undefined ? {} : { onPlace: options.onPlace }),
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

  /** Puts the surface where the host's `open` says, however it got there. */
  hostUpdated(): void {
    const wanted = this.options.open?.()
    if (wanted === undefined) {
      return
    }
    if (wanted) {
      this.show()
    } else {
      this.hide()
    }
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
         actually wrong. */
      if (!surface.hasAttribute('popover')) {
        throw new Error(
          'PopoverController: the surface needs a `popover` attribute to reach the top layer',
        )
      }
      surface.showPopover()
    }
    if (this.places) {
      this.floating.start()
    } else {
      this.floating.release()
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

  /*
   * Forgets that it was showing, and nothing more, which is the whole job.
   *
   * An element removed while its popover is showing is taken out of the top
   * layer by the platform. The two controllers watching it stop themselves:
   * both were constructed against this same host and registered with it, so Lit
   * calls each one's own `hostDisconnected`, and `autoUpdate` in particular
   * releases the listeners it holds on every scrolling ancestor there.
   *
   * Stopping them from here as well would be the same call twice. What is left
   * is the flag, which nothing else owns, and which has to be cleared or a host
   * reconnected to the page believes it is still open and refuses to show.
   */
  hostDisconnected(): void {
    this.shown = false
  }
}
