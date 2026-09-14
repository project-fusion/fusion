import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What the watch reports, as it learns it. */
export interface RemoteReport {
  /** Whether anything on the network offers to play this. */
  available: (available: boolean) => void
  /** Whether it is playing somewhere else right now. */
  connected: (connected: boolean) => void
}

/**
 * Watches for something to play the video on, and stops on the way out.
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
  private video: HTMLVideoElement | undefined

  /** Cancels the availability watch, since it outlives a single render. */
  private watch: number | undefined

  constructor(
    host: ReactiveControllerHost,
    private readonly report: RemoteReport,
  ) {
    host.addController(this)
  }

  /** Starts watching the video, once there is one. */
  async attach(video: HTMLVideoElement): Promise<void> {
    this.video = video
    video.remote?.addEventListener?.('connect', this.handleState)
    video.remote?.addEventListener?.('disconnect', this.handleState)
    const remote = video.remote
    if (!remote?.watchAvailability) {
      return
    }
    try {
      this.watch = await remote.watchAvailability((available) => {
        this.report.available(available)
      })
    } catch {
      /* Refused where the media is not remotable, which is a fact about the
         source rather than an error to report: the control stays off. */
    }
  }

  /** Opens the platform's own device picker. It has no list of its own. */
  async prompt(): Promise<void> {
    try {
      await this.video?.remote?.prompt()
    } catch {
      /* Dismissing the picker rejects, which is a reader saying no rather than
         anything going wrong. */
    }
  }

  hostDisconnected(): void {
    if (this.watch !== undefined) {
      void this.video?.remote?.cancelWatchAvailability?.(this.watch)
      this.watch = undefined
    }
  }

  private readonly handleState = (): void => {
    this.report.connected(this.video?.remote?.state === 'connected')
  }
}
