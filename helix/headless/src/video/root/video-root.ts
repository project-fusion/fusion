import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import '../../icon/index.js'

/**
 * Seconds as a clock, with an hour only when there is one.
 *
 * `0:42` and not `00:00:42`. A reader comparing the position to the duration is
 * reading two numbers at a glance, and leading zeroes that never change are
 * digits in the way of the ones that do.
 */
const clock = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = whole % 60
  const padded = `${String(rest).padStart(2, '0')}`
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${padded}`
    : `${minutes}:${padded}`
}

/**
 * @summary Plays a video, with controls this library draws rather than the
 * browser's.
 *
 * @description
 * **The picture is a real `<video>`.** Decoding, buffering, captions, Picture
 * in Picture, AirPlay and the codecs a device happens to have are all the
 * platform's, and none of them can be had from anything else. What is replaced
 * is the control bar, which is the one part of a video element that cannot be
 * styled and looks different in every browser.
 *
 * **Every control is a real control.** The scrubber and the volume are
 * `<input type="range">`, so a reader gets arrow keys, Home and End, the
 * platform's own touch target and its screen reader announcement without this
 * element implementing any of it. Drawing a div and listening for pointer moves
 * is how a media player ends up unusable from a keyboard.
 *
 * **Native controls are the fallback, not the default.** Where a consumer sets
 * `controls`, the browser's bar is used and this one is not drawn: two sets of
 * controls over one video is worse than either alone, and a consumer who asked
 * for the native bar has a reason.
 *
 * The keys are the ones every player uses: Space and `k` to play or pause, the
 * arrows to seek and to change the volume, `m` to mute, `f` for fullscreen.
 * They are bound on this element rather than on the document, because a video
 * is not a palette: keys belong to it only while a reader is on it.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Player, Media, Movie
 * @documentation https://helix.fusion.dev/components/video
 *
 * @slot - `<source>` and `<track>` elements, which the video takes as its own.
 * @slot poster - Shown over the video until it starts.
 *
 * @csspart stage - The box holding the picture and its controls, and the focus
 * target the keys are bound to.
 * @csspart video - The video itself.
 * @csspart poster - What covers it before it plays.
 * @csspart controls - The bar along the bottom.
 * @csspart play - Play and pause.
 * @csspart scrubber - Where it is, and where to go.
 * @csspart time - The position and the duration.
 * @csspart mute - Sound on and off.
 * @csspart volume - How loud.
 * @csspart captions - Subtitles on and off.
 * @csspart fullscreen - The whole screen, and back.
 *
 * @event {Event} play - Relayed, because it does not cross a shadow boundary.
 * @event {Event} pause - Relayed for the same reason.
 * @event {Event} ended - Relayed for the same reason.
 */
@customElement('helix-base-video')
export class HelixBaseVideo extends HelixElement {
  /** Where the video is, for the common case of one file. */
  @property()
  src = ''

  /** A still shown before it plays, which the platform draws itself. */
  @property()
  poster = ''

  /** Accessible name, since a video is not described by its filename. */
  @property()
  label = ''

  /** Whether it starts again at the end. */
  @property({ reflect: true, type: Boolean })
  loop = false

  /** Whether it starts silent, which is what an autoplaying video must do. */
  @property({ reflect: true, type: Boolean })
  muted = false

  /** Whether it plays where it sits rather than taking over the screen. */
  @property({ attribute: 'plays-inline', type: Boolean })
  playsInline = true

  /**
   * Whether the browser draws the controls instead of this element.
   *
   * A fallback rather than a default. Two bars over one video is worse than
   * either alone, so this one is not drawn at all when it is set.
   */
  @property({ reflect: true, type: Boolean })
  controls = false

  /** How much to fetch before anything is asked for. */
  @property()
  preload: 'auto' | 'metadata' | 'none' = 'metadata'

  /** What the play control is called while it would start the video. */
  @property({ attribute: 'play-label' })
  playLabel = 'Play'

  /** And while it would stop it. */
  @property({ attribute: 'pause-label' })
  pauseLabel = 'Pause'

  @state()
  private playing = false

  @state()
  private position = 0

  @state()
  private duration = 0

  @state()
  private loudness = 1

  @state()
  private silent = false

  @state()
  private full = false

  @state()
  private captioned = false

  @state()
  private hasCaptions = false

  private get video(): HTMLVideoElement | null {
    return this.renderRoot?.querySelector<HTMLVideoElement>('[part="video"]') ?? null
  }

  /** Toggles playback, which is what every key and the button both come to. */
  toggle(): void {
    const video = this.video
    if (!video) {
      return
    }
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  /** Moves to a point in seconds, clamped to what exists. */
  seek(seconds: number): void {
    const video = this.video
    if (!video || !Number.isFinite(video.duration)) {
      return
    }
    video.currentTime = Math.min(Math.max(seconds, 0), video.duration)
  }

  private readonly handleLoaded = (): void => {
    const video = this.video
    if (!video) {
      return
    }
    this.duration = video.duration
    /* Read once the video has its tracks, not from the slot. A `<track>` is
       only a caption once the platform has parsed it, and a consumer can add
       one later. */
    this.hasCaptions = video.textTracks.length > 0
  }

  private readonly handleTime = (): void => {
    this.position = this.video?.currentTime ?? 0
  }

  /**
   * Relayed, because none of these cross a shadow boundary on their own.
   *
   * The video is inside this element's shadow root, so a consumer listening on
   * the element they wrote hears nothing at all without this. Input relays
   * `change` for the same reason.
   */
  private readonly handleState = (event: Event): void => {
    const video = this.video
    this.playing = video ? !video.paused : false
    this.dispatchEvent(new Event(event.type, { bubbles: true, composed: true }))
  }

  private readonly handleVolume = (): void => {
    const video = this.video
    if (!video) {
      return
    }
    this.loudness = video.volume
    this.silent = video.muted
  }

  /** Turns the first caption track on or off, which is what the button means. */
  private toggleCaptions(): void {
    const track = this.video?.textTracks[0]
    if (!track) {
      return
    }
    const next = track.mode !== 'showing'
    track.mode = next ? 'showing' : 'disabled'
    this.captioned = next
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement === this) {
      await document.exitFullscreen()
      return
    }
    await this.requestFullscreen()
  }

  private readonly handleFullscreenChange = (): void => {
    this.full = document.fullscreenElement === this
  }

  /**
   * The keys every player uses, bound to this element rather than the document.
   *
   * A video is not a command palette: its keys belong to it while a reader is
   * on it, and a page with two videos on it would otherwise have both answering
   * the same press.
   *
   * Nothing is taken while focus is in a range. The scrubber and the volume are
   * real inputs and the arrows are already theirs, so intercepting would mean
   * seeking twice for one press.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if ((event.target as HTMLElement)?.tagName === 'INPUT') {
      return
    }
    const video = this.video
    if (!video) {
      return
    }
    const step = event.shiftKey ? 10 : 5
    switch (event.key) {
      case ' ':
      case 'k': {
        this.toggle()
        break
      }
      case 'ArrowRight': {
        this.seek(video.currentTime + step)
        break
      }
      case 'ArrowLeft': {
        this.seek(video.currentTime - step)
        break
      }
      case 'ArrowUp': {
        video.volume = Math.min(video.volume + 0.1, 1)
        break
      }
      case 'ArrowDown': {
        video.volume = Math.max(video.volume - 0.1, 0)
        break
      }
      case 'm': {
        video.muted = !video.muted
        break
      }
      case 'f': {
        void this.toggleFullscreen()
        break
      }
      default: {
        return
      }
    }
    event.preventDefault()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('fullscreenchange', this.handleFullscreenChange)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    const video = this.video
    if (video) {
      this.silent = video.muted
      this.loudness = video.volume
    }
  }

  /**
   * Mirrors playback onto the host as `data-playing`.
   *
   * Because CSS cannot ask. `paused` is a property of a `<video>` and never an
   * attribute, so `video:not([paused])` matches every video that has ever
   * existed: the first version of the rule that hides the bar used exactly that
   * and hid it always, including on a paused video, which is the one state it
   * was written to keep it in.
   *
   * `data-open` is set the same way and for the same reason. It is a fact about
   * this element at runtime and never appears in a server's markup, so there is
   * nothing for hydration to disagree with.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.toggleAttribute('data-playing', this.playing)
  }

  private renderBar(): TemplateResult {
    const done = this.duration > 0 ? this.position / this.duration : 0
    return html`<div part="controls">
      <button
        part="play"
        type="button"
        aria-label=${this.playing ? this.pauseLabel : this.playLabel}
        @click=${() => this.toggle()}
      >
        <helix-icon name=${this.playing ? 'pause' : 'play'}></helix-icon>
      </button>
      <span part="time">${clock(this.position)} / ${clock(this.duration)}</span>
      <input
        part="scrubber"
        type="range"
        min="0"
        max=${Number.isFinite(this.duration) && this.duration > 0 ? this.duration : 0}
        step="0.01"
        .value=${String(this.position)}
        aria-label="Seek"
        aria-valuetext=${`${clock(this.position)} of ${clock(this.duration)}`}
        style=${`--_video-progress: ${done}`}
        @input=${(event: Event) => this.seek(Number((event.target as HTMLInputElement).value))}
      />
      <button
        part="mute"
        type="button"
        aria-label=${this.silent ? 'Unmute' : 'Mute'}
        aria-pressed=${this.silent ? 'true' : 'false'}
        @click=${() => {
          const video = this.video
          if (video) {
            video.muted = !video.muted
          }
        }}
      >
        <helix-icon name=${this.silent || this.loudness === 0 ? 'speaker-x' : 'speaker-high'}></helix-icon>
      </button>
      <input
        part="volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        .value=${String(this.silent ? 0 : this.loudness)}
        aria-label="Volume"
        aria-valuetext=${`${Math.round((this.silent ? 0 : this.loudness) * 100)} percent`}
        @input=${(event: Event) => {
          const video = this.video
          if (video) {
            video.volume = Number((event.target as HTMLInputElement).value)
            video.muted = false
          }
        }}
      />
      ${
        this.hasCaptions
          ? html`<button
              part="captions"
              type="button"
              aria-label="Captions"
              aria-pressed=${this.captioned ? 'true' : 'false'}
              @click=${() => this.toggleCaptions()}
            >
              <helix-icon name="closed-captioning"></helix-icon>
            </button>`
          : nothing
      }
      <button
        part="fullscreen"
        type="button"
        aria-label=${this.full ? 'Exit fullscreen' : 'Fullscreen'}
        aria-pressed=${this.full ? 'true' : 'false'}
        @click=${() => void this.toggleFullscreen()}
      >
        <helix-icon name=${this.full ? 'corners-in' : 'corners-out'}></helix-icon>
      </button>
    </div>`
  }

  protected override render(): TemplateResult {
    /* One focusable box around the lot, which is where the keys land. A video
       without native controls is not focusable at all, and the buttons under it
       are, so without this a reader could tab to Play and never to the picture
       the keys are about. `role="group"` with a name so what they landed on
       announces as something rather than as an unnamed div. */
    return html`<div
        part="stage"
        tabindex="0"
        role="group"
        aria-label=${this.label || 'Video'}
        @keydown=${this.handleKeydown}
      >
      <video
        part="video"
        aria-label=${this.label || nothing}
        src=${this.src || nothing}
        poster=${this.poster || nothing}
        preload=${this.preload}
        ?controls=${this.controls}
        ?loop=${this.loop}
        ?muted=${this.muted}
        ?playsinline=${this.playsInline}
        @loadedmetadata=${this.handleLoaded}
        @timeupdate=${this.handleTime}
        @volumechange=${this.handleVolume}
        @play=${this.handleState}
        @pause=${this.handleState}
        @ended=${this.handleState}
      >
        <slot></slot>
      </video>
      <slot name="poster" part="poster"></slot>
      ${this.controls ? nothing : this.renderBar()}
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-video': HelixBaseVideo
  }
}
