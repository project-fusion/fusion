import {
  Announce,
  bare,
  headless,
  Image,
  oneOf,
  Pressable,
  Repeat,
  Slot,
  string,
  Text,
  time,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Video's headless tier: a player whose control bar Helix draws over the
 * picture.
 *
 * **The picture is the platform's**: a `<video>` on the web, and expo-video
 * on a phone through the media capability, an optional peer. A phone without
 * it draws the poster and says the video cannot be played, in the words of
 * `error-text`.
 *
 * **The bar** holds play and pause, the time, a scrubber, the mute, the
 * captions, the `extra-controls` in the order written, a menu of the
 * `overflow-controls`, the `controls` region, and fullscreen. It hides once a
 * playing video has gone `idle-delay` without a touch, and a touch brings it
 * back. On a phone the scrubber is a Slider and each menu is a Menu.
 *
 * **The keys** play, scrub, mute, fill the screen, turn captions on, and go to
 * the ends and each tenth, as core's `playerKey` says, on the web and from a
 * phone's hardware keyboard, and what a key changed is said.
 *
 * **The web's**: the browser's own bar under `controls`, the volume slider,
 * captions drawn from a side-loaded WebVTT `<track>` (a phone shows the
 * platform's from the media's own tracks), playback on another device, the
 * `<source>` list, `crossorigin`, `preload`, and the media events beyond play,
 * pause, the time, the end, and a failure.
 *
 * **Held to `helix-video`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('video', {
  props: {
    autoplay: false,
    captionsHiddenLabel: 'Captions off',
    captionsLabel: 'Captions',
    captionsOffLabel: 'Off',
    captionsShownLabel: 'Captions on',
    controls: false,
    crossorigin: web(oneOf(['anonymous', 'use-credentials'])),
    disablepictureinpicture: false,
    disableremoteplayback: web(false),
    downloadLabel: 'Download',
    errorLabel: string(),
    errorText: 'This video could not be played',
    extraControls: '',
    forwardLabel: '{seconds, plural, one {Forward # second} other {Forward # seconds}}',
    fullscreenLabel: 'Fullscreen',
    idleDelay: time('2500'),
    label: '',
    loadingLabel: string(),
    loadingText: 'Loading',
    loop: false,
    mediaTitle: '',
    moreLabel: 'More controls',
    muted: false,
    mutedLabel: 'Muted',
    muteLabel: 'Mute',
    nextLabel: 'Next',
    overflowControls: '',
    pausedLabel: 'Paused',
    pauseLabel: 'Pause',
    percentLabel: '{percent} percent',
    pipLabel: 'Picture in picture',
    playerLabel: 'Video',
    playingLabel: 'Playing',
    playLabel: 'Play',
    playsinline: web(true),
    poster: '',
    preload: web(oneOf(['auto', 'metadata', 'none'], 'metadata')),
    previousLabel: 'Previous',
    remoteLabel: 'Play on another device',
    rewindLabel: '{seconds, plural, one {Back # second} other {Back # seconds}}',
    seekLabel: 'Seek',
    speedLabel: 'Playback speed',
    speeds: '0.5 1 1.5 2',
    src: '',
    startControl: oneOf(['none']),
    subtitlesLabel: 'Subtitles',
    timeLabel: '{position} of {duration}',
    unmutedLabel: 'Unmuted',
    volumeChangedLabel: 'Volume {percent} percent',
    volumeLabel: 'Volume',
  },
  events: {
    abort: web(bare()),
    canplay: web(bare()),
    canplaythrough: web(bare()),
    durationchange: bare(),
    emptied: web(bare()),
    ended: bare(),
    error: bare(),
    loadeddata: web(bare()),
    loadedmetadata: bare(),
    loadstart: web(bare()),
    next: [],
    pause: bare(),
    play: bare(),
    playing: bare(),
    previous: [],
    progress: web(bare()),
    ratechange: bare(),
    resize: web(bare()),
    seeked: bare(),
    seeking: web(bare()),
    stalled: web(bare()),
    suspend: web(bare()),
    timeupdate: bare(),
    volumechange: bare(),
    waiting: bare(),
  },
  states: [
    'ended',
    'error',
    'fullscreen',
    'idle',
    'muted',
    'paused',
    'playing',
    'settled',
    'waiting',
  ],
  video: {
    bar: 'bar',
    captioned: 'captioned',
    captionMenu: 'captionMenu',
    captionRows: 'captionRows',
    captionToggle: 'captionToggle',
    clock: 'clock',
    extras: 'extras',
    failed: 'failed',
    failWords: 'failWords',
    full: 'full',
    level: 'level',
    named: 'named',
    onNext: 'next',
    onPrevious: 'previous',
    overflowed: 'overflowed',
    overflowRows: 'overflowRows',
    playing: 'playing',
    playWords: 'playWords',
    postered: 'postered',
    progress: 'progress',
    quiet: 'quiet',
    seekAt: 'seekAt',
    seekMax: 'seekMax',
    seekWords: 'seekWords',
    silent: 'silent',
    start: 'start',
    waiting: 'waiting',
    waitWords: 'waitWords',
  },
  render: ({ entry, props, video }) => (
    <View
      label={video.named}
      part="stage"
      role="group"
    >
      <View part="video" />
      {/* The `<source>` and `<track>` children, which the web copies into its video. */}
      <Slot platform="web" />
      {video.postered && (
        <Image
          alt=""
          part="still"
          platform="native"
          src={props.poster}
        />
      )}
      <View
        ariaHidden
        part="cue"
        platform="web"
      />
      <View part="header">
        <Slot name="header" />
      </View>
      <Slot
        name="poster"
        part="poster"
      />
      {video.waiting && (
        <View part="loading">
          <View
            ariaHidden
            part="loading-ring"
            platform="native"
          />
          <Text part="loading-words">{video.waitWords}</Text>
        </View>
      )}
      <Announce
        part="live"
        platform="web"
      />
      {video.failed && (
        <View
          part="failure"
          role="alert"
        >
          <Text part="failure-words">{video.failWords}</Text>
        </View>
      )}
      {video.start && (
        <Pressable
          ariaHidden
          label={props.playLabel}
          part="start"
          role="button"
        >
          <Slot name="start-icon">
            <View
              ariaHidden
              icon="play"
              part="start-mark"
              platform="native"
            />
          </Slot>
        </Pressable>
      )}
      {video.bar && (
        <View part="controls">
          <Pressable
            label={video.playWords}
            part="play"
            role="button"
          >
            {video.playing ? (
              <Slot name="pause-icon">
                <View
                  ariaHidden
                  icon="pause"
                  part="pause-mark"
                  platform="native"
                />
              </Slot>
            ) : (
              <Slot name="play-icon">
                <View
                  ariaHidden
                  icon="play"
                  part="play-mark"
                  platform="native"
                />
              </Slot>
            )}
          </Pressable>
          <View part="time">
            <Text part="time-words">{video.clock}</Text>
          </View>
          <View
            draws="slider"
            gives={{
              ariaLabel: props.seekLabel,
              max: video.seekMax,
              min: '0',
              step: '0.01',
              value: video.seekAt,
              valueText: video.seekWords,
            }}
            part="scrubber"
            style={{ '--video-progress': video.progress }}
          />
          <View part="sound">
            <Pressable
              label={props.muteLabel}
              part="mute"
              pressed={video.silent}
              role="button"
            >
              {video.quiet ? (
                <Slot name="mute-icon">
                  <View
                    ariaHidden
                    icon="speaker-x"
                    part="mute-mark"
                    platform="native"
                  />
                </Slot>
              ) : (
                <Slot name="volume-icon">
                  <View
                    ariaHidden
                    icon="speaker-high"
                    part="volume-mark"
                    platform="native"
                  />
                </Slot>
              )}
            </Pressable>
            <View
              part="volume"
              platform="web"
              style={{ '--video-level': video.level }}
            />
          </View>
          {video.captionToggle && (
            <Pressable
              label={props.captionsLabel}
              part="captions"
              pressed={video.captioned}
              role="button"
            >
              <Slot name="captions-icon">
                <View
                  ariaHidden
                  icon="closed-captioning"
                  part="captions-mark"
                  platform="native"
                />
              </Slot>
            </Pressable>
          )}
          {video.captionMenu && (
            <Wrap
              draws="menu"
              exports={{
                back: true,
                'back-mark': true,
                empty: true,
                header: true,
                live: true,
                loading: true,
                'search-field': true,
                surface: true,
                title: true,
              }}
              gives={{ label: props.subtitlesLabel, placement: 'top-end' }}
              part="captions-menu"
            >
              <Pressable
                into="trigger"
                label={props.subtitlesLabel}
                part="captions"
                role="button"
              >
                <Slot name="captions-icon">
                  <View
                    ariaHidden
                    icon="closed-captioning"
                    part="captions-mark"
                    platform="native"
                  />
                </Slot>
              </Pressable>
              <Repeat
                each={video.captionRows}
                key="value"
                part="caption-rows"
              >
                <Wrap
                  draws="menu-item"
                  exports={{
                    end: true,
                    item: true,
                    mark: true,
                    shortcut: true,
                    'shortcut-kbd': true,
                    'shortcut-key': true,
                    'shortcut-separator': true,
                    start: true,
                    surface: true,
                  }}
                  gives={{
                    checkable: true,
                    checked: entry.checked,
                    exclusive: true,
                    value: entry.value,
                  }}
                  part="entry"
                >
                  <Text part="entry-words">{entry.label}</Text>
                </Wrap>
              </Repeat>
            </Wrap>
          )}
          {/* A phone's extras, in the order `extra-controls` writes them. */}
          <View
            part="extras"
            platform="native"
          >
            <Repeat
              each={video.extras}
              key="name"
              part="extra-copies"
            >
              <Pressable
                label={entry.label}
                part="extra"
                pressed={entry.pressed}
                role="button"
              >
                {/* The speed says its number, and every other control its glyph. */}
                <View
                  ariaHidden
                  hidden={entry.worded}
                  icon={entry.icon}
                  part="extra-mark"
                />
                <Text part="extra-words">{entry.words}</Text>
              </Pressable>
            </Repeat>
          </View>
          {/* The web's, each drawn where `extra-controls` names it. */}
          <Pressable
            label={props.rewindLabel}
            part="rewind"
            platform="web"
            role="button"
          >
            <Slot name="rewind-icon" />
          </Pressable>
          <Pressable
            label={props.forwardLabel}
            part="forward"
            platform="web"
            role="button"
          >
            <Slot name="forward-icon" />
          </Pressable>
          <Pressable
            label={props.speedLabel}
            part="speed"
            platform="web"
            role="button"
          />
          <Pressable
            label={props.previousLabel}
            part="previous"
            platform="web"
            role="button"
          >
            <Slot name="previous-icon" />
          </Pressable>
          <Pressable
            label={props.nextLabel}
            part="next"
            platform="web"
            role="button"
          >
            <Slot name="next-icon" />
          </Pressable>
          <Pressable
            href={props.src}
            label={props.downloadLabel}
            part="download"
            platform="web"
          >
            <Slot name="download-icon" />
          </Pressable>
          <Pressable
            label={props.pipLabel}
            part="pip"
            platform="web"
            role="button"
          >
            <Slot name="pip-icon" />
          </Pressable>
          <Pressable
            also={{ 'remote-pressed': true }}
            label={props.remoteLabel}
            part="remote"
            platform="web"
            role="button"
          >
            <Slot name="remote-icon" />
          </Pressable>
          {video.overflowed && (
            <Wrap
              draws="menu"
              exports={{
                back: true,
                'back-mark': true,
                empty: true,
                header: true,
                live: true,
                loading: true,
                'search-field': true,
                surface: true,
                title: true,
              }}
              gives={{ label: props.moreLabel, placement: 'top-end' }}
              part="overflow"
            >
              <Pressable
                into="trigger"
                label={props.moreLabel}
                part="more"
                role="button"
              >
                <Slot name="more-icon">
                  <View
                    ariaHidden
                    icon="dots-three-vertical"
                    part="more-mark"
                    platform="native"
                  />
                </Slot>
              </Pressable>
              <Repeat
                each={video.overflowRows}
                key="value"
                part="overflow-rows"
              >
                <Wrap
                  draws="menu-item"
                  exports={{
                    end: true,
                    item: true,
                    mark: true,
                    shortcut: true,
                    'shortcut-kbd': true,
                    'shortcut-key': true,
                    'shortcut-separator': true,
                    start: true,
                    surface: true,
                  }}
                  gives={{ href: entry.href, value: entry.value }}
                  part="entry"
                >
                  <Text part="entry-words">{entry.label}</Text>
                </Wrap>
              </Repeat>
              <Slot
                name="speed-icon"
                platform="web"
              />
            </Wrap>
          )}
          <Slot name="controls" />
          <Pressable
            label={props.fullscreenLabel}
            part="fullscreen"
            pressed={video.full}
            role="button"
          >
            {video.full ? (
              <Slot name="exit-fullscreen-icon">
                <View
                  ariaHidden
                  icon="corners-in"
                  part="exit-fullscreen-mark"
                  platform="native"
                />
              </Slot>
            ) : (
              <Slot name="fullscreen-icon">
                <View
                  ariaHidden
                  icon="corners-out"
                  part="fullscreen-mark"
                  platform="native"
                />
              </Slot>
            )}
          </Pressable>
        </View>
      )}
    </View>
  ),
})
