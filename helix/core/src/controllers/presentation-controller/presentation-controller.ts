import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { presentedAs, SHEET_QUERY } from '../../utils/layers/layers.js'

/** What `PresentationController` reads of its host, and what it tells it. */
export interface PresentationOptions {
  /** The presentation the host asks for: `auto`, `popover`, or `sheet`. */
  readonly asked: () => unknown
  /**
   * Told each time the panel turns between a sheet and a popover, and once
   * as the host connects: `true` for a sheet. A host sets its `sheet` state
   * here, and stops placing its panel against the anchor while it is one.
   */
  readonly changed: (sheet: boolean) => void
}

/**
 * Whether an anchored panel is a sheet along the window's bottom edge or a
 * popover placed against its anchor, as the native runtime decides it for a
 * layer: a sheet in a window narrower than 30rem under `auto`, and the one
 * the host asks for under `popover` or `sheet`.
 *
 * **The window is read through `matchMedia`**, so a turned phone or a
 * resized window moves the panel between the two as the query flips. A
 * server render has no window, and reads a popover.
 */
export class PresentationController implements ReactiveController {
  private query: MediaQueryList | undefined
  private last: boolean | undefined

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: PresentationOptions,
  ) {
    host.addController(this)
  }

  /** Whether the panel is a sheet now. */
  get sheet(): boolean {
    return presentedAs(this.options.asked(), this.query?.matches === true) === 'sheet'
  }

  hostConnected(): void {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.query = window.matchMedia(SHEET_QUERY)
      this.query.addEventListener('change', this.check)
    }
    this.check()
  }

  /* The host's `presentation` may have changed with this update. */
  hostUpdated(): void {
    this.check()
  }

  hostDisconnected(): void {
    this.query?.removeEventListener('change', this.check)
    this.query = undefined
    this.last = undefined
  }

  /** Tells the host where the panel turned. */
  private readonly check = (): void => {
    const sheet = this.sheet
    if (sheet !== this.last) {
      this.last = sheet
      this.options.changed(sheet)
      this.host.requestUpdate()
    }
  }
}
