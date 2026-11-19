import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { IndicatorController } from '../indicator-controller/indicator-controller.js'

/** What a `HoverMarkController` needs of its host. */
export interface HoverMarkOptions {
  /**
   * Told when the mark arrives over the items and when it leaves them, so the
   * host can hold `:state(gliding)` for its stylesheet.
   */
  gliding: (on: boolean) => void

  /**
   * The item a pointer is over, from what is under it, or nothing where it is
   * between items. Left out, the controller follows no pointer, and the host
   * says where the mark goes with `show`.
   */
  item?: (under: readonly EventTarget[]) => HTMLElement | undefined

  /** The mark that travels to the item under the pointer. */
  mark: () => HTMLElement | null | undefined

  /** Elements whose size moves the mark, beyond the host, as `IndicatorController` takes them. */
  observe?: () => readonly Element[]

  /** The box the mark is positioned against, as `IndicatorController` takes it. */
  surface: () => HTMLElement | null | undefined
}

/**
 * Moves one mark to whichever item a mouse or pen is over, so the wash under
 * the pointer glides from item to item instead of going out on one and coming
 * on at the next. Serves `Navigation`, `Tabs`, `Toggle Group` and `Menu`.
 *
 * **Placed by `IndicatorController`**, so the mark carries the same four
 * properties a selection mark does, `--indicator-x`, `--indicator-y`,
 * `--indicator-inline-size` and `--indicator-block-size`, signed in a
 * right-to-left document and in layout pixels under a transform, and
 * `data-placed` while it is over an item.
 *
 * **It glides only between items.** Arriving from outside, it is placed where
 * the pointer is and fades in, and `data-gliding` comes a frame later, so a
 * stylesheet that moves the mark only under `data-gliding` never slides it in
 * from where it was last. `gliding` hears the arrival and the departure, so
 * the host can hold `:state(gliding)` between them, which a stylesheet reads
 * to take each item's own hover wash away while the mark draws it.
 *
 * **A touch is not followed**, since a finger leaves no hover to draw.
 *
 * **A host whose wash marks something besides the pointer drives it itself.**
 * Without `item` it listens for nothing, and `show` moves the mark with the
 * same arrival and glide, as `Menu` does for the row with focus, which the
 * keys move as well as the pointer.
 */
export class HoverMarkController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: HoverMarkOptions

  /** The item the mark is over. */
  hovered: HTMLElement | undefined

  /** The frame that lets the mark glide, after its first placement. */
  private frame = 0

  private readonly placer: IndicatorController

  constructor(host: ReactiveControllerHost & HTMLElement, options: HoverMarkOptions) {
    this.host = host
    this.options = options
    this.placer = new IndicatorController(host, {
      active: () => this.hovered,
      indicator: options.mark,
      ...(options.observe ? { observe: options.observe } : {}),
      surface: options.surface,
    })
    host.addController(this)
  }

  hostConnected(): void {
    if (this.options.item) {
      this.host.addEventListener('pointerover', this.over)
      this.host.addEventListener('pointerleave', this.leave)
    }
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointerover', this.over)
    this.host.removeEventListener('pointerleave', this.leave)
    this.leave()
  }

  /**
   * Moves the mark to `item`, gliding from the item it was over, or takes it
   * away with nothing.
   *
   * @param item The element the mark covers, or nothing for none.
   */
  show(item: HTMLElement | undefined): void {
    if (item) {
      this.move(item)
    } else {
      this.leave()
    }
  }

  private readonly over = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      return
    }
    const under = event.composedPath()
    const item = this.options.item?.(under)
    if (item === this.hovered) {
      return
    }
    /* **Between two items the mark holds where it is**, so a pointer crossing
       the gap glides on to the next rather than the wash going out and
       coming back. Off the strip, such as over a tab's panel, it leaves. */
    if (!item) {
      const surface = this.options.surface()
      if (!surface || !under.includes(surface)) {
        this.leave()
      }
      return
    }
    this.move(item)
  }

  /** Places the mark over `item`, letting it glide once it has arrived. */
  private move(item: HTMLElement): void {
    if (item === this.hovered) {
      return
    }
    const arriving = this.hovered === undefined
    this.hovered = item
    this.placer.place()
    if (!arriving) {
      return
    }
    this.options.gliding(true)
    cancelAnimationFrame(this.frame)
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.options.mark()?.toggleAttribute('data-gliding', this.hovered !== undefined)
    })
  }

  private readonly leave = (): void => {
    cancelAnimationFrame(this.frame)
    this.frame = 0
    if (this.hovered === undefined) {
      return
    }
    this.hovered = undefined
    this.placer.place()
    this.options.mark()?.removeAttribute('data-gliding')
    this.options.gliding(false)
  }
}
