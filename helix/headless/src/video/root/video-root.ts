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
 * **And none of them where `controls` is set.** The browser's own bar owns
 * those keys, and two handlers on one press is a video that seeks twice or
 * plays and immediately pauses. The focus stop goes with them, since the native
 * controls bring their own.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Player, Media, Movie
 * @documentation https://helix.fusion.dev/components/video
 *
 * **`<source>` and `<track>` are copied into the video, not slotted into it.**
 * A media element runs its resource selection over its own child *nodes*, and a
 * slot is one node: the sources and the caption tracks a consumer wrote were
 * assigned into the flattened tree and the video never saw any of them. It had
 * no text tracks, no current source and a `readyState` of zero, so a video
 * given sources this way did not merely lack captions, it did not play.
 *
 * They are copied rather than moved, because the consumer's light DOM is theirs
 * and a framework that re-renders it would find its children gone. The copies
 * are rebuilt whenever the slot changes and the video is asked to load again,
 * which is what makes a `<track>` added later take effect.
 *
 * @slot - `<source>` and `<track>` elements, which are copied into the video.
 * @slot poster - Shown over the video until it starts.
 *
 * @csspart stage - The box holding the picture and its controls, and the focus
 * target the keys are bound to.
 * @csspart video - The video itself.
 * @csspart poster - What covers it before it plays.
 * @csspart cue - The caption on screen now, drawn by this element.
 * @csspart controls - The bar along the bottom.
 * @csspart play - Play and pause.
 * @csspart scrubber - Where it is, and where to go.
 * @csspart time - The position and the duration.
 * @csspart sound - The speaker and its level, which are one control.
 * @csspart mute - Sound on and off.
 * @csspart volume - How loud.
 * @csspart captions - Subtitles on and off.
 * @csspart speed - Playback speed, where it was asked for.
 * @csspart pip - Picture in picture, where it was asked for and exists.
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

  /**
   * Controls beyond the ones every player has, named in the order they appear.
   *
   * A list rather than a property apiece. A bar is a row with a budget, and a
   * boolean per feature invites a consumer to switch all of them on: naming
   * them makes the row a decision, and makes the order theirs. Anything
   * unrecognised is skipped rather than throwing, since the list is markup and
   * a typo should cost a control, not a page.
   *
   * `pip` is offered only where the platform has it, checked rather than
   * assumed: it is absent on iPhone and behind a flag in Firefox, and a button
   * that cannot work is worse than one that is not there.
   */
  @property({ attribute: 'extra-controls' })
  extraControls = ''

  /** The speeds offered, slowest first, as multipliers of normal. */
  @property({ attribute: 'speeds' })
  speeds = '0.5 1 1.5 2'

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

  /** The words of the cue on screen now, or nothing between cues. */
  @state()
  private cue = ''

  @state()
  private rate = 1

  /** The extras asked for, in order, and only the ones this platform can do. */
  private get extras(): string[] {
    const asked = this.extraControls.split(/\s+/).filter(Boolean)
    return asked.filter((one) => {
      if (one === 'pip') {
        return typeof document !== 'undefined' && document.pictureInPictureEnabled
      }
      return one === 'speed'
    })
  }

  /** The sources and caption tracks to copy into the video, as the consumer wrote them. */
  @state()
  private media: { attrs: Record<string, string>; tag: 'source' | 'track' }[] = []

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

  /**
   * Rebuilds the copies from whatever the consumer has slotted.
   *
   * The attribute list is explicit rather than a blind copy of every attribute:
   * these are two elements with a known and small surface, and copying anything
   * a consumer happened to put on one would carry their framework's own markers
   * into a shadow root that has no use for them.
   */
  private readonly handleMedia = (event: Event): void => {
    const assigned = (event.target as HTMLSlotElement).assignedElements()
    this.media = assigned
      .filter(
        (node): node is HTMLSourceElement | HTMLTrackElement =>
          node instanceof HTMLSourceElement || node instanceof HTMLTrackElement,
      )
      .map((node) => {
        const tag = node instanceof HTMLTrackElement ? ('track' as const) : ('source' as const)
        const names =
          tag === 'track'
            ? ['default', 'kind', 'label', 'src', 'srclang']
            : ['media', 'sizes', 'src', 'srcset', 'type']
        const attrs: Record<string, string> = {}
        for (const name of names) {
          const value = node.getAttribute(name)
          if (value !== null) {
            attrs[name] = value
          }
        }
        return { attrs, tag }
      })
  }

  private readonly handleLoaded = (): void => {
    const video = this.video
    if (!video) {
      return
    }
    this.duration = video.duration
    /* The video's own shape, handed to CSS as a number.
     *
     * `aspect-ratio: auto` cannot be used for this, and that is the whole
     * reason this exists: `auto` takes the element's intrinsic ratio, and a
     * `<video>` carrying a poster reports the *poster's*. A three-by-two still
     * over a sixteen-by-nine clip made the box three-by-two, so the poster
     * filled it and the video letterboxed inside, standing fifty pixels
     * shorter the moment it started. Measured at 488 by 325 where the video
     * wanted 488 by 275.
     *
     * Set once the metadata is in, which is the first moment the real ratio is
     * knowable at all. Until then the stylesheet's own default holds. */
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      this.style.setProperty('--_video-ratio', `${video.videoWidth} / ${video.videoHeight}`)
    }
    /* Read once the video has its tracks, not from the slot. A `<track>` is
       only a caption once the platform has parsed it, and a consumer can add
       one later. */
    this.hasCaptions = video.textTracks.length > 0
    /* And what the first one is doing, which is not always nothing: a
       `<track default>` starts showing without anyone pressing anything, so a
       button that began at "off" reported the opposite of what was on screen. */
    const track = video.textTracks[0]
    if (track) {
      /* A `<track default>` arrives `showing`, which is the browser drawing it.
         Moved to `hidden` so the cues keep coming and we draw them instead. */
      if (track.mode === 'showing') {
        track.mode = 'hidden'
      }
      this.captioned = track.mode === 'hidden'
      track.addEventListener('cuechange', this.handleCue)
      this.handleCue()
    }
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

  /**
   * Draws the active cue ourselves, so it can be put where we want it.
   *
   * The browser renders cues inside the video's own box and there is no
   * standard way to inset that box: a caption lands under the control bar and
   * stays there. `::cue` styles the text and not the region, and the property
   * that moves the region is a `-webkit-` internal that two of the three
   * engines do not have.
   *
   * So the track is set to `hidden` rather than `showing`, which is the mode
   * that keeps the cues coming without drawing them, and what it reports is
   * rendered into a part of our own. That also makes captions styleable, which
   * `::cue` only half allows.
   */
  private readonly handleCue = (): void => {
    const track = this.video?.textTracks[0]
    const active = track?.activeCues?.[0]
    this.cue = active instanceof VTTCue ? active.text : ''
  }

  /** Turns the first caption track on or off, which is what the button means. */
  private toggleCaptions(): void {
    const track = this.video?.textTracks[0]
    if (!track) {
      return
    }
    const next = track.mode === 'disabled'
    /* `hidden`, never `showing`. Hidden is the mode where a track still fires
       `cuechange` and still fills `activeCues`, and the browser draws nothing:
       exactly what is wanted when something else is doing the drawing. */
    track.mode = next ? 'hidden' : 'disabled'
    this.captioned = next
    this.cue = ''
  }

  /** Steps through the speeds offered, which is what one button can do. */
  private cycleSpeed(): void {
    const speeds = this.speeds
      .split(/\s+/)
      .map(Number)
      .filter((one) => one > 0)
    const video = this.video
    if (!video || speeds.length === 0) {
      return
    }
    const at = speeds.indexOf(video.playbackRate)
    const next = speeds[(at + 1) % speeds.length] ?? 1
    video.playbackRate = next
    this.rate = next
  }

  private async togglePip(): Promise<void> {
    const video = this.video
    if (!video) {
      return
    }
    if (document.pictureInPictureElement === video) {
      await document.exitPictureInPicture()
      return
    }
    await video.requestPictureInPicture()
  }

  /**
   * Into fullscreen and back, and quiet about being refused.
   *
   * `requestFullscreen` rejects rather than returning false, and the two
   * refusals a consumer will actually meet are a Permissions Policy that does
   * not grant `fullscreen` to the frame the player is in, and a call without
   * user activation. Both are `TypeError: Permissions check failed`, which is
   * the same message for two different causes.
   *
   * It was `void`ed, so a refusal became an unhandled rejection: the button did
   * nothing and said nothing, and the console entry it left named neither the
   * element nor the reason. Caught here, the state stays honest because
   * `aria-pressed` follows `fullscreenchange` rather than this call, so a
   * refused request leaves a button that correctly reports "not fullscreen".
   */
  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement === this) {
        await document.exitFullscreen()
        return
      }
      await this.requestFullscreen()
    } catch (error) {
      /* Reported rather than swallowed, and reported once. A player embedded in
         a frame without the permission is the common case, and the fix is on
         the frame rather than here, so the message has to say which. */
      console.warn(
        '<helix-video> could not enter fullscreen. If it is inside an iframe, that frame needs allow="fullscreen".',
        error,
      )
    }
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
    /* Nothing at all where the browser draws the controls. Its own bar owns
       Space, the arrows and the rest, and two handlers on one key is a video
       that seeks twice or plays and immediately pauses. A consumer who asked
       for the native controls asked for the native keyboard with them. */
    if (this.controls) {
      return
    }
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
    /* A media element decides what to play once, when it is created or when it
       is told to look again. Copies that arrive after that are markup it has
       already walked past. */
    if (changed.has('media')) {
      const video = this.video
      video?.load()
      this.hasCaptions = (video?.textTracks.length ?? 0) > 0
    }
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
      <span part="sound">
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
        style=${`--_video-level: ${this.silent ? 0 : this.loudness}`}
        @input=${(event: Event) => {
          const video = this.video
          if (video) {
            video.volume = Number((event.target as HTMLInputElement).value)
            video.muted = false
          }
        }}
      />
      </span>
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
      ${this.extras.map((one) =>
        one === 'speed'
          ? html`<button
              part="speed"
              type="button"
              aria-label="Playback speed"
              @click=${() => this.cycleSpeed()}
            >
              ${this.rate}x
            </button>`
          : html`<button
              part="pip"
              type="button"
              aria-label="Picture in picture"
              @click=${() => void this.togglePip()}
            >
              <helix-icon name="picture-in-picture"></helix-icon>
            </button>`,
      )}
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
        tabindex=${this.controls ? nothing : '0'}
        role=${this.controls ? nothing : 'group'}
        aria-label=${this.controls ? nothing : this.label || 'Video'}
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
        ${this.media.map((one) =>
          one.tag === 'track'
            ? html`<track
                ?default=${'default' in one.attrs}
                kind=${one.attrs.kind ?? nothing}
                label=${one.attrs.label ?? nothing}
                src=${one.attrs.src ?? nothing}
                srclang=${one.attrs.srclang ?? nothing}
              />`
            : html`<source
                media=${one.attrs.media ?? nothing}
                sizes=${one.attrs.sizes ?? nothing}
                src=${one.attrs.src ?? nothing}
                srcset=${one.attrs.srcset ?? nothing}
                type=${one.attrs.type ?? nothing}
              />`,
        )}
      </video>
      <!-- Outside the video, and hidden. It exists to notice what the consumer
           wrote, not to be rendered: a slot inside a media element is the one
           child its resource selection sees, and a slot is not a source.
           No backticks in here: this comment is inside a template literal, and
           the first one ends it. -->
      <span aria-hidden="true" hidden><slot @slotchange=${this.handleMedia}></slot></span>
      ${this.cue === '' ? nothing : html`<p aria-live="off" part="cue">${this.cue}</p>`}
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
