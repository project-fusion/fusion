import {
  customElement,
  drawIcon,
  HelixElement,
  HelixNextEvent,
  HelixPreviousEvent,
  onUnlessFalse,
} from '@helix-io/core'
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
} from '@helix-io/icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
/* Side-effect, for the menu rows this renders. Both tiers import it, because
   this tier writes the template and the styled tier inherits it without having
   a copy of its own to remind anyone. */
import '../../menu/index.js'

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
 * Which player currently owns the page's one media session.
 *
 * There is exactly one `navigator.mediaSession` per page, and it decides what
 * the lock screen shows and where a headset's buttons land. Two players cannot
 * both have it, so the rule is written down rather than left to whichever
 * rendered last: **whoever played most recently owns it**, which is what a
 * reader means by "this one" when they press play on their headphones.
 *
 * Module scope, because the thing being shared is the page's and not any
 * element's. A player gives it up when it leaves the document, and only if it
 * still holds it: one that already lost the session to another must not clear
 * that other one's metadata on its way out.
 */
let owner: HTMLElement | undefined

/**
 * How far a skip control moves, in seconds.
 *
 * Ten, which is the number every player that has one uses, and the number the
 * platform names in `seekbackward` and `seekforward` when it hands over a
 * default. A different length here would be correct only on this player.
 */
const SKIP_SECONDS = 10

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
 * **The lock screen and a headset's buttons work, and one player owns them.**
 * There is one `navigator.mediaSession` per page, so the rule is stated rather
 * than left to render order: whichever player was started last owns it, which
 * is what a reader means by "this one" when they press play on their
 * headphones. The title comes from `label` and the artwork from `poster`.
 *
 * **`remote` sends the picture somewhere else.** The Remote Playback API is
 * what Safari implements for AirPlay and Chrome for Cast, so one control covers
 * both and the platform supplies the device list. It is offered only once
 * something has answered `watchAvailability`: a button that opens an empty list
 * is worse than no button, and a consumer who wants none can set
 * `disableremoteplayback` on this element.
 *
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
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
 * @csspart icon - A glyph this component draws.
 * @csspart stage - The box holding the picture and its controls, and the focus
 * target the keys are bound to.
 * @csspart video - The video itself.
 * @csspart poster - What covers it before it plays.
 * @csspart back - The region top left, for a way out of a set.
 * @csspart failure - What is said when the source will not play.
 * @csspart loading - What is said while the picture waits for more of itself.
 * @csspart loading-mark - The part of that which spins.
 * @csspart cue - The caption on screen now, drawn by this element.
 * @csspart controls - The bar along the bottom.
 * @csspart play - Play and pause.
 * @csspart scrubber - Where it is, and where to go.
 * @csspart time - The position and the duration.
 * @csspart sound - The speaker and its level, which are one control.
 * @csspart mute - Sound on and off.
 * @csspart volume - How loud.
 * @csspart captions - Subtitles on and off.
 * @csspart captions-menu - The language menu, where there is more than one.
 * @csspart rewind - The control that goes back ten seconds.
 * @csspart forward - The control that goes on ten seconds.
 * @csspart remote - Play on another device, where one is available.
 * @csspart speed - Playback speed, where it was asked for.
 * @csspart pip - Picture in picture, where it was asked for and exists.
 * @csspart start - The mark over the picture before anything has played.
 * @csspart next - Asks for the next item, where it was asked for.
 * @csspart previous - Asks for the previous one.
 * @csspart download - Saves the file, where it was asked for.
 * @csspart overflow - The menu holding the controls kept off the bar.
 * @csspart more - The button that opens it.
 * @csspart fullscreen - The whole screen, and back.
 *
 * @event {HelixNextEvent} helix-next - Fired when the reader asks for the next item.
 * @event {HelixPreviousEvent} helix-previous - Fired when they ask for the previous one.
 * @event {Event} play - Relayed, because it does not cross a shadow boundary.
 * @event {Event} pause - Relayed for the same reason.
 * @event {Event} ended - Relayed for the same reason.
 *
 * @cssproperty --video-intrinsic-ratio - The media's own aspect ratio, once it is known. `--video-aspect-ratio` overrides it.
 * @cssproperty --video-level - The current volume, 0 to 1.
 * @cssproperty --video-progress - How far playback has reached, as a fraction of the duration.
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
  @property({ attribute: 'plays-inline', converter: onUnlessFalse })
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
   *
   * The names are `speed`, `pip`, `remote` and `download`.
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
   * The big mark over the picture before anything has played, or `none`.
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
   * **Only before the first play.** A video paused halfway already has its bar
   * up, because a paused video never idles, so the small control is visible and
   * the reader has just used it. Covering the picture they stopped to look at
   * would be the opposite of helpful.
   *
   * A value rather than a boolean, so the resting state is the attribute's
   * absence: a boolean defaulting to on would have to be spelled as its own
   * negation.
   */
  @property({ attribute: 'start-control' })
  startControl?: 'none'

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

  /** The speeds offered, slowest first, as multipliers of normal. */
  @property({ attribute: 'speeds' })
  speeds = '0.5 1 1.5 2'

  /**
   * How long the bar waits after the pointer stops before it goes, in ms.
   *
   * It used to leave the moment the pointer did, which is not how a player
   * behaves: a reader moving across the picture to reach a control watched it
   * vanish under them. Zero turns the wait off and the bar goes immediately;
   * a large number keeps it up for as long as anyone is likely to look.
   *
   * The wait is only ever about *idling*. A video that is paused keeps its bar
   * regardless, because a reader who stopped it is deciding what to do next.
   */
  @property({ attribute: 'idle-delay', type: Number })
  idleDelay = 2500

  /** What the play control is called while it would start the video. */
  @property({ attribute: 'play-label' })
  playLabel = 'Play'

  /** And while it would stop it. */
  @property({ attribute: 'pause-label' })
  pauseLabel = 'Pause'

  /** What a reader is told while the picture is waiting for more of itself. */
  @property({ attribute: 'loading-label' })
  loadingLabel = 'Loading'

  /** And what they are told when it will not play at all. */
  @property({ attribute: 'error-label' })
  errorLabel = 'This video could not be played'

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

  /** Whether the source failed, which is the other thing a frozen frame can mean. */
  @state()
  private failed = false

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
   * A count and not a boolean, and that is the whole reason it changed. Tracks
   * resolve after the element renders, so this is what schedules the update
   * that draws the control at all; as a boolean it went false to true when the
   * first one arrived and then never moved again, so a second track landing
   * left the toggle in place and the language menu was unreachable on exactly
   * the videos it exists for.
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

  /** Whether the reader has been still long enough for the bar to go. */
  @state()
  private idle = false

  private idleTimer?: ReturnType<typeof setTimeout>

  /** Whether anything on the network offers to play this. */
  @state()
  private remoteAvailable = false

  /** Whether it is playing somewhere else right now. */
  @state()
  private remoteConnected = false

  /** Cancels the availability watch, since it outlives a single render. */
  private remoteWatch: number | undefined

  /** Whether this platform can do a named control at all. */
  private offers(one: string): boolean {
    if (one === 'pip') {
      return typeof document !== 'undefined' && document.pictureInPictureEnabled
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

  /** The sources and caption tracks to copy into the video, as the consumer wrote them. */
  @state()
  private media: { attrs: Record<string, string>; tag: 'source' | 'track' }[] = []

  private get video(): HTMLVideoElement | null {
    return this.renderRoot?.querySelector<HTMLVideoElement>('[part="video"]') ?? null
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
      this.style.setProperty(
        '--video-intrinsic-ratio',
        `${video.videoWidth} / ${video.videoHeight}`,
      )
    }
    /* Read once the video has its tracks, not from the slot. A `<track>` is
       only a caption once the platform has parsed it, and a consumer can add
       one later. */
    this.captionCount = this.captionTracks.length
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
      /* Taken off whatever it was on before adding it here. This runs from
         `loadedmetadata`, which fires again for every source a reader moves to,
         and a consumer adding a `<track>` later gets another. Added without
         removing, a playlist of six left six listeners on tracks that between
         them fire for every cue in the video. */
      this.cued?.removeEventListener('cuechange', this.handleCue)
      this.cued = track
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
    if (owner === this && typeof navigator !== 'undefined' && navigator.mediaSession) {
      navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused'
    }
    this.dispatchEvent(new Event(event.type, { bubbles: true, composed: true }))
  }

  /**
   * Takes the page's media session, and tells the platform what is playing.
   *
   * On play rather than on render, which is the ownership rule: a page with two
   * players gives the session to whichever one the reader started, so a
   * headset's buttons land on what they are listening to rather than on
   * whichever came first in the markup.
   *
   * The handlers are what make a headset's play, pause and skip work at all.
   * Without them a platform falls back to guessing which element was meant,
   * which is right often enough to hide the fault and wrong exactly when there
   * are two.
   */
  private claimSession(): void {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) {
      return
    }
    owner = this
    const session = navigator.mediaSession
    session.metadata = new MediaMetadata({
      artwork: this.poster === '' ? [] : [{ src: this.poster }],
      title: this.label,
    })
    session.setActionHandler('play', () => this.toggle())
    session.setActionHandler('pause', () => this.toggle())
    session.setActionHandler('seekbackward', (details) => {
      this.seek((this.video?.currentTime ?? 0) - (details.seekOffset ?? 10))
    })
    session.setActionHandler('seekforward', (details) => {
      this.seek((this.video?.currentTime ?? 0) + (details.seekOffset ?? 10))
    })
    session.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        this.seek(details.seekTime)
      }
    })
    /* The skip keys, and only where the consumer has said there is something to
       skip to. A headset whose skip buttons do nothing is worse than one whose
       skip buttons are not offered: the platform draws them from whether a
       handler is set, so setting one unconditionally would put two dead keys on
       every lock screen showing this video. */
    const skips = `${this.extraControls} ${this.overflowControls}`.split(/\s+/)
    /* The platform asks for a length and we answer with ours, or with its
       default where it did not say. A lock screen offering a skip that moves a
       different distance than the button on the bar is one player with two
       answers to the same gesture. */
    session.setActionHandler('seekbackward', (details) => {
      this.skipBy(-(details.seekOffset ?? SKIP_SECONDS))
    })
    session.setActionHandler('seekforward', (details) => {
      this.skipBy(details.seekOffset ?? SKIP_SECONDS)
    })
    session.setActionHandler('nexttrack', skips.includes('next') ? () => this.skip(false) : null)
    session.setActionHandler(
      'previoustrack',
      skips.includes('previous') ? () => this.skip(true) : null,
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
    const track = this.captionTracks[this.captionIndex] ?? this.video?.textTracks[0]
    const active = track?.activeCues?.[0]
    this.cue = active instanceof VTTCue ? active.getCueAsHTML() : undefined
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

  /**
   * The tracks a reader could choose between, in the order they were written.
   *
   * Filtered by kind, because `textTracks` also carries `chapters`, `metadata`
   * and `descriptions`, and a menu offering "Chapters" as a subtitle language
   * would be offering something that draws no words. Read off the video rather
   * than off the slot: a `<track>` added later is in one and not the other, and
   * the video is the one that has resolved them.
   */
  private get captionTracks(): TextTrack[] {
    const tracks = this.video?.textTracks
    if (!tracks) {
      return []
    }
    return [...tracks].filter((one) => one.kind === 'subtitles' || one.kind === 'captions')
  }

  /**
   * Shows one track and disables every other, or shows none at `-1`.
   *
   * Every other, rather than only the one that was on. Two tracks in `hidden`
   * both fire `cuechange`, so the rendered cue becomes whichever fired last and
   * a reader who switched language gets the two interleaved. Measured as two
   * subtitles alternating line by line.
   *
   * `hidden`, never `showing`. Hidden is the mode where a track still fires
   * `cuechange` and still fills `activeCues`, and the browser draws nothing,
   * which is exactly what is wanted when something else is doing the drawing.
   */
  private showCaption(index: number): void {
    const tracks = this.captionTracks
    tracks.forEach((track, at) => {
      track.mode = at === index ? 'hidden' : 'disabled'
    })
    this.captionIndex = index
    this.captioned = index >= 0
    this.cue = undefined
  }

  /** Turns captions on or off, which is what the button means with one track. */
  private toggleCaptions(): void {
    if (this.captionTracks.length === 0) {
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

  /**
   * Starts watching for something to play this on, and stops on the way out.
   *
   * The Remote Playback API is the standard one, and it is what Safari
   * implements for AirPlay and Chrome for Cast: one call covers both, where the
   * older `webkitShowPlaybackTargetPicker` covers only the first. Firefox has
   * neither, and `remote` simply being absent is what turns the control off
   * there.
   *
   * `watchAvailability` returns an id that has to be canceled, or the callback
   * outlives the element that owns it.
   */
  private async watchRemote(): Promise<void> {
    const remote = this.video?.remote
    if (!remote?.watchAvailability) {
      return
    }
    try {
      this.remoteWatch = await remote.watchAvailability((available) => {
        this.remoteAvailable = available
      })
    } catch {
      /* Refused where the media is not remotable, which is a fact about the
         source rather than an error to report: the control stays off. */
    }
  }

  /** Opens the platform's own device picker. It has no list of its own. */
  private async promptRemote(): Promise<void> {
    try {
      await this.video?.remote?.prompt()
    } catch {
      /* Dismissing the picker rejects, which is a reader saying no rather than
         anything going wrong. */
    }
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
        `<${this.localName}> could not enter fullscreen. If it is inside an iframe, that frame needs allow="fullscreen".`,
        error,
      )
    }
  }

  /**
   * Restarts the wait, on anything that counts as the reader being here.
   *
   * Pointer movement and focus both count, and both have to: a reader using the
   * keyboard never moves a pointer, and a bar that only answered the mouse
   * would leave them nothing to look at.
   */
  private readonly stir = (): void => {
    this.idle = false
    clearTimeout(this.idleTimer)
    if (this.idleDelay > 0) {
      this.idleTimer = setTimeout(() => {
        this.idle = true
      }, this.idleDelay)
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
        void this.toggleFullscreen()
        break
      }
      default: {
        return
      }
    }
    event.preventDefault()
  }

  /** The track currently being listened to, so the next one can take it off. */
  private cued: TextTrack | undefined

  private readonly handleRemoteState = (): void => {
    this.remoteConnected = this.video?.remote?.state === 'connected'
  }

  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('fullscreenchange', this.handleFullscreenChange)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    clearTimeout(this.idleTimer)
    this.cued?.removeEventListener('cuechange', this.handleCue)
    this.cued = undefined
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
    /* The watch outlives the element unless it is canceled, and a callback
       holding a removed element is a leak with a `@state` write on the end. */
    if (this.remoteWatch !== undefined) {
      void this.video?.remote?.cancelWatchAvailability?.(this.remoteWatch)
      this.remoteWatch = undefined
    }
    /* And the page's one media session goes back to nobody, but only if this
       element is the one holding it. */
    if (owner === this) {
      owner = undefined
      if (typeof navigator !== 'undefined' && navigator.mediaSession) {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.playbackState = 'none'
      }
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    const video = this.video
    if (video) {
      this.silent = video.muted
      this.loudness = video.volume
      video.remote?.addEventListener?.('connect', this.handleRemoteState)
      video.remote?.addEventListener?.('disconnect', this.handleRemoteState)
      void this.watchRemote()
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
    /* `data-idle` rather than a hover rule alone, so the stylesheet can say
       "playing, and nobody has moved for a while" instead of "playing and the
       pointer is not on it this instant". */
    this.toggleAttribute('data-idle', this.idle && this.playing)
    /* A media element decides what to play once, when it is created or when it
       is told to look again. Copies that arrive after that are markup it has
       already walked past. */
    if (changed.has('media')) {
      const video = this.video
      video?.load()
      this.captionCount = this.captionTracks.length
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
  /* `protected` rather than `private`: the method was already the seam and a
     tier above simply could not reach it. */
  protected renderExtra(one: string): TemplateResult {
    if (one === 'remote') {
      return html`<button
        part="remote"
        type="button"
        aria-label="Play on another device"
        aria-pressed=${this.remoteConnected ? 'true' : 'false'}
        @click=${() => void this.promptRemote()}
      >
        ${drawIcon(airplay)}
      </button>`
    }
    /* Two templates rather than one with the name bound in, for the reason
       written under `previous` below: a part is read from the source, so
       `part=${one}` is a part no check can prove anything about. These two were
       left bound when that pair was split, and `check:parts` had them exactly
       right: both were documented and neither could be found. */
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
       read from the source: `check:selectors` scans for the literal, so a part
       written as `part=${one}` is a part no stylesheet can be proved to reach,
       and `check:parts` cannot find it to match against the documentation
       either. It reported both of these as matching nothing. */
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
       * **`download` only where it means something.** The attribute is honoured
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

  /*
   * The same control as a row in the overflow menu.
   *
   * The label is words rather than a mark, which is the difference between a
   * bar and a menu: a row has the width for a name and a reader scanning one is
   * reading rather than recognising. `download` is a linked row, which is what
   * `Menu.Item`'s `href` is for.
   */
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
  /* `protected` rather than `private`: the method was already the seam and a
     tier above simply could not reach it. */
  protected renderCaptions(): TemplateResult | typeof nothing {
    /* Branched on the state rather than on the getter, so the render that draws
       this is one the state scheduled. Reading the tracks for their labels is
       fine either way: by the time this runs, the count that got us here was
       taken from the same list. */
    const tracks = this.captionTracks
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
    return html`<${this.tag('menu')} part="captions-menu" label="Subtitles" placement="top-end">
      <button part="captions" slot="trigger" type="button" aria-label="Subtitles">
        ${drawIcon(closedCaptioning)}
      </button>
      <${this.tag('menu-item')}
        value="off"
        aria-checked=${this.captionIndex < 0 ? 'true' : 'false'}
        role="menuitemradio"
        @helix-select=${() => this.showCaption(-1)}
      >
        Off
      </${this.tag('menu-item')}>
      ${tracks.map(
        (track, at) => html`<${this.tag('menu-item')}
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

  /* `protected` rather than `private`: the method was already the seam and a
     tier above simply could not reach it. */
  protected renderOverflowItem(one: string): TemplateResult {
    if (one === 'remote') {
      return html`<${this.tag('menu-item')}
        value="remote"
        @helix-select=${() => void this.promptRemote()}
      >
        ${drawIcon(airplay, { slot: 'start' })}
        Play on another device
      </${this.tag('menu-item')}>`
    }
    if (one === 'speed') {
      return html`<${this.tag('menu-item')} value="speed" @helix-select=${() => this.cycleSpeed()}>
        ${drawIcon(gauge, { slot: 'start' })}
        Playback speed: ${this.rate}x
      </${this.tag('menu-item')}>`
    }
    if (one === 'rewind' || one === 'forward') {
      const back = one === 'rewind'
      return html`<${this.tag('menu-item')}
        value=${one}
        @helix-select=${() => this.skipBy(back ? -SKIP_SECONDS : SKIP_SECONDS)}
      >
        ${drawIcon(back ? arrowCounterClockwise : arrowClockwise, { slot: 'start' })}
        ${back ? `Back ${SKIP_SECONDS} seconds` : `Forward ${SKIP_SECONDS} seconds`}
      </${this.tag('menu-item')}>`
    }
    if (one === 'previous') {
      return html`<${this.tag('menu-item')} value="previous" @helix-select=${() => this.skip(true)}>
        ${drawIcon(skipBack, { slot: 'start' })}
        Previous
      </${this.tag('menu-item')}>`
    }
    if (one === 'next') {
      return html`<${this.tag('menu-item')} value="next" @helix-select=${() => this.skip(false)}>
        ${drawIcon(skipForward, { slot: 'start' })}
        Next
      </${this.tag('menu-item')}>`
    }
    if (one === 'download') {
      const local = this.localFile
      return html`<${this.tag('menu-item')}
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
    return html`<${this.tag('menu-item')} value="pip" @helix-select=${() => void this.togglePip()}>
      ${drawIcon(pictureInPicture, { slot: 'start' })}
      Picture in picture
    </${this.tag('menu-item')}>`
  }

  /* `protected` rather than `private`: the method was already the seam and a
     tier above simply could not reach it. */
  protected renderBar(): TemplateResult {
    const done = this.duration > 0 ? this.position / this.duration : 0
    return html`<div part="controls">
      <button
        part="play"
        type="button"
        aria-label=${this.playing ? this.pauseLabel : this.playLabel}
        @click=${() => this.toggle()}
      >
        ${drawIcon(this.playing ? pause : play)}
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
        style=${`--video-progress: ${done}`}
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
        @input=${(event: Event) => {
          const video = this.video
          if (video) {
            video.volume = Number((event.target as HTMLInputElement).value)
            video.muted = false
          }
        }}
      />
      </span>
      ${this.renderCaptions()}
      ${this.extras.map((one) => this.renderExtra(one))}
      ${
        this.overflow.length === 0
          ? nothing
          : html`<${this.tag('menu')} part="overflow" label="More controls" placement="top-end">
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
        @click=${() => void this.toggleFullscreen()}
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
        @pointermove=${this.stir}
        @pointerleave=${() => {
          /* Leaving is the one case that does not wait: the reader has gone
             somewhere else, and there is nothing to reach for. */
          clearTimeout(this.idleTimer)
          this.idle = true
        }}
        @focusin=${this.stir}
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
           to play. It said that only before the first play, on the reasoning
           that a paused video keeps its bar so the small control is already
           there. True, and it makes the mark mean two different things at two
           moments that are the same state. Every player a reader has used shows
           it on pause, and the one who paused to study a frame clears it by
           pressing the thing in the way.

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
    'helix-base-video': HelixBaseVideo
  }
}
