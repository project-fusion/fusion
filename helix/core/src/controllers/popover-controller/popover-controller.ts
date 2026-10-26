import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { DismissController } from '../dismiss-controller/dismiss-controller.js'
import { FloatingController, type Placement } from '../floating-controller/floating-controller.js'
import { PresentationController } from '../presentation-controller/presentation-controller.js'
import { Scrim } from './scrim.js'

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

  /**
   * What the open surface does to a tooltip outside it.
   *
   * `hide`, the default, closes a tooltip showing outside the surface as it
   * opens, and keeps tooltips outside it closed until it closes. A tooltip
   * inside it still shows. `keep` leaves them alone, for a surface that is a
   * tooltip itself or that stays up while the reader goes on using the page,
   * such as a tour's stop.
   */
  hints?: 'hide' | 'keep'

  /** Space between the anchor and the surface, in pixels. */
  offset?: number | (() => number)

  /** Whether the surface may move to the other side to fit. On by default. See `FloatingController`. */
  flip?: boolean | (() => boolean)

  /** How far to slide the surface along its side, in pixels. See `FloatingController`. */
  crossOffset?: number | (() => number)

  /** How close to the window's edges the surface may come, in pixels. See `FloatingController`. */
  padding?: number | (() => number | undefined)

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
   *
   * **Read again after each update while the surface shows**, so a panel that
   * turns into a sheet as the window narrows, as `PresentationController`
   * tells its host, lets go of its anchor, and one that turns back is placed
   * again. A surface its own stylesheet places is `data-placed` as it shows,
   * so an entrance gated on that attribute runs for it too.
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
   * Told the placement the surface landed on, after every measurement, and how
   * wide the window leaves it room to be. Passed through to the floating pass,
   * which says why a host would want either.
   */
  onPlace?: (placement: Placement, room: number | undefined) => void

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

  /**
   * The presentation the host asks for, `auto`, `popover`, or `sheet`, for a
   * panel that may be a sheet along the window's bottom edge: under `auto` in
   * a window narrower than 30rem, as `PresentationController` decides it and
   * a phone's layer does. **A sheet is placed by its own stylesheet**, as
   * `place` false is, and the host is told each turn in `onPresent`, where it
   * sets its `sheet` state. **A press beside a sheet stops at its scrim**:
   * it closes the sheet through `onDismiss` and reaches nothing under it, as
   * `Scrim` says. Beside a popover, a press closes the panel and reaches the
   * page. Left unset, the surface is never a sheet.
   */
  presentation?: () => unknown

  /** Told each time the surface turns between a sheet and a popover, and once as the host connects. */
  onPresent?: (sheet: boolean) => void

  /** The panel that floats. */
  surface: () => HTMLElement | null | undefined
}

/**
 * The surfaces open on the page that tooltips outside them yield to, in the
 * order they opened, and who to tell when one opens.
 *
 * On `globalThis` under a `Symbol.for` key, so two copies of this module on one
 * page share it, for the reason `DismissController` gives about its own.
 */
interface OpenPanels {
  open: Set<HTMLElement>
  watchers: Set<(surface: HTMLElement) => void>
}
const PANELS = Symbol.for('fusion.helix.open-panels')
const openPanels = (): OpenPanels => {
  const globals = globalThis as unknown as Record<symbol, OpenPanels | undefined>
  globals[PANELS] ??= { open: new Set(), watchers: new Set() }
  return globals[PANELS]
}

/**
 * The slot an element is drawn in, where its parent has a shadow root.
 *
 * Looked up by name where `assignedSlot` is missing, as it is in a test DOM, so
 * the walk below takes the same path there as in a browser.
 */
const slotOf = (node: Node): Node | null => {
  const element = node as Partial<Element>
  if (element.assignedSlot) {
    return element.assignedSlot
  }
  const root = (node.parentNode as Partial<Element> | null)?.shadowRoot
  if (!root || typeof element.getAttribute !== 'function') {
    return null
  }
  const name = element.getAttribute('slot')
  return root.querySelector(
    name ? `slot[name="${name.replaceAll('"', '\\"')}"]` : 'slot:not([name])',
  )
}

/**
 * Whether `node` is drawn inside `container`, following slots, so a row in a
 * menu's light DOM is inside the surface in the menu's shadow root.
 */
const drawnInside = (container: Node, node: Node): boolean => {
  let at: Node | null = node
  while (at) {
    if (at === container) {
      return true
    }
    at = slotOf(at) ?? at.parentNode ?? (at as unknown as { host?: Node }).host ?? null
  }
  return false
}

/**
 * Whether a tooltip at `element` may show: no surface is open, or the last one
 * to open holds it. A tooltip outside an open menu or popover would sit over
 * the panel the reader is using.
 */
export function hintMayShow(element: Element): boolean {
  const open = [...openPanels().open]
  const last = open.at(-1)
  return last === undefined || drawnInside(last, element)
}

/**
 * Calls `watcher` with each surface that opens and hides the tooltips outside
 * it. Returns the call that stops it.
 */
export function onPanelOpen(watcher: (surface: HTMLElement) => void): () => void {
  const { watchers } = openPanels()
  watchers.add(watcher)
  return () => watchers.delete(watcher)
}

/** Whether `element` is drawn inside `surface`, following slots. */
export function hintInside(surface: HTMLElement, element: Element): boolean {
  return drawnInside(surface, element)
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

  /** The surface tooltips outside it yield to, while it is open. */
  private held: HTMLElement | undefined

  private readonly host: ReactiveControllerHost & HTMLElement

  constructor(host: ReactiveControllerHost & HTMLElement, options: PopoverOptions) {
    this.options = options
    this.host = host
    this.floating = new FloatingController(host, {
      anchor: options.anchor,
      ...(options.arrow === undefined ? {} : { arrow: options.arrow }),
      floating: options.surface,
      ...(options.offset === undefined ? {} : { offset: options.offset }),
      ...(options.crossOffset === undefined ? {} : { crossOffset: options.crossOffset }),
      ...(options.flip === undefined ? {} : { flip: options.flip }),
      ...(options.padding === undefined ? {} : { padding: options.padding }),
      ...(options.onPlace === undefined ? {} : { onPlace: options.onPlace }),
      ...(options.placement === undefined ? {} : { placement: options.placement }),
      ...(options.within === undefined ? {} : { within: options.within }),
    })
    this.dismisser = new DismissController(host, {
      boundary: options.boundary ?? options.surface,
      onDismiss: options.onDismiss,
    })
    const asked = options.presentation
    this.presenting =
      asked === undefined
        ? undefined
        : new PresentationController(host, {
            asked,
            changed: (sheet) => options.onPresent?.(sheet),
          })
    this.scrim =
      asked === undefined
        ? undefined
        : new Scrim({
            holds: (layer) => drawnInside(layer, host),
            onPress: options.onDismiss,
            surface: options.surface,
          })
    host.addController(this)
  }

  /** What takes a press beside the surface while it is a sheet. */
  private readonly scrim: Scrim | undefined

  /** Whether the surface is a sheet, where the host asks for a presentation. */
  private readonly presenting: PresentationController | undefined

  /** Whether the surface is a sheet along the window's bottom edge now. */
  get sheet(): boolean {
    return this.presenting?.sheet === true
  }

  /** Whether the surface is showing. */
  get open(): boolean {
    return this.shown
  }

  /** Puts the surface where the host's `open` says, however it got there. */
  hostUpdated(): void {
    const wanted = this.options.open?.()
    if (wanted === true) {
      this.show()
    } else if (wanted === false) {
      this.hide()
    }
    this.replace()
    this.cover()
  }

  /** Puts the scrim's presses where the surface is: beside a sheet that shows. */
  private cover(): void {
    if (this.shown && this.sheet) {
      this.scrim?.cover()
    } else {
      this.scrim?.uncover()
    }
  }

  /** Whether the surface shown now is placed against its anchor. */
  private placing = false

  /** Counts the surfaces its own sheet places, so a frame waiting to mark an earlier one marks nothing. */
  private marking = 0

  /**
   * Places the surface as `place` says now: against its anchor, or by its own
   * sheet, which marks it `data-placed` a frame after it shows, so an
   * entrance runs from where the sheet starts it, and at once where it was
   * already showing.
   */
  private settle(surface: HTMLElement, showing: boolean): void {
    this.placing = this.places
    this.marking += 1
    if (this.placing) {
      surface.removeAttribute('data-placed')
      this.floating.start()
      return
    }
    this.floating.stop()
    this.floating.release()
    const marking = this.marking
    const mark = (): void => {
      if (this.shown && !this.placing && marking === this.marking) {
        surface.setAttribute('data-placed', '')
      }
    }
    if (showing || typeof requestAnimationFrame !== 'function') {
      mark()
    } else {
      requestAnimationFrame(mark)
    }
  }

  /** Places a shown surface again where `place` has turned since it was placed. */
  private replace(): void {
    const surface = this.options.surface()
    if (this.shown && surface && this.places !== this.placing) {
      this.settle(surface, true)
    }
  }

  /** Whether this one is placed by measurement, read fresh so it may change. */
  private get places(): boolean {
    const asked = this.options.place
    if (this.sheet) {
      return false
    }
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
    /* Not while the surface is out of the page: `showPopover` throws there,
       and a host removed with an update still pending, such as one served
       open and replaced at once, ran it. Reconnected, the host updates again
       and shows it then. */
    if (this.shown || !surface?.isConnected) {
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
    this.settle(surface, false)
    this.dismisser.activate()
    this.cover()
    if (this.options.hints !== 'keep') {
      const panels = openPanels()
      this.held = surface
      panels.open.add(surface)
      for (const watcher of [...panels.watchers]) {
        watcher(surface)
      }
    }
  }

  /** Takes the surface off the list of open ones, so tooltips may show again. */
  private freeHints(): void {
    if (this.held) {
      openPanels().open.delete(this.held)
      this.held = undefined
    }
  }

  /** Hides the surface and stops everything watching it. */
  hide(): void {
    const surface = this.options.surface()
    if (!this.shown) {
      return
    }
    this.shown = false
    this.freeHints()
    this.scrim?.uncover()
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
   * Forgets that it was showing, and lets tooltips outside it show again.
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
    this.freeHints()
    this.scrim?.uncover()
  }

  /**
   * Asks a reconnected host that is still open to update, so the panel is shown
   * again.
   *
   * The flag above lets it show, and nothing asked it to: a host moved in the
   * DOM while open kept `open` and `aria-expanded="true"` with the panel
   * hidden until something else updated it, and Escape did not close it,
   * because the dismissal is started by showing.
   */
  hostConnected(): void {
    if (this.options.open?.()) {
      this.host.requestUpdate()
    }
  }
}
