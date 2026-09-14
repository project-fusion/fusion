import {
  customElement,
  drawIcon,
  HelixElement,
  HelixNextEvent,
  HelixPreviousEvent,
  onUnlessFalse,
} from '@fusion.dev/helix-core'
import {
  airplay,
  arrowClockwise,
  arrowCounterClockwise,
  closedCaptioning,
  cornersIn,
  cornersOut,
  dotsThreeVertical,
  download,
  gauge,
  pause,
  pictureInPicture,
  play,
  skipBack,
  skipForward,
  speakerHigh,
  speakerX,
} from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
/* Side-effect, for the menu rows this renders. Both tiers import it, because
   this tier writes the template and the styled tier inherits it without having
   a copy of its own to remind anyone. */
import '../../menu/index.js'
import {
  activeCue,
  adoptTrack,
  type Caption,
  CueController,
  captionsAmong,
  captionTracks,
  showCaption,
} from './captions.js'
import { FullscreenController } from './fullscreen.js'
import { IdleController } from './idle.js'
import { MediaSessionController, SKIP_SECONDS } from './media-session.js'
import { RemotePlaybackController } from './remote-playback.js'

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
 * in Picture, AirPlay and whatever codecs a device has are the platform's. What
 * is replaced is the control bar, which is the one part that cannot be styled.
 *
 * **Every control is a real control.** The scrubber and the volume are
 * `<input type="range">`, so arrow keys, Home and End, the platform's touch
 * target and its screen reader announcement all come for free.
 *
 * **Native controls are the fallback, not the default.** Where a consumer sets
 * `controls` the browser's bar is used and this one is not drawn, and the keys
 * below are not bound: two handlers on one press is a video that seeks twice.
 *
 * The keys are the ones every player uses: Space and `k` to play or pause, the
 * arrows to seek and to change volume, `m` to mute, `f` for fullscreen. They
 * are bound on this element rather than on the document, because a video is not
 * a palette.
 *
 * **`<source>` and `<track>` are copied into the video, never slotted into it.**
 * A media element runs resource selection over its own child *nodes*, and a slot
 * is one node, so slotted sources reach it as nothing: no text tracks, no
 * current source, `readyState` zero. A video given sources that way does not
 * merely lack captions, it does not play. They are copied rather than moved,
 * because the consumer's light DOM is theirs, and rebuilt whenever the slot
 * changes.
 *
 * @since 0.1.0
 * @status experimental
 * @category media
 * @aliases Player, Media, Movie
 * @documentation https://helix.fusion.dev/components/video
 *
 * @slot - `<source>` and `<track>` elements, which are copied into the video.
 * @slot back - Top left over the frame, for a way out of a set.
 * @slot controls - Added to the control bar, before fullscreen.
 * @slot poster - Shown over the video until it starts.
 *
 * @event {Event} ended - Relayed, because it does not cross a shadow boundary.
 * @event {HelixNextEvent} helix-next - Fired when the reader asks for the next item.
 * @event {HelixPreviousEvent} helix-previous - Fired when they ask for the previous one.
 * @event {Event} pause - Relayed for the same reason.
 * @event {Event} play - Relayed for the same reason.
 *
 * @csspart back - The region top left, for a way out of a set.
 * @csspart captions - Subtitles on and off.
 * @csspart captions-menu - The language menu, where there is more than one.
 * @csspart captions-menu-back - The control that returns from a submenu.
 * @csspart captions-menu-back-mark - The glyph on the back control of a submenu.
 * @csspart captions-menu-empty - Shown when there are no items to show.
 * @csspart captions-menu-header - The bar above a submenu, holding the way back and its name.
 * @csspart captions-menu-loading - Shown while the items are still on their way.
 * @csspart captions-menu-surface - The floating panel the menu is drawn on.
 * @csspart captions-menu-title - The name of the submenu that is showing.
 * @csspart controls - The bar along the bottom.
 * @csspart cue - The caption on screen now, drawn by this element.
 * @csspart download - Saves the file, where it was asked for.
 * @csspart entry - One row in a menu this player opens.
 * @csspart entry-item - The row, which is an `<a>` where `href` is set.
 * @csspart entry-mark - The trailing mark: a tick when checked, a caret when it opens.
 * @csspart entry-start - The leading column, which is a slot and is always there.
 * @csspart failure - What is said when the source will not play.
 * @csspart forward - The control that goes on ten seconds.
 * @csspart fullscreen - The whole screen, and back.
 * @csspart loading - What is said while the picture waits for more of itself.
 * @csspart loading-mark - The part of that which spins.
 * @csspart more - The button that opens it.
 * @csspart mute - Sound on and off.
 * @csspart next - Asks for the next item, where it was asked for.
 * @csspart overflow - The menu holding the controls kept off the bar.
 * @csspart overflow-back - The control that returns from a submenu.
 * @csspart overflow-back-mark - The glyph on the back control of a submenu.
 * @csspart overflow-empty - Shown when there are no items to show.
 * @csspart overflow-header - The bar above a submenu, holding the way back and its name.
 * @csspart overflow-loading - Shown while the items are still on their way.
 * @csspart overflow-surface - The floating panel the menu is drawn on.
 * @csspart overflow-title - The name of the submenu that is showing.
 * @csspart pip - Picture in picture, where it was asked for and exists.
 * @csspart play - Play and pause.
 * @csspart poster - What covers it before it plays.
 * @csspart previous - Asks for the previous one.
 * @csspart remote - Play on another device, where one is available.
 * @csspart rewind - The control that goes back ten seconds.
 * @csspart scrubber - Where it is, and where to go.
 * @csspart sound - The speaker and its level, which are one control.
 * @csspart speed - Playback speed, where it was asked for.
 * @csspart stage - The box holding the picture and its controls, and the focus
 * target the keys are bound to.
 * @csspart start - The mark over the picture before anything has played.
 * @csspart time - The position and the duration.
 * @csspart video - The video itself.
 * @csspart volume - How loud.
 *
 * @cssproperty --video-intrinsic-ratio - The media's own aspect ratio, once it is known. `--video-aspect-ratio` overrides it.
 * @cssproperty --video-level - The current volume, 0 to 1.
 * @cssproperty --video-progress - How far playback has reached, as a fraction of the duration.
 */
@customElement('helix-headless-video')
export class HelixHeadlessVideo extends HelixElement {
  /**
   * Whether it starts on its own, which a browser only allows while silent.
   *
   * Forwarded rather than acted on. Whether an unprompted play is permitted is
   * the browser's policy and not this element's, and `play()` already swallows
   * the refusal: what follows a refused autoplay is a paused player showing its
   * start control, which is the correct thing to be looking at.
   */
  @property({ reflect: true, type: Boolean })
  autoplay = false

  /**
   * Whether the browser draws the controls instead of this element.
   *
   * A fallback rather than a default. Two bars over one video is worse than
   * either alone, so this one is not drawn at all when it is set.
   */
  @property({ reflect: true, type: Boolean })
  controls = false

  /**
   * How the media is fetched across origins, which decides whether a track can
   * be read.
   */
  @property({ attribute: 'crossorigin' })
  crossOrigin: 'anonymous' | 'use-credentials' | null = null

  /**
   * Whether it *starts* silent, which is what an autoplaying video must do.
   *
   * **Named for the platform's split, which is real.** The `muted` content
   * attribute reflects to `defaultMuted`; the `muted` property is live state a
   * reader's click moves without touching the attribute. One property called
   * `muted` bound to the attribute answers what the author wrote rather than
   * whether there is sound, which is a name matching the platform's while
   * meaning something else.
   */
  @property({ attribute: 'muted', reflect: true, type: Boolean })
  defaultMuted = false

  /**
   * Whether the browser may offer picture in picture.
   */
  @property({ attribute: 'disablepictureinpicture', reflect: true, type: Boolean })
  disablePictureInPicture = false

  /**
   * Whether the browser may offer playback on a remote device.
   */
  @property({ attribute: 'disableremoteplayback', reflect: true, type: Boolean })
  disableRemotePlayback = false

  /**
   * And what they are told when it will not play at all.
   */
  @property({ attribute: 'error-label' })
  errorLabel = 'This video could not be played'

  /**
   * Controls beyond the ones every player has, named in the order they appear.
   *
   * A list rather than a property apiece. A bar is a row with a budget, and a
   * boolean per feature invites a consumer to switch all of them on: naming
   * them makes the row a decision, and makes the order theirs. Anything
   * unrecognized is skipped rather than throwing, since the list is markup and
   * a typo should cost a control, not a page.
   *
   * `pip` is offered only where the platform has it, checked rather than
   * assumed: it is absent on iPhone and behind a flag in Firefox, and a button
   * that cannot work is worse than one that is not there.
   *
   * The names are `speed`, `pip`, `remote`, `download`, `rewind`, `forward`,
   * `previous` and `next`.
   *
   * **`previous` and `next` do nothing to the video, and are offered anyway.**
   * They announce `helix-previous` and `helix-next` and stop there, so what
   * they move is whatever holds the set, which is what `VideoPlaylist` listens
   * for. A player standing alone therefore draws a pair of controls that change
   * nothing, and that is deliberate: a player cannot know whether it is inside
   * a set, and one that hid them until it could prove there was one would be a
   * player that never offers them. Name them where something is listening.
   *
   * **`download` is named and never assumed.** Offering the file is a decision
   * about the content rather than about the player, and plenty of consumers
   * decline it deliberately. It is also the one control whose success is not
   * ours to promise: the attribute is ignored cross-origin, so a file served
   * from somewhere else opens rather than saves, which is the browser's rule
   * and not something a player can work around.
   */
  @property({ attribute: 'extra-controls' })
  extraControls = ''

  /**
   * How long the bar waits after the pointer stops before it goes, in ms.
   *
   * A wait rather than leaving with the pointer, or a reader moving across the
   * picture to reach a control watches the bar vanish under them. Zero turns
   * the wait off and the bar goes immediately; a large number keeps it up for
   * as long as anyone is likely to look.
   *
   * The wait is only ever about *idling*. A video that is paused keeps its bar
   * regardless, because a reader who stopped it is deciding what to do next.
   */
  @property({ attribute: 'idle-delay', type: Number })
  idleDelay = 2500

  /**
   * Accessible name, since a video is not described by its filename.
   */
  @property()
  label = ''

  /**
   * What a reader is told while the picture is waiting for more of itself.
   */
  @property({ attribute: 'loading-label' })
  loadingLabel = 'Loading'

  /**
   * Whether it starts again at the end.
   */
  @property({ reflect: true, type: Boolean })
  loop = false

  /**
   * Controls that go behind one button instead of onto the bar, named the same
   * way.
   *
   * **Named rather than measured, and the reason is that a width cannot answer
   * this.** A media query asks about the window, and the bar's problem is its
   * own width: a video in a 320px sidebar on a desktop is cramped and a
   * full-bleed hero on a phone is not. A container query asks the right
   * question and still cannot answer it, because how many controls there are is
   * the consumer's, so the threshold is not a width but a width per control,
   * which is a guess. And a control that moves between the bar and a hidden
   * menu as the layout shifts is a control the reader has to find twice.
   *
   * So the consumer says where the fold is, which they can, having already
   * named the controls in order. A name in both lists is drawn once, on the
   * bar: two of the same control is worse than either placement.
   */
  @property({ attribute: 'overflow-controls' })
  overflowControls = ''

  /**
   * And while it would stop it.
   */
  @property({ attribute: 'pause-label' })
  pauseLabel = 'Pause'

  /**
   * What the play control is called while it would start the video.
   */
  @property({ attribute: 'play-label' })
  playLabel = 'Play'

  /**
   * Whether the file this points at is ours to hand over.
   *
   * `blob:` and `data:` named rather than compared, because the rule `download`
   * actually follows is same-origin *or one of those two*: a clip a consumer
   * generated in the page has no origin to match and is theirs to save by
   * definition. Comparing origins alone called both foreign, so the one case
   * where a download certainly works was the one case it was not offered.
   */
  private get localFile(): boolean {
    if (this.src === '') {
      return false
    }
    if (this.src.startsWith('blob:') || this.src.startsWith('data:')) {
      return true
    }
    if (typeof location === 'undefined') {
      return false
    }
    try {
      return new URL(this.src, location.href).origin === location.origin
    } catch {
      return false
    }
  }

  /**
   * Whether it plays where it sits rather than taking over the screen.
   */
  @property({ attribute: 'playsinline', converter: onUnlessFalse })
  playsInline = true

  /**
   * A still shown before it plays, which the platform draws itself.
   */
  @property()
  poster = ''

  /**
   * How much to fetch before anything is asked for.
   */
  @property()
  preload: 'auto' | 'metadata' | 'none' = 'metadata'

  /**
   * The speeds offered, slowest first, as multipliers of normal.
   */
  @property({ attribute: 'speeds' })
  speeds = '0.5 1 1.5 2'

  /**
   * Where the video is, for the common case of one file.
   */
  @property()
  src = ''

  /**
   * The big mark over the picture whenever it is not playing, or `none`.
   *
   * **On unless it is turned off, because a stopped video has nothing else.**
   * Measured on the bar as it was: the play glyph is 16 by 16 in a 24 by 24
   * target, which is 0.12% of a 528 by 396 picture and 0.33% at 320. What a
   * reader meets first is a still frame with some chrome along the bottom, and
   * nothing in it says "press to watch".
   *
   * `none` is for the cases where that is wrong rather than right: a muted loop
   * behind a hero, a grid of eight thumbnails, anything where the video is
   * decoration rather than something to start.
   *
   * A value rather than a boolean, so the resting state is the attribute's
   * absence: a boolean defaulting to on would have to be spelled as its own
   * negation.
   */
  @property({ attribute: 'start-control' })
  startControl?: 'none'

  /**
   * Whether playback has stopped to wait for data.
   *
   * **Only ever after somebody asked for playback**, which is what `waiting`
   * means: the element wanted the next frame and did not have it. Before that,
   * a video that has loaded nothing is a poster with a play control over it,
   * which looks deliberate and is. A spinner there would say something is
   * happening when nothing is, on every video on the page.
   *
   * The case this covers is the one that looks like a bug: a picture frozen
   * mid-play, the scrubber stopped, and nothing on screen saying why.
   */
  @state()
  private buffering = false

  /**
   * Whether the source failed, which is the other thing a frozen frame can
   * mean.
   */
  @state()
  private failed = false

  @state()
  private playing = false

  @state()
  private position = 0

  @state()
  private knownDuration = 0

  @state()
  private loudness = 1

  @state()
  private silent = false

  @state()
  private full = false

  @state()
  private captioned = false

  /**
   * Which caption track is showing, or `-1` for none.
   *
   * `@state`, because it is read off the video rather than declared: a consumer
   * asking for a language would be naming a track that may not have loaded, and
   * `default` on the `<track>` is the platform's own way to say it.
   */
  @state()
  private captionIndex = -1

  /**
   * How many caption tracks there are, which decides which control is drawn.
   *
   * A count and not a boolean. Tracks resolve after the element renders, so
   * this is what schedules the update that draws the control at all, and a
   * boolean goes false to true when the first track arrives and then never
   * moves again: a second one landing leaves the toggle in place and the
   * language menu unreachable on exactly the videos it exists for.
   */
  @state()
  private captionCount = 0

  /**
   * The cue on screen now, as nodes, or nothing between cues.
   *
   * Nodes rather than a string, because `VTTCue.text` is the cue's *source*:
   * WebVTT carries markup, and a caption file in the wild is full of it. `<v
   * Hildy>` names who is speaking, `<b>` and `<i>` and `<u>` mark emphasis, and
   * `<c.loud>` classes a line. Rendered as text every one of those arrives on
   * screen as visible angle brackets.
   *
   * `getCueAsHTML` is the platform parsing its own format, so nothing here has
   * to know the grammar and no cue text is ever treated as HTML: what comes
   * back is a fragment the browser built, not a string anybody interpolated.
   */
  @state()
  private cue: DocumentFragment | undefined

  @state()
  private rate = 1

  /**
   * Whether the reader has been still long enough for the bar to go.
   */
  @state()
  private idle = false

  /**
   * Whether anything on the network offers to play this.
   */
  @state()
  private remoteAvailable = false

  /**
   * Whether it is playing somewhere else right now.
   */
  @state()
  private remoteConnected = false

  /*
   * The concerns that are not the picture, each in a module beside this one.
   * They report into the states above rather than holding their own, because
   * the render reads the states and the specs reach them.
   */
  private readonly cues = new CueController(this, () => this.handleCue())

  private readonly fullscreen = new FullscreenController(this, (full) => {
    this.full = full
  })

  private readonly idler = new IdleController(
    this,
    () => this.idleDelay,
    (idle) => {
      this.idle = idle
    },
  )

  private readonly remote = new RemotePlaybackController(this, {
    available: (available) => {
      this.remoteAvailable = available
    },
    connected: (connected) => {
      this.remoteConnected = connected
    },
  })

  private readonly session = new MediaSessionController(this)

  /** Whether this platform can do a named control at all. */
  private offers(one: string): boolean {
    /* As a server answers while hydrating what it sent: it has no document to
       ask, so it offered none, and a render that differs is a template Lit
       throws on. The update after hydration asks. */
    if (one === 'pip') {
      return !this.hydrating && typeof document !== 'undefined' && document.pictureInPictureEnabled
    }
    /* Availability, not support. A device that can play this has to exist for
       the button to mean anything: an AirPlay control with nothing to send to
       is a control that opens an empty list, which is worse than no control.
       `watchAvailability` is what answers that, and it answers late, so this
       reads a flag the watch keeps rather than asking. */
    if (one === 'remote') {
      return this.remoteAvailable
    }
    /* A download needs something to download. `src` and not a slotted
       `<source>`: the element chose one of those and which one is the
       browser's business, so offering a specific file would be a guess about a
       decision already made. */
    if (one === 'download') {
      return this.src !== ''
    }
    /* Always offered, because there is nothing to check. Neither of these does
       anything to the video: they say the reader asked, and whatever holds the
       set answers. A player that hid them until it could prove a set existed
       would be a player that cannot know. */
    if (one === 'next' || one === 'previous') {
      return true
    }
    /* A skip needs only a timeline, and a video that has none cannot be played
       at all, so there is nothing here to check either. */
    if (one === 'forward' || one === 'rewind') {
      return true
    }
    return one === 'speed'
  }

  /** The extras asked for, in order, and only the ones this platform can do. */
  private get extras(): string[] {
    return this.extraControls
      .split(/\s+/)
      .filter(Boolean)
      .filter((one) => this.offers(one))
  }

  /**
   * The controls asked for behind the overflow button, in order.
   *
   * A name in both lists is on the bar and not here. Drawing it twice is worse
   * than either placement, and the bar is the one a reader can see.
   */
  private get overflow(): string[] {
    const onBar = new Set(this.extras)
    return this.overflowControls
      .split(/\s+/)
      .filter(Boolean)
      .filter((one) => !onBar.has(one) && this.offers(one))
  }

  /**
   * The sources and caption tracks to copy into the video, as the consumer
   * wrote them.
   */
  @state()
  private media: { attrs: Record<string, string>; tag: 'source' | 'track' }[] = []

  /**
   * The media's own state, under the platform's own names.
   *
   * **Published because there is no other way in.** The `<video>` is inside
   * this shadow root and `querySelector` does not cross it, so a consumer
   * asking where the video has reached has nowhere else to ask.
   *
   * **Read from the element, with the mirror as the fallback.** The element is
   * the truth and the mirror is a render cache that a media event refreshes, so
   * reading the mirror alone would answer with whatever the last `timeupdate`
   * said rather than with where the video is now. The fallback is what answers
   * on the server and before the first render, where there is no element and
   * the mirror holds what markup asked for.
   *
   * **Accessors rather than reactive properties**, because none of these is a
   * setting: they are the media's state, and a `@property` would give each one
   * an attribute that a consumer could write and the element would then have to
   * disagree with. Where the platform makes one writable this writes it
   * through, and where the platform does not neither does this.
   */
  get currentSrc(): string {
    return this.video?.currentSrc ?? ''
  }

  /**
   * Where playback has reached, in seconds.
   *
   * Writing seeks, through the same clamp `seek` uses, because a `currentTime`
   * past the end is the one write the platform answers with an exception.
   */
  get currentTime(): number {
    return this.video?.currentTime ?? this.position
  }

  set currentTime(seconds: number) {
    this.position = seconds
    this.seek(seconds)
  }

  /** The rate playback returns to, which `defaultPlaybackRate` names natively. */
  get defaultPlaybackRate(): number {
    return this.video?.defaultPlaybackRate ?? 1
  }

  set defaultPlaybackRate(rate: number) {
    const video = this.video
    if (video) {
      video.defaultPlaybackRate = rate
    }
  }

  /** How long the media runs, in seconds, and `NaN` until that is known. */
  get duration(): number {
    return this.video?.duration ?? this.knownDuration
  }

  /** Whether playback has run off the end. */
  get ended(): boolean {
    return this.video?.ended ?? false
  }

  /** Whether playback is stopped, which is the resting state and not an error. */
  get paused(): boolean {
    return this.video?.paused ?? !this.playing
  }

  /** How fast it plays, where 1 is the recorded speed. */
  get playbackRate(): number {
    return this.video?.playbackRate ?? this.rate
  }

  set playbackRate(rate: number) {
    this.rate = rate
    const video = this.video
    if (video) {
      video.playbackRate = rate
    }
  }

  /** Whether pitch is held steady when the rate changes. */
  get preservesPitch(): boolean {
    return this.video?.preservesPitch ?? true
  }

  set preservesPitch(preserve: boolean) {
    const video = this.video
    if (video) {
      video.preservesPitch = preserve
    }
  }

  /** Whether it is currently moving to a new position. */
  get seeking(): boolean {
    return this.video?.seeking ?? false
  }

  /** The media's own height in pixels, and zero until the metadata has loaded. */
  get videoHeight(): number {
    return this.video?.videoHeight ?? 0
  }

  /** The media's own width in pixels, and zero until the metadata has loaded. */
  get videoWidth(): number {
    return this.video?.videoWidth ?? 0
  }

  /**
   * Whether there is sound, now, which a reader's click moves.
   *
   * The live half of the pair above. Writing mutes or unmutes the media itself
   * rather than the attribute, which is what the platform does and what the
   * mute control here has always done directly.
   */
  get muted(): boolean {
    return this.video?.muted ?? this.defaultMuted
  }

  set muted(quiet: boolean) {
    this.silent = quiet
    const video = this.video
    if (video) {
      video.muted = quiet
    }
  }

  /** How loud it plays, 0 to 1. */
  get volume(): number {
    return this.video?.volume ?? this.loudness
  }

  set volume(level: number) {
    this.loudness = level
    const video = this.video
    if (video) {
      video.volume = level
    }
  }

  private get video(): HTMLVideoElement | null {
    return this.partNamed<HTMLVideoElement>('video')
  }

  /**
   * Starts playing, where the platform allows it.
   *
   * The rejection is swallowed on purpose: a browser refuses `play()` when
   * nothing the reader did asked for it, and that is a policy answer rather than
   * a fault. What follows a refused play is a paused player showing its start
   * control, which is the correct thing to be looking at.
   */
  play(): void {
    void this.video?.play().catch(() => {})
  }

  /** Stops, leaving the frame up. */
  pause(): void {
    this.video?.pause()
  }

  /** Toggles playback, which is what every key and the button both come to. */
  toggle(): void {
    const video = this.video
    if (!video) {
      return
    }
    if (video.paused) {
      this.play()
    } else {
      this.pause()
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
   * The scrubber's new position, and the reason these two are named at all.
   *
   * **The stop is the first line.** `input` is composed by specification, so a
   * range inside this shadow root sends its own straight past the host to
   * whoever is listening on it, and this component declares no `input`: a
   * consumer binding one received the scrubber's and the volume rail's under a
   * name Video never promised, carrying a seconds count or a level between zero
   * and one rather than anything about the element.
   *
   * Every family that renders a native control needs this, not only the form
   * controls: a media component with two rails in its chrome is neither a form
   * control nor exempt from the mechanism.
   */
  private takeScrub(event: Event): void {
    event.stopPropagation()
    this.seek(Number((event.target as HTMLInputElement).value))
  }

  /** The volume rail's new level, stopped for the reason `takeScrub` carries. */
  private takeVolume(event: Event): void {
    event.stopPropagation()
    const video = this.video
    if (!video) {
      return
    }
    video.volume = Number((event.target as HTMLInputElement).value)
    video.muted = false
  }

  /** Whether the first set of copies has been read from the children. */
  private mediaRead = false

  /**
   * The copies to make of what the default slot is given.
   *
   * The attribute list is explicit rather than a blind copy of every attribute:
   * these are two elements with a known and small surface, and copying anything
   * a consumer happened to put on one would carry their framework's own markers
   * into a shadow root that has no use for them.
   */
  private copiesOf(
    elements: Element[],
  ): { attrs: Record<string, string>; tag: 'source' | 'track' }[] {
    return elements
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

  /**
   * Rebuilds the copies when what is slotted changes after the first read.
   *
   * The same set again is not a change. A video reloads for every new list, and
   * the first `slotchange` reports the children this element already read.
   */
  private readonly handleMedia = (event: Event): void => {
    const next = this.copiesOf((event.target as HTMLSlotElement).assignedElements())
    if (JSON.stringify(next) !== JSON.stringify(this.media)) {
      this.media = next
    }
  }

  private readonly handleLoaded = (): void => {
    const video = this.video
    if (!video) {
      return
    }
    this.knownDuration = video.duration
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
      this.style.setProperty(
        '--video-intrinsic-ratio',
        `${video.videoWidth} / ${video.videoHeight}`,
      )
    }
    /* What the first caption track is doing, which is not always nothing: a
       `<track default>` starts showing without anyone pressing anything, so a
       button that began at "off" reported the opposite of what was on screen. */
    const track = video.textTracks[0]
    if (track) {
      this.captioned = adoptTrack(track)
      this.cues.follow(track)
      this.handleCue()
    }
  }

  private readonly handleTime = (): void => {
    this.position = this.video?.currentTime ?? 0
  }

  /* Relayed, because none of these cross a shadow boundary on their own. The
     video is inside this element's shadow root, so a consumer listening on the
     element they wrote hears nothing at all without this. Input relays `change`
     for the same reason. */
  /* `emptied` is in the list for a reason worth keeping. Assigning `src` runs
     the media load algorithm, which stops playback and sets `paused` without
     firing `pause`: the only events are `emptied` and `loadstart`. Listening for
     `play` and `pause` alone, this element went on believing it was playing
     after a playlist pointed it at the next entry, so the start control it draws
     only when paused stayed hidden and there was nothing at all to press.
     Measured: `paused` true, `playing` true, no `pause` event in the log. */
  private readonly handleWaiting = (): void => {
    this.buffering = true
  }

  /* Anything that means the picture can move again. `loadstart` is in the list
     because a new source clears the last one's failure: a playlist pointing the
     player somewhere else must not keep showing the error from the entry
     before. */
  private readonly handleReady = (event: Event): void => {
    this.buffering = false
    if (event.type === 'loadstart') {
      this.failed = false
    }
  }

  private readonly handleError = (): void => {
    this.buffering = false
    this.failed = true
  }

  private readonly handleState = (event: Event): void => {
    const video = this.video
    this.playing = video ? !video.paused : false
    if (event.type === 'emptied' || event.type === 'pause') {
      this.buffering = false
    }
    if (event.type === 'play') {
      this.claimSession()
    }
    this.session.report(this.playing)
    /* Non-bubbling, which is what the platform sends and what makes these reach
       a React consumer at all.
     *
     * `play`, `pause` and `ended` are in react-dom's `nonDelegatedEvents`, read
     * out of the installed 19.2.8 rather than remembered: it concatenates the
     * whole media list onto `beforetoggle cancel close invalid load scroll
     * scrollend toggle`. React attaches those directly to `<video>`, `<audio>`
     * and `<img>` and never to a custom element, so nothing at the root hears
     * them. `bindReactHandler` is what closes that, and `reactPropFor` skips
     * anything that bubbles, on the grounds that a bubbling relay is already
     * reaching React's delegated listener and a second binding would double
     * every call.
     *
     * So these three were sending `bubbles: true` into the one branch that
     * refuses to bind, and `onPlay`, `onPause` and `onEnded` on `<helix-video>`
     * were silent in React. The comment beside `reactPropFor` named this exact
     * trio as fixed while this line kept it broken. Matching the platform's own
     * propagation fixes it and is what `Image` already does with `load` and
     * `error`. */
    this.dispatchEvent(new Event(event.type, { bubbles: false, composed: false }))
  }

  /**
   * Takes the page's media session, on play rather than on render: a page
   * with two players gives it to whichever one the reader started. The skip
   * keys are offered only where the consumer named something to skip to.
   */
  private claimSession(): void {
    const skips = `${this.extraControls} ${this.overflowControls}`.split(/\s+/)
    this.session.claim(
      { artwork: this.poster, title: this.label },
      {
        next: skips.includes('next') ? () => this.skip(false) : null,
        previous: skips.includes('previous') ? () => this.skip(true) : null,
        seek: (seconds) => this.seek(seconds),
        skipBy: (seconds) => this.skipBy(seconds),
        toggle: () => this.toggle(),
      },
    )
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
    /* The track that is showing, not the first one. With one track those are
       the same and with two they are not, so a reader on the second language
       was shown the first one's words. */
    const track = captionTracks(this.video)[this.captionIndex] ?? this.video?.textTracks[0]
    this.cue = activeCue(track)
  }

  /**
   * Moves by a fixed length, clamped by `seek`.
   *
   * Separate from the arrow keys, which move by 5 and by 10 with Shift. Those
   * are a scrub; this is the gesture for "I missed that", and a reader who
   * presses it twice expects twenty seconds rather than an accelerating jump.
   */
  private skipBy(seconds: number): void {
    const video = this.video
    if (!video) {
      return
    }
    this.seek(video.currentTime + seconds)
  }

  /** Shows one track and disables every other, or shows none at `-1`. */
  private showCaption(index: number): void {
    showCaption(captionTracks(this.video), index)
    this.captionIndex = index
    this.captioned = index >= 0
    this.cue = undefined
  }

  /** Turns captions on or off, which is what the button means with one track. */
  private toggleCaptions(): void {
    if (captionTracks(this.video).length === 0) {
      return
    }
    this.showCaption(this.captioned ? -1 : 0)
  }

  /**
   * Says the reader asked for another item, and does nothing else.
   *
   * There is nothing else it could do. A `<video>` plays one resource, so what
   * comes before or after it is a fact this element does not hold: a playlist
   * has it, or the consumer does. Announcing is the whole of the contribution,
   * and the event bubbles so a wrapper hears it.
   *
   * The same call answers the button, the row in the overflow menu, and the
   * skip keys on a headset, which is why the media session's handlers point
   * here rather than at anything of their own.
   */
  private skip(back: boolean): void {
    this.dispatchEvent(back ? new HelixPreviousEvent() : new HelixNextEvent())
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
   * A press on the picture plays or pauses it.
   *
   * **The picture is the biggest target a player has**, and on every other
   * player a reader has used it is the one that stops the thing. A component
   * that spends the whole frame on a video and then asks for a 32 pixel button
   * is one that works only for people who know where the button is.
   *
   * **Two cases where it must not.** The first is `controls`, where the browser
   * draws its own bar over the picture and owns what a press on it means: acting
   * as well would toggle twice, once here and once in the UA, which cancels out
   * and looks broken.
   *
   * The second is a player whose chrome has gone idle. There, the first press is
   * asking for the controls back rather than asking to pause, which is what
   * every touch player does: `stir` brings them, and the press is spent. A
   * second press, with the bar showing, means what it says. This is also why the
   * check is `idle` rather than a pointer-type test: it is the same answer for a
   * mouse left resting until the bar faded.
   */
  private readonly handlePicture = (): void => {
    if (this.controls) {
      return
    }
    if (this.idle) {
      this.idler.stir()
      return
    }
    this.toggle()
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
      case 'j': {
        this.skipBy(-SKIP_SECONDS)
        break
      }
      case 'l': {
        this.skipBy(SKIP_SECONDS)
        break
      }
      case 'm': {
        video.muted = !video.muted
        break
      }
      case 'f': {
        void this.fullscreen.toggle()
        break
      }
      default: {
        return
      }
    }
    event.preventDefault()
  }

  /** The caption tracks among the copies, named as the menu names them. */
  private captions: Caption[] = []

  /**
   * Reads the copies, and names the caption tracks among them before the
   * render that draws them.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The first copies, from the children and before the first render, so the
       video it draws already holds them. Not on the server, which has no
       children, nor while hydrating a server's markup, which was drawn with
       none: a declarative shadow root reports its slot's contents before any
       listener is there to hear it, so the update after hydration reads them
       here instead. `slotchange` keeps them in step after that. */
    if (!this.mediaRead && this.children !== undefined && !this.hydrating) {
      this.mediaRead = true
      this.media = this.copiesOf([...this.children].filter((child) => child.slot === ''))
    }
    if (changed.has('media')) {
      this.captions = captionsAmong(this.media)
      this.captionCount = this.captions.length
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.finishHydration()
    const video = this.video
    if (video) {
      /* **Silent as asked, which the attribute alone did not make it.** The
         platform starts a video muted from its `muted` attribute only when the
         parser creates it; one a template creates takes the attribute after, as
         `defaultMuted`, and plays with sound, and a browser blocks the autoplay
         a muted video is allowed. A `muted` set before the render, React's way
         of writing it, reached no video at all. Measured: `muted` false under
         the attribute on a client, true on a page a server sent. */
      if (this.defaultMuted || this.silent) {
        video.muted = true
      }
      this.silent = video.muted
      this.loudness = video.volume
      void this.remote.attach(video)
    }
  }

  /**
   * Mirrors playback onto the host as `data-playing`.
   *
   * Because CSS cannot ask. `paused` is a property of a `<video>` and never an
   * attribute, so `video:not([paused])` matches every video that has ever
   * existed and a rule written on it hides the bar always, including on the
   * paused video it was written to keep the bar up for.
   *
   * **A `data-` attribute is right here because of when it is written.** A fact
   * that can be true on the first update mirrors to a custom state instead, or
   * a consumer's server sends markup the element then grows an attribute on and
   * React reports a mismatch it will not patch up. Nothing plays until somebody
   * presses play, so this one is written long past hydration and there is
   * nothing for it to disagree with. `data-closed` on `Toast.Item` and
   * `data-scrolled` on `AppHeader` are the same case; `:state(open)` and
   * `:state(checked)` are the other one.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.toggleAttribute('data-playing', this.playing)
    /* `data-idle` rather than a hover rule alone, so the stylesheet can say
       "playing, and nobody has moved for a while" instead of "playing and the
       pointer is not on it this instant". */
    this.toggleAttribute('data-idle', this.idle && this.playing)
    /* A media element decides what to play once, when it is created or when it
       is told to look again. Copies that arrive after that are markup it has
       already walked past. */
    if (changed.has('media')) {
      this.video?.load()
    }
  }

  /**
   * One named control, as a button on the bar.
   *
   * A method rather than four branches inlined, because the same four names are
   * asked for twice now, once for the bar and once for the menu behind it, and
   * two lists that have to stay in step is how a control ends up offered in one
   * place and not the other.
   */
  protected renderExtra(one: string): TemplateResult {
    if (one === 'remote') {
      return html`<button
        part="remote"
        type="button"
        aria-label="Play on another device"
        aria-pressed=${this.remoteConnected ? 'true' : 'false'}
        @click=${() => void this.remote.prompt()}
      >
        ${drawIcon(airplay)}
      </button>`
    }
    /* Two templates rather than one with the name bound in, for the reason
       written under `previous` below: a part is read from the source as a
       literal, so `part=${one}` is a part no check can prove anything about. */
    if (one === 'rewind') {
      return html`<button
        part="rewind"
        type="button"
        aria-label=${`Back ${SKIP_SECONDS} seconds`}
        @click=${() => this.skipBy(-SKIP_SECONDS)}
      >
        ${drawIcon(arrowCounterClockwise)}
      </button>`
    }
    if (one === 'forward') {
      return html`<button
        part="forward"
        type="button"
        aria-label=${`Forward ${SKIP_SECONDS} seconds`}
        @click=${() => this.skipBy(SKIP_SECONDS)}
      >
        ${drawIcon(arrowClockwise)}
      </button>`
    }
    if (one === 'speed') {
      return html`<button
        part="speed"
        type="button"
        aria-label="Playback speed"
        @click=${() => this.cycleSpeed()}
      >
        ${this.rate}x
      </button>`
    }
    /* Two templates rather than one with the name bound in, because a part is
       read from the source as a literal: `part=${one}` is a part no stylesheet
       can be proved to reach, and nothing can match it against the
       documentation either. */
    if (one === 'previous') {
      return html`<button
        part="previous"
        type="button"
        aria-label="Previous"
        @click=${() => this.skip(true)}
      >
        ${drawIcon(skipBack)}
      </button>`
    }
    if (one === 'next') {
      return html`<button
        part="next"
        type="button"
        aria-label="Next"
        @click=${() => this.skip(false)}
      >
        ${drawIcon(skipForward)}
      </button>`
    }
    if (one === 'download') {
      /* A real anchor, because saving a file is the browser's job and there is
         no scripted version of it worth having.
       *
       * **`download` only where it means something.** The attribute is honored
       * for a same-origin file and ignored for any other, whatever headers come
       * back, so on a video served from a CDN it does nothing and the press
       * *navigates*: measured, clicking it took the whole page to the mp4, which
       * reads as the player disappearing. Writing an attribute the browser will
       * ignore is a lie in the markup, so it is written only when it holds.
       *
       * A new tab where it does not. That is the best a page can do with someone
       * else's file, and it is the difference between handing the reader the
       * video and taking away the one they were watching. */
      const local = this.localFile
      return html`<a
        part="download"
        ?download=${local}
        href=${this.src}
        target=${local ? nothing : '_blank'}
        rel=${local ? nothing : 'noreferrer'}
        aria-label="Download"
      >
        ${drawIcon(download)}
      </a>`
    }
    return html`<button
      part="pip"
      type="button"
      aria-label="Picture in picture"
      @click=${() => void this.togglePip()}
    >
      ${drawIcon(pictureInPicture)}
    </button>`
  }

  /**
   * A toggle for one track, a menu for several, and nothing for none.
   *
   * No menu at one, because a menu of a single language plus "Off" is a
   * two-state control wearing a popover, and the button already says which
   * state it is in through `aria-pressed`. The moment there are two the button
   * cannot say which one is on, so it stops being a button.
   *
   * The label comes off the track: `label` where the markup gave one, and
   * `srclang` where it did not, because a `<track>` with neither is a track
   * nobody can choose between and that is the markup's fault to fix, not this
   * component's to paper over with "Track 2".
   */
  protected renderCaptions(): TemplateResult | typeof nothing {
    /* Named from the copies rather than from the video's tracks, which this
       same render is what puts there: the count and the names come from one
       list, taken before it. */
    const tracks = this.captions
    if (this.captionCount === 0) {
      return nothing
    }
    if (this.captionCount === 1) {
      return html`<button
        part="captions"
        type="button"
        aria-label="Captions"
        aria-pressed=${this.captioned ? 'true' : 'false'}
        @click=${() => this.toggleCaptions()}
      >
        ${drawIcon(closedCaptioning)}
      </button>`
    }
    return html`<${this.tag('menu')} part="captions-menu"
    exportparts="back: captions-menu-back, back-mark: captions-menu-back-mark, empty: captions-menu-empty,
      header: captions-menu-header, loading: captions-menu-loading, surface: captions-menu-surface,
      title: captions-menu-title" label="Subtitles" placement="top-end">
      <button part="captions" slot="trigger" type="button" aria-label="Subtitles">
        ${drawIcon(closedCaptioning)}
      </button>
      <${this.tag('menu-item')}
        part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        value="off"
        aria-checked=${this.captionIndex < 0 ? 'true' : 'false'}
        role="menuitemradio"
        @helix-select=${() => this.showCaption(-1)}
      >
        Off
      </${this.tag('menu-item')}>
      ${tracks.map(
        (track, at) => html`<${this.tag('menu-item')} part="entry"
        exportparts="item: entry-item, mark: entry-mark, start: entry-start"
          value=${track.language || String(at)}
          aria-checked=${this.captionIndex === at ? 'true' : 'false'}
          role="menuitemradio"
          @helix-select=${() => this.showCaption(at)}
        >
          ${track.label || track.language}
        </${this.tag('menu-item')}>`,
      )}
    </${this.tag('menu')}>`
  }

  /*
   * The same control as a row in the overflow menu.
   *
   * The label is words rather than a mark, which is the difference between a
   * bar and a menu: a row has the width for a name and a reader scanning one is
   * reading rather than recognizing. `download` is a linked row, which is what
   * `Menu.Item`'s `href` is for.
   */
  protected renderOverflowItem(one: string): TemplateResult {
    if (one === 'remote') {
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        value="remote"
        @helix-select=${() => void this.remote.prompt()}
      >
        ${drawIcon(airplay, { slot: 'start' })}
        Play on another device
      </${this.tag('menu-item')}>`
    }
    if (one === 'speed') {
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="speed" @helix-select=${() => this.cycleSpeed()}>
        ${drawIcon(gauge, { slot: 'start' })}
        Playback speed: ${this.rate}x
      </${this.tag('menu-item')}>`
    }
    if (one === 'rewind' || one === 'forward') {
      const back = one === 'rewind'
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        value=${one}
        @helix-select=${() => this.skipBy(back ? -SKIP_SECONDS : SKIP_SECONDS)}
      >
        ${drawIcon(back ? arrowCounterClockwise : arrowClockwise, { slot: 'start' })}
        ${back ? `Back ${SKIP_SECONDS} seconds` : `Forward ${SKIP_SECONDS} seconds`}
      </${this.tag('menu-item')}>`
    }
    if (one === 'previous') {
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="previous" @helix-select=${() => this.skip(true)}>
        ${drawIcon(skipBack, { slot: 'start' })}
        Previous
      </${this.tag('menu-item')}>`
    }
    if (one === 'next') {
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="next" @helix-select=${() => this.skip(false)}>
        ${drawIcon(skipForward, { slot: 'start' })}
        Next
      </${this.tag('menu-item')}>`
    }
    if (one === 'download') {
      const local = this.localFile
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        ?download=${local}
        href=${this.src}
        rel=${local ? nothing : 'noreferrer'}
        target=${local ? nothing : '_blank'}
        value="download"
      >
        ${drawIcon(download, { slot: 'start' })}
        Download
      </${this.tag('menu-item')}>`
    }
    return html`<${this.tag('menu-item')} part="entry"
    exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="pip" @helix-select=${() => void this.togglePip()}>
      ${drawIcon(pictureInPicture, { slot: 'start' })}
      Picture in picture
    </${this.tag('menu-item')}>`
  }

  protected renderBar(): TemplateResult {
    const done = this.knownDuration > 0 ? this.position / this.knownDuration : 0
    return html`<div part="controls">
      <button
        part="play"
        type="button"
        aria-label=${this.playing ? this.pauseLabel : this.playLabel}
        @click=${() => this.toggle()}
      >
        ${drawIcon(this.playing ? pause : play)}
      </button>
      <span part="time">${clock(this.position)} / ${clock(this.knownDuration)}</span>
      <input
        part="scrubber"
        type="range"
        min="0"
        max=${Number.isFinite(this.knownDuration) && this.knownDuration > 0 ? this.knownDuration : 0}
        step="0.01"
        .value=${String(this.position)}
        aria-label="Seek"
        aria-valuetext=${`${clock(this.position)} of ${clock(this.knownDuration)}`}
        style=${`--video-progress: ${done}`}
        @input=${this.takeScrub}
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
        ${drawIcon(this.silent || this.loudness === 0 ? speakerX : speakerHigh)}
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
        style=${`--video-level: ${this.silent ? 0 : this.loudness}`}
        @input=${this.takeVolume}
      />
      </span>
      ${this.renderCaptions()}
      ${this.extras.map((one) => this.renderExtra(one))}
      ${
        this.overflow.length === 0
          ? nothing
          : html`<${this.tag('menu')} part="overflow"
          exportparts="back: overflow-back, back-mark: overflow-back-mark, empty: overflow-empty,
            header: overflow-header, loading: overflow-loading, surface: overflow-surface,
            title: overflow-title" label="More controls" placement="top-end">
              <button part="more" slot="trigger" type="button" aria-label="More controls">
                ${drawIcon(dotsThreeVertical)}
              </button>
              ${this.overflow.map((one) => this.renderOverflowItem(one))}
            </${this.tag('menu')}>`
      }
      ${
        /* Whatever else belongs on this bar, put here by whoever knows.
           A playlist's dropdown is the case this was written for and the video
           deliberately knows nothing about it: `helix-video-playlist` renders a
           menu of its own entries into this slot, so the popover machinery and
           the notion of a set of clips both stay in the component that is about
           a set of clips. Before fullscreen, which is always the last thing on
           a control bar because it is the one that changes what the bar is
           attached to. */
        ''
      }
      <slot name="controls"></slot>
      <button
        part="fullscreen"
        type="button"
        aria-label=${this.full ? 'Exit fullscreen' : 'Fullscreen'}
        aria-pressed=${this.full ? 'true' : 'false'}
        @click=${() => void this.fullscreen.toggle()}
      >
        ${drawIcon(this.full ? cornersIn : cornersOut)}
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
        @pointermove=${this.idler.stir}
        @pointerleave=${this.idler.leave}
        @focusin=${this.idler.stir}
      >
      <video
        part="video"
        aria-label=${this.label || nothing}
        src=${this.src || nothing}
        poster=${this.poster || nothing}
        preload=${this.preload}
        crossorigin=${this.crossOrigin ?? nothing}
        ?autoplay=${this.autoplay}
        ?controls=${this.controls}
        ?disablepictureinpicture=${this.disablePictureInPicture}
        ?disableremoteplayback=${this.disableRemotePlayback}
        ?loop=${this.loop}
        ?muted=${this.defaultMuted}
        ?playsinline=${this.playsInline}
        @click=${this.handlePicture}
        @loadedmetadata=${this.handleLoaded}
        @timeupdate=${this.handleTime}
        @volumechange=${this.handleVolume}
        @play=${this.handleState}
        @pause=${this.handleState}
        @ended=${this.handleState}
        @emptied=${this.handleState}
        @waiting=${this.handleWaiting}
        @playing=${this.handleReady}
        @canplay=${this.handleReady}
        @loadstart=${this.handleReady}
        @error=${this.handleError}
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
      ${this.cue === undefined ? nothing : html`<p aria-live="off" part="cue">${this.cue}</p>`}
      ${
        /* Top left, over the frame, and empty unless something is slotted.
           A player inside a set has somewhere to go back to and a player on its
           own does not, so the video draws whatever it is handed and decides
           nothing: a `back` property would be this component holding an opinion
           about navigation, which is the consumer's. */
        ''
      }
      <div part="back"><slot name="back"></slot></div>
      <slot name="poster" part="poster"></slot>
      ${
        /* A live region rather than a spinning box, because the reader who most
           needs to be told the picture is waiting is the one who cannot see it
           spin. `polite`, so it waits its turn, and it goes when the frame moves
           again. */
        this.buffering && !this.failed
          ? html`<div
              part="loading"
              role="status"
              aria-live="polite"
            >
              <span part="loading-mark" aria-hidden="true"></span>
              ${this.loadingLabel}
            </div>`
          : nothing
      }
      ${
        /* And the other thing a frozen frame can mean. `alert`, because nothing
           further is going to happen and a reader waiting politely for a video
           that will never load is waiting forever. */
        this.failed
          ? html`<div
              part="failure"
              role="alert"
            >
              ${this.errorLabel}
            </div>`
          : nothing
      }
      ${
        /* Whenever it is not playing, which is what the mark means: press this
           to play. Not only before the first play, which would make the mark
           mean two different things at two moments that are the same state.
           Every player a reader has used shows it on pause, and the one who
           paused to study a frame clears it by pressing the thing in the way.

           Not drawn at all where the browser draws its own controls, since that
           bar has a play button and two would be two. */
        this.controls ||
        this.playing ||
        this.buffering ||
        this.failed ||
        this.startControl === 'none'
          ? nothing
          : html`<button
              part="start"
              type="button"
              aria-label=${this.playLabel}
              @click=${() => this.toggle()}
            >
              ${drawIcon(play)}
            </button>`
      }
      ${this.controls ? nothing : this.renderBar()}
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-video': HelixHeadlessVideo
  }
}
