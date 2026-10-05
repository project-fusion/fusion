import {
  activeCue,
  adoptTrack,
  type Caption,
  CueController,
  captionsAmong,
  captionTracks,
  copiesOf,
  customElement,
  drawIcon,
  FullscreenController,
  fillTemplate,
  HelixElement,
  HelixNextEvent,
  HelixPreviousEvent,
  IdleController,
  type MediaCopy,
  MediaSessionController,
  onUnlessFalse,
  RemotePlaybackController,
  reportRuntime,
  SKIP_SECONDS,
  sameCopies,
  showCaption,
  writtenList,
  writtenNumbers,
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
import { HelixHeadlessMenu } from '../../menu/root/menu-root.js'
import { barControls, type Conditions, menuControls, ownFile } from './extra-controls.js'
import { takeKey } from './keys.js'

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
 * @summary A video player with controls drawn by Helix.
 *
 * @description
 * The picture is a native `<video>`, so decoding, buffering, captions, Picture
 * in Picture, AirPlay, and codecs come from the platform. The component
 * replaces the control bar, because the native bar cannot be styled.
 *
 * The scrubber and the volume are `<input type="range">` elements, so arrow
 * keys, Home and End, touch targets, and screen reader announcements work as
 * they do natively.
 *
 * When you set `controls`, the browser's control bar is used, the Helix bar is
 * not drawn, and the keys below are not bound, so a key press does not seek
 * twice.
 *
 * The keys match other players, and they are bound on the element only:
 * - Space and `k` play or pause.
 * - The arrow keys seek and change the volume.
 * - `m` mutes.
 * - `f` toggles fullscreen.
 *
 * `<source>` and `<track>` children are copied into the video. A media element
 * selects resources from its own child nodes, and a slot is one node, so
 * slotted sources would give the video no text tracks, no current source, and a
 * `readyState` of zero, and it would not play. They are copied so your light
 * DOM stays intact, and are copied again whenever the slot changes.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Player, Media, Movie
 * @documentation https://fusion.dev/helix/components/video
 *
 * @slot - `<source>` and `<track>` elements, which are copied into the video.
 * @slot controls - Extra controls, added to the control bar before the fullscreen button.
 * @slot header - Content over the top left of the picture, such as a heading and a back button.
 * @slot poster - Shown over the video until it starts.
 *
 * @event {Event} ended - The video reached its end. Relayed from the inner video, since the native event does not cross the shadow boundary.
 * @event {HelixNextEvent} helix-next - The next video was requested. Load it in response.
 * @event {HelixPreviousEvent} helix-previous - The previous video was requested. Load it in response.
 * @event {Event} pause - Playback paused. Relayed from the inner video.
 * @event {Event} play - Playback started. Relayed from the inner video.
 *
 * @csspart captions - The button that turns captions on and off.
 * @csspart captions-menu - The menu of caption languages, when the video has more than one track.
 * @csspart captions-menu-back - The control that returns from a submenu.
 * @csspart captions-menu-back-mark - The glyph on the back control of a submenu.
 * @csspart captions-menu-empty - The text shown when the menu has no items.
 * @csspart captions-menu-header - The bar above a submenu, holding the way back and its name.
 * @csspart captions-menu-live - The inner menu's `live` part, a live region that repeats the empty and loading text for screen readers.
 * @csspart captions-menu-loading - The text shown while the items are loading.
 * @csspart captions-menu-surface - The floating panel the menu is drawn on.
 * @csspart captions-menu-title - The name of the submenu that is showing.
 * @csspart controls - The control bar along the bottom.
 * @csspart cue - The caption currently on screen, drawn by this element.
 * @csspart download - The button that downloads the file, when `extra-controls` includes it.
 * @csspart entry - One row in a menu that the player opens.
 * @csspart entry-item - The row, which is an `<a>` where `href` is set.
 * @csspart entry-mark - The trailing mark: a check mark when the row is checked, or a caret when it opens a submenu.
 * @csspart entry-start - The leading column that holds the `start` slot. It is always rendered.
 * @csspart failure - The message shown when the source cannot be played.
 * @csspart forward - The button that skips forward ten seconds.
 * @csspart fullscreen - The button that enters and leaves fullscreen.
 * @csspart header - The region at the top left that holds the `header` slot.
 * @csspart live - A live region that repeats the loading text, so screen readers announce it when it changes. Visually hidden in the styled tier.
 * @csspart loading - The text shown while the video waits for more data. Draw the spinner
 * with `::part(loading)::before` in your stylesheet. This tier ships no CSS and renders
 * no extra box for it.
 * @csspart more - The button that opens the `overflow` menu.
 * @csspart mute - The button that turns sound on and off.
 * @csspart next - The button that requests the next video, when `extra-controls` includes it.
 * @csspart overflow - The menu that holds the controls kept off the bar.
 * @csspart overflow-back - The control that returns from a submenu.
 * @csspart overflow-back-mark - The glyph on the back control of a submenu.
 * @csspart overflow-empty - The text shown when the menu has no items.
 * @csspart overflow-header - The bar above a submenu, holding the way back and its name.
 * @csspart overflow-live - The inner menu's `live` part, a live region that repeats the empty and loading text for screen readers.
 * @csspart overflow-loading - The text shown while the items are loading.
 * @csspart overflow-surface - The floating panel the menu is drawn on.
 * @csspart overflow-title - The name of the submenu that is showing.
 * @csspart pip - The picture-in-picture button, when `extra-controls` includes it and the browser supports it.
 * @csspart play - The button that plays and pauses.
 * @csspart poster - The poster that covers the video before it plays.
 * @csspart previous - The button that requests the previous video, when `extra-controls` includes it.
 * @csspart remote - The button that plays the video on another device, when one is available.
 * @csspart remote-pressed - The remote control while the picture is on another device, beside `remote`.
 * @csspart rewind - The button that skips back ten seconds.
 * @csspart scrubber - The slider that shows the position and moves playback to a new one.
 * @csspart sound - The mute button and the volume slider, grouped as one control.
 * @csspart speed - The playback speed control, when `extra-controls` includes it.
 * @csspart stage - The box holding the picture and its controls, and the focus
 * target the keys are bound to.
 * @csspart start - The large play button over the picture, shown while the video is not playing.
 * @csspart time - The position and the duration.
 * @csspart video - The video itself.
 * @csspart volume - The volume slider.
 *
 * @cssproperty --video-intrinsic-ratio - The media's own aspect ratio, once it is known. `--video-aspect-ratio` overrides it.
 * @cssproperty --video-level - The current volume, 0 to 1.
 * @cssproperty --video-progress - How far playback has reached, as a fraction of the duration.
 */
@customElement('helix-headless-video')
export class HelixHeadlessVideo extends HelixElement {
  /**
   * Whether the video starts playing on its own. Browsers allow this only while
   * it is muted.
   *
   * Forwarded rather than acted on. Whether an unprompted play is permitted is
   * the browser's policy and not this element's, and `play()` already swallows
   * the refusal: what follows a refused autoplay is a paused player showing its
   * start control, which is the correct thing to be looking at.
   */
  @property({ reflect: true, type: Boolean })
  autoplay = false

  /**
   * The name of the captions control when the video has one track. The control
   * turns that track on and off.
   *
   * **Every word this player speaks is a property**, so a page in another
   * language hears its own: the play, pause, loading and error labels were,
   * and the rest of the bar read out in English beside them.
   */
  @property({ attribute: 'captions-label' })
  captionsLabel = 'Captions'

  /**
   * The name of the row that turns captions off, when the video has several
   * tracks.
   */
  @property({ attribute: 'captions-off-label' })
  captionsOffLabel = 'Off'

  /**
   * Whether the browser draws its native controls. When set, this element draws
   * no controls of its own.
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
   * Whether the video starts muted, which an autoplaying video must do.
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
   * Whether picture in picture is turned off, so the browser does not offer it.
   */
  @property({ attribute: 'disablepictureinpicture', reflect: true, type: Boolean })
  disablePictureInPicture = false

  /**
   * Whether remote playback is turned off, so the browser does not offer to
   * play on another device.
   */
  @property({ attribute: 'disableremoteplayback', reflect: true, type: Boolean })
  disableRemotePlayback = false

  /**
   * What the control that saves the file is called.
   */
  @property({ attribute: 'download-label' })
  downloadLabel = 'Download'

  /**
   * The message shown when the video cannot be played.
   */
  @property({ attribute: 'error-label' })
  errorLabel = 'This video could not be played'

  /**
   * Extra controls to add to the bar, named in the order they appear.
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
   * What the control that skips ahead is called, with `{seconds}` filled in.
   */
  @property({ attribute: 'forward-label' })
  forwardLabel = 'Forward {seconds} seconds'

  /**
   * What the control that fills the screen is called.
   *
   * **One name, pressed or not**, since the button says which with
   * `aria-pressed`: a name that changed as well read out "Exit fullscreen,
   * pressed", which is two answers to one question.
   */
  @property({ attribute: 'fullscreen-label' })
  fullscreenLabel = 'Fullscreen'

  /**
   * How long the control bar stays after the pointer stops moving, in
   * milliseconds.
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
   * Accessible name for the video, which its filename does not provide.
   */
  @property()
  label = ''

  /**
   * The text announced while the video waits for more data.
   */
  @property({ attribute: 'loading-label' })
  loadingLabel = 'Loading'

  /**
   * Whether the video starts again at the end.
   */
  @property({ reflect: true, type: Boolean })
  loop = false

  /**
   * What the button that opens `overflow-controls` is called.
   */
  @property({ attribute: 'more-label' })
  moreLabel = 'More controls'

  /**
   * The name of the mute control. The control shows as pressed while the video
   * is muted.
   */
  @property({ attribute: 'mute-label' })
  muteLabel = 'Mute'

  /**
   * What the control that asks for the next video is called.
   */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next'

  /**
   * Controls to place in a menu behind one button, named the same way as
   * `extra-controls`.
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
   * The name of the play control while pressing it would pause the video.
   */
  @property({ attribute: 'pause-label' })
  pauseLabel = 'Pause'

  /**
   * How the volume is read out, with `{percent}` filled in.
   */
  @property({ attribute: 'percent-label' })
  percentLabel = '{percent} percent'

  /**
   * What the control that floats the video over other windows is called.
   */
  @property({ attribute: 'pip-label' })
  pipLabel = 'Picture in picture'

  /**
   * The name of the play control while pressing it would start the video.
   */
  @property({ attribute: 'play-label' })
  playLabel = 'Play'

  /**
   * Whether the video plays in place, inside the page.
   */
  @property({ attribute: 'playsinline', converter: onUnlessFalse })
  playsInline = true

  /**
   * An image shown before the video plays, drawn by the browser.
   */
  @property()
  poster = ''

  /**
   * How much of the video to load before playback is requested.
   */
  @property()
  preload: 'auto' | 'metadata' | 'none' = 'metadata'

  /**
   * What the control that asks for the previous video is called.
   */
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous'

  /**
   * What the control that casts the video to another device is called.
   */
  @property({ attribute: 'remote-label' })
  remoteLabel = 'Play on another device'

  /**
   * What the control that skips back is called, with `{seconds}` filled in.
   */
  @property({ attribute: 'rewind-label' })
  rewindLabel = 'Back {seconds} seconds'

  /**
   * What the scrubber is called.
   */
  @property({ attribute: 'seek-label' })
  seekLabel = 'Seek'

  /**
   * What the control that changes the speed is called.
   */
  @property({ attribute: 'speed-label' })
  speedLabel = 'Playback speed'

  /**
   * The speeds offered, slowest first, as multipliers of normal.
   */
  @property({ attribute: 'speeds' })
  speeds = '0.5 1 1.5 2'

  /**
   * The URL of the video, when there is one file.
   */
  @property()
  src = ''

  /**
   * The large play button over the picture while the video is not playing. Set
   * `none` to hide it.
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
   * What the menu of tracks is called, where the video has several.
   */
  @property({ attribute: 'subtitles-label' })
  subtitlesLabel = 'Subtitles'

  /**
   * How the scrubber reads out where the video is, with `{position}` and
   * `{duration}` filled in.
   */
  @property({ attribute: 'time-label' })
  timeLabel = '{position} of {duration}'

  /**
   * What the volume slider is called.
   */
  @property({ attribute: 'volume-label' })
  volumeLabel = 'Volume'

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

  /** Which of the player's own menus is open, for its trigger to say so. */
  @state()
  private menuOpen: 'captions' | 'overflow' | undefined = undefined

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

  /** What the roster asks about this player, which is the whole of what it reads. */
  private get conditions(): Conditions {
    return {
      hydrating: this.hydrating,
      refusedPip: this.disablePictureInPicture,
      remote: this.remoteAvailable,
      source: this.src !== '',
    }
  }

  /** The extras asked for, in order, and only the ones this platform can do. */
  private get extras(): string[] {
    return barControls(this.extraControls, this.conditions)
  }

  /** The controls asked for behind the overflow button, in order. */
  private get overflow(): string[] {
    return menuControls(this.overflowControls, this.extras, this.conditions)
  }

  /**
   * The sources and caption tracks to copy into the video, as the consumer
   * wrote them.
   */
  @state()
  private media: MediaCopy[] = []

  /**
   * The URL of the source the video is playing.
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

  /** The playback rate the video returns to by default. */
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

  /** Whether playback is paused, which is the resting state. */
  get paused(): boolean {
    return this.video?.paused ?? !this.playing
  }

  /** How fast the video plays, where 1 is the recorded speed. */
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

  /** Whether the video is moving to a new position. */
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
   * Whether the video is muted right now. The mute control changes it.
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

  /** The volume, from 0 to 1. */
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
   * Starts playback, if the browser allows it.
   *
   * The rejection is swallowed on purpose: a browser refuses `play()` when
   * nothing the reader did asked for it, and that is a policy answer rather than
   * a fault. What follows a refused play is a paused player showing its start
   * control, which is the correct thing to be looking at.
   */
  play(): void {
    void this.video?.play().catch(() => {})
  }

  /** Pauses playback and leaves the current frame showing. */
  pause(): void {
    this.video?.pause()
  }

  /**
   * Plays the video if it is paused, and pauses it if it is playing. The play
   * button and the play keys call this.
   */
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

  /** Rebuilds the copies when what is slotted changes after the first read. */
  private readonly handleMedia = (event: Event): void => {
    const next = copiesOf((event.target as HTMLSlotElement).assignedElements())
    if (!sameCopies(next, this.media)) {
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
     * refuses to bind, and `onPlay`, `onPause` and `onEnded` on
     * `<helix-headless-video>` were silent in React. The comment beside
     * `reactPropFor` named this exact trio as fixed while this line kept it
     * broken. Matching the platform's own propagation fixes it and is what
     * `Image` already does with `load` and `error`. */
    this.dispatchEvent(new Event(event.type, { bubbles: false, composed: false }))
  }

  /**
   * Takes the page's media session, on play rather than on render: a page
   * with two players gives it to whichever one the reader started. The skip
   * keys are offered only where the consumer named something to skip to.
   */
  private claimSession(): void {
    const skips = writtenList(`${this.extraControls} ${this.overflowControls}`)
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
    /* A playback rate of zero is not a rate, which is video's own fact and not
       the utility's. */
    const speeds = writtenNumbers(this.speeds).filter((one) => one > 0)
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
   * Into picture in picture and back, and quiet about being refused.
   *
   * Caught rather than `void`ed, the way `FullscreenController` catches its
   * own: this is called from a click handler that discards the promise, so a
   * refusal is otherwise an unhandled rejection naming neither the element nor
   * the reason. The roster already declines to draw the button where the
   * consumer refused the feature, which leaves the refusals nothing can see
   * coming, a request without user activation and a window another document is
   * already using.
   */
  private async togglePip(): Promise<void> {
    const video = this.video
    if (!video) {
      return
    }
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture()
        return
      }
      await video.requestPictureInPicture()
    } catch (error) {
      reportRuntime({
        detail: error,
        kind: 'picture-in-picture-refused',
        message: `<${this.localName}> could not enter picture in picture. A press has to come from the reader, and one window holds it at a time.`,
        tag: this.localName,
      })
    }
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
   * A taken press is stopped here rather than in the table, because what the
   * default would have been is the element's business: the table says what the
   * key means and this says that nothing else gets it.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* Nothing at all where the browser draws the controls. Its own bar owns
       Space, the arrows and the rest, and two handlers on one key is a video
       that seeks twice or plays and immediately pauses. A consumer who asked
       for the native controls asked for the native keyboard with them. */
    if (this.controls) {
      return
    }
    const video = this.video
    if (!video) {
      return
    }
    /* A press inside a menu is the menu's, whether the menu is one of the
       player's own or one slotted into the bar, the playlist's say: its arrows
       move between rows and its Space chooses one. */
    if (event.composedPath().some((node) => node instanceof HelixHeadlessMenu)) {
      return
    }
    const taken = takeKey(event, video, {
      fullscreen: () => void this.fullscreen.toggle(),
      seek: (seconds) => this.seek(seconds),
      skipBy: (seconds) => this.skipBy(seconds),
      toggle: () => this.toggle(),
    })
    if (taken) {
      event.preventDefault()
    }
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
    if (!this.mediaRead && this.childrenKnown) {
      this.mediaRead = true
      this.media = copiesOf(this.knownChildren.filter((child) => child.slot === ''))
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
        part="remote${this.remoteConnected ? ' remote-pressed' : ''}"
        type="button"
        aria-label=${this.remoteLabel}
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
        aria-label=${fillTemplate(this.rewindLabel, { seconds: SKIP_SECONDS })}
        @click=${() => this.skipBy(-SKIP_SECONDS)}
      >
        ${drawIcon(arrowCounterClockwise)}
      </button>`
    }
    if (one === 'forward') {
      return html`<button
        part="forward"
        type="button"
        aria-label=${fillTemplate(this.forwardLabel, { seconds: SKIP_SECONDS })}
        @click=${() => this.skipBy(SKIP_SECONDS)}
      >
        ${drawIcon(arrowClockwise)}
      </button>`
    }
    if (one === 'speed') {
      return html`<button
        part="speed"
        type="button"
        aria-label=${this.speedLabel}
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
        aria-label=${this.previousLabel}
        @click=${() => this.skip(true)}
      >
        ${drawIcon(skipBack)}
      </button>`
    }
    if (one === 'next') {
      return html`<button
        part="next"
        type="button"
        aria-label=${this.nextLabel}
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
      const local = ownFile(this.src)
      return html`<a
        part="download"
        ?download=${local}
        href=${this.src}
        target=${local ? nothing : '_blank'}
        rel=${local ? nothing : 'noreferrer'}
        aria-label=${this.downloadLabel}
      >
        ${drawIcon(download)}
      </a>`
    }
    return html`<button
      part="pip"
      type="button"
      aria-label=${this.pipLabel}
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
        aria-label=${this.captionsLabel}
        aria-pressed=${this.captioned ? 'true' : 'false'}
        @click=${() => this.toggleCaptions()}
      >
        ${drawIcon(closedCaptioning)}
      </button>`
    }
    return html`<${this.tag('menu')} part="captions-menu"
    exportparts="back: captions-menu-back, back-mark: captions-menu-back-mark, empty: captions-menu-empty,
      header: captions-menu-header, live: captions-menu-live, loading: captions-menu-loading, surface: captions-menu-surface,
      title: captions-menu-title" label=${this.subtitlesLabel} placement="top-end"
      @toggle=${(event: Event) => this.heardMenu('captions', event)}>
      <button
        part="captions"
        slot="trigger"
        type="button"
        aria-label=${this.subtitlesLabel}
        aria-haspopup="menu"
        aria-expanded=${this.menuOpen === 'captions' ? 'true' : 'false'}
      >
        ${drawIcon(closedCaptioning)}
      </button>
      <${this.tag('menu-item')}
        part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        value="off"
        checkable
        exclusive
        ?checked=${this.captionIndex < 0}
        @helix-select=${() => this.showCaption(-1)}
      >
        ${this.captionsOffLabel}
      </${this.tag('menu-item')}>
      ${tracks.map(
        (track, at) => html`<${this.tag('menu-item')} part="entry"
        exportparts="item: entry-item, mark: entry-mark, start: entry-start"
          value=${track.language || String(at)}
          checkable
          exclusive
          ?checked=${this.captionIndex === at}
          @helix-select=${() => this.showCaption(at)}
        >
          ${track.label || track.language}
        </${this.tag('menu-item')}>`,
      )}
    </${this.tag('menu')}>`
  }

  /**
   * Notes which menu opened or closed, so its trigger says so.
   *
   * **The trigger is this element's own button**, so the state is written onto
   * it here: a menu cannot write onto a plain button slotted into it, and the
   * button said neither that it opens a menu nor whether that menu was open.
   */
  private heardMenu(menu: 'captions' | 'overflow', event: Event): void {
    if (event.target !== event.currentTarget) {
      return
    }
    const open = (event as Event & { newState?: string }).newState === 'open'
    if (open) {
      this.menuOpen = menu
    } else if (this.menuOpen === menu) {
      this.menuOpen = undefined
    }
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
        ${this.remoteLabel}
      </${this.tag('menu-item')}>`
    }
    if (one === 'speed') {
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="speed" @helix-select=${() => this.cycleSpeed()}>
        ${drawIcon(gauge, { slot: 'start' })}
        ${this.speedLabel}: ${this.rate}x
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
        ${fillTemplate(back ? this.rewindLabel : this.forwardLabel, { seconds: SKIP_SECONDS })}
      </${this.tag('menu-item')}>`
    }
    if (one === 'previous') {
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="previous" @helix-select=${() => this.skip(true)}>
        ${drawIcon(skipBack, { slot: 'start' })}
        ${this.previousLabel}
      </${this.tag('menu-item')}>`
    }
    if (one === 'next') {
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="next" @helix-select=${() => this.skip(false)}>
        ${drawIcon(skipForward, { slot: 'start' })}
        ${this.nextLabel}
      </${this.tag('menu-item')}>`
    }
    if (one === 'download') {
      const local = ownFile(this.src)
      return html`<${this.tag('menu-item')} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        ?download=${local}
        href=${this.src}
        rel=${local ? nothing : 'noreferrer'}
        target=${local ? nothing : '_blank'}
        value="download"
      >
        ${drawIcon(download, { slot: 'start' })}
        ${this.downloadLabel}
      </${this.tag('menu-item')}>`
    }
    return html`<${this.tag('menu-item')} part="entry"
    exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="pip" @helix-select=${() => void this.togglePip()}>
      ${drawIcon(pictureInPicture, { slot: 'start' })}
      ${this.pipLabel}
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
      <!-- Left to right on every page. A player's timeline is a tape running
           one way rather than a line of text, which is why its skip glyphs are
           not mirrored and the left arrow rewinds whatever the script. Allowed
           to follow the page, a range turns round on a right-to-left one, and
           the arrows on the scrubber moved through time the other way to the
           same arrows pressed on the video. -->
      <input
        part="scrubber"
        dir="ltr"
        type="range"
        min="0"
        max=${Number.isFinite(this.knownDuration) && this.knownDuration > 0 ? this.knownDuration : 0}
        step="0.01"
        .value=${String(this.position)}
        aria-label=${this.seekLabel}
        aria-valuetext=${fillTemplate(this.timeLabel, {
          duration: clock(this.knownDuration),
          position: clock(this.position),
        })}
        style=${`--video-progress: ${done}`}
        @input=${this.takeScrub}
      />
      <span part="sound">
      <button
        part="mute"
        type="button"
        aria-label=${this.muteLabel}
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
        aria-label=${this.volumeLabel}
        aria-valuetext=${fillTemplate(this.percentLabel, {
          percent: Math.round((this.silent ? 0 : this.loudness) * 100),
        })}
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
            header: overflow-header, live: overflow-live, loading: overflow-loading, surface: overflow-surface,
            title: overflow-title" label=${this.moreLabel} placement="top-end"
            @toggle=${(event: Event) => this.heardMenu('overflow', event)}>
              <button
                part="more"
                slot="trigger"
                type="button"
                aria-label=${this.moreLabel}
                aria-haspopup="menu"
                aria-expanded=${this.menuOpen === 'overflow' ? 'true' : 'false'}
              >
                ${drawIcon(dotsThreeVertical)}
              </button>
              ${this.overflow.map((one) => this.renderOverflowItem(one))}
            </${this.tag('menu')}>`
      }
      ${
        /* Whatever else belongs on this bar, put here by whoever knows.
           A playlist's dropdown is the case this was written for and the video
           deliberately knows nothing about it: `VideoPlaylist` renders a
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
        aria-label=${this.fullscreenLabel}
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
           about navigation, which is the consumer's. It is a header rather than a
           back button, because what sits there is a title with the way out
           beside it, and one region holds both. */
        ''
      }
      <div part="header"><slot name="header"></slot></div>
      <slot name="poster" part="poster"></slot>
      ${
        /* A live region rather than a spinning box, because the reader who most
           needs to be told the picture is waiting is the one who cannot see it
           spin. `polite`, so it waits its turn, and it goes when the frame moves
           again. */
        this.buffering && !this.failed
          ? html`<div part="loading">${this.loadingLabel}</div>`
          : nothing
      }
      ${
        /* And said by a region that is always there, whose words are the only
           thing that moves. The box above was the region, inserted with its
           words already in it, which a screen reader reads inconsistently at
           best. */
        ''
      }
      <span part="live" role="status">${this.buffering && !this.failed ? this.loadingLabel : ''}</span>
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
