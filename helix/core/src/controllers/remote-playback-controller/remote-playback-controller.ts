import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What the watch reports, as it learns it. */
export interface RemoteReport {
  /** Whether anything on the network offers to play this. */
  available: (available: boolean) => void
  /** Whether it is playing somewhere else right now. */
  connected: (connected: boolean) => void
}

/**
 * Watches for something to play the media on, and stops on the way out.
 *
 * The Remote Playback API is the standard one, and it is what Safari
 * implements for AirPlay and Chrome for Cast: one call covers both, where the
 * older `webkitShowPlaybackTargetPicker` covers only the first. Firefox has
 * neither, and `remote` simply being absent is what turns the control off
 * there.
 *
 * `watchAvailability` returns an id that has to be canceled, or the callback
 * outlives the element that owns it: a callback holding a removed element is a
 * leak with a `@state` write on the end.
 */
export class RemotePlaybackController implements ReactiveController {
  private media: HTMLMediaElement | undefined

  /** Cancels the availability watch, since it outlives a single render. */
  private watch: number | undefined

  constructor(
    host: ReactiveControllerHost,
    private readonly report: RemoteReport,
  ) {
    host.addController(this)
  }

  /** Whether the host is in the document, which a watch is only kept while. */
  private connected = false

  /** Starts watching the media element, once there is one. */
  async attach(media: HTMLMediaElement): Promise<void> {
    this.media = media
    media.remote?.addEventListener?.('connect', this.handleState)
    media.remote?.addEventListener?.('disconnect', this.handleState)
    await this.start()
  }

  /**
   * Asks to hear when a device turns up or goes, for the media attached.
   *
   * **A watch that arrives after the host has gone is canceled on arrival.**
   * The platform answers asynchronously, and a video removed while it did kept
   * a watch nothing would cancel.
   */
  private async start(): Promise<void> {
    const remote = this.media?.remote
    if (!remote?.watchAvailability || this.watch !== undefined) {
      return
    }
    try {
      const watch = await remote.watchAvailability((available) => {
        this.report.available(available)
      })
      if (!this.connected || this.watch !== undefined) {
        void remote.cancelWatchAvailability?.(watch)
        return
      }
      this.watch = watch
    } catch {
      /* Refused where the media is not remotable, which is a fact about the
         source rather than an error to report: the control stays off. */
    }
  }

  /** Opens the platform's own device picker. It has no list of its own. */
  async prompt(): Promise<void> {
    try {
      await this.media?.remote?.prompt()
    } catch {
      /* Dismissing the picker rejects, which is a reader saying no rather than
         anything going wrong. */
    }
  }

  /**
   * Watches again after a move. The disconnect canceled it, and `attach` is
   * called once, so the control kept whatever it last knew about devices.
   */
  hostConnected(): void {
    this.connected = true
    if (this.media) {
      void this.start()
    }
  }

  hostDisconnected(): void {
    this.connected = false
    if (this.watch !== undefined) {
      void this.media?.remote?.cancelWatchAvailability?.(this.watch)
      this.watch = undefined
    }
  }

  private readonly handleState = (): void => {
    this.report.connected(this.media?.remote?.state === 'connected')
  }
}
