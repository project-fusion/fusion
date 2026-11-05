/**
 * What a phone's player draws, worked out from its props and from where its
 * media stands: the parts the bar holds, the words each control says, and the
 * rows of its menus, as the web's player renders them.
 */
import type { CaptionTrack, Playback } from '@fusion.dev/helix-core/capabilities/types'
import {
  barControls,
  clock,
  menuControls,
  PLAYER_SKIP_SECONDS,
  type PlayerConditions,
} from '@fusion.dev/helix-core/player'
import { formatMessage } from '@fusion.dev/helix-core/words'

/** What the player knows of its media and of itself, beside its props. */
export interface Held {
  /** The caption track shown, or `null` for none. */
  readonly caption: string | null
  readonly full: boolean
  readonly playback: Playback
  /** Whether a phone can play the media at all. */
  readonly plays: boolean
  /** Whether a play has started since the source was set, which takes the poster away. */
  readonly played: boolean
  readonly rate: number
  readonly tracks: readonly CaptionTrack[]
}

/** A prop, read by its camel-case name. */
export type Read = (name: string) => unknown

const words = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The glyph each extra control draws, by its name. */
const ICONS: Readonly<Record<string, string>> = {
  download: 'download',
  forward: 'arrow-clockwise',
  next: 'skip-forward',
  pip: 'picture-in-picture',
  previous: 'skip-back',
  remote: 'airplay',
  rewind: 'arrow-counter-clockwise',
  speed: 'gauge',
}

/** The words that name an extra control, on the bar and in the menu. */
const labelOf = (one: string, read: Read, lang: string): string => {
  if (one === 'rewind' || one === 'forward') {
    return formatMessage(words(read(`${one}Label`)), { seconds: PLAYER_SKIP_SECONDS }, lang)
  }
  return words(read(`${one}Label`))
}

/** What the roster asks of a phone: picture in picture where the system has it, no remote, and a file. */
export const conditionsOf = (read: Read, pip: boolean): PlayerConditions => ({
  pip: pip && read('disablepictureinpicture') !== true,
  remote: false,
  source: words(read('src')) !== '',
})

/** A caption track by the name a reader chooses it by. */
const trackName = (track: CaptionTrack): string => track.label || track.language

/** The rows of the captions menu: off, then each track the media carries. */
const captionRows = (read: Read, held: Held) => [
  { checked: held.caption === null, label: words(read('captionsOffLabel')), value: 'off' },
  ...held.tracks.map((track) => ({
    checked: held.caption === track.id,
    label: trackName(track),
    value: `caption:${track.id}`,
  })),
]

/** The extras on the bar, each a press with its glyph, the speed its number. */
const extrasOf = (names: readonly string[], read: Read, held: Held, lang: string) =>
  names.map((name) => ({
    icon: ICONS[name] ?? '',
    label: labelOf(name, read, lang),
    name,
    pressed: false,
    worded: name === 'speed',
    words: name === 'speed' ? `${held.rate}x` : '',
  }))

/** The rows of the overflow menu, each named in words, the download a link. */
const overflowOf = (names: readonly string[], read: Read, held: Held, lang: string) =>
  names.map((name) => ({
    href: name === 'download' ? words(read('src')) : '',
    label:
      name === 'speed' ? `${labelOf(name, read, lang)}: ${held.rate}x` : labelOf(name, read, lang),
    value: name,
  }))

/** Whether the media plays, waits, or failed, and whether the platform draws the controls. */
const standing = (read: Read, held: Held) => {
  const failed = !held.plays || held.playback.failed
  return {
    failed,
    own: read('controls') === true,
    playing: !held.playback.paused && !failed,
    waiting: held.playback.waiting && !failed,
  }
}

/** Where the media has reached, as the bar's clock and the scrubber say it. */
const timeOf = (read: Read, playback: Playback, lang: string) => {
  const length = Math.max(playback.duration, 0)
  return {
    clock: `${clock(playback.time)} / ${clock(length)}`,
    progress: length > 0 ? playback.time / length : 0,
    seekAt: String(playback.time),
    seekMax: String(length),
    seekWords: formatMessage(
      words(read('timeLabel')),
      { duration: clock(length), position: clock(playback.time) },
      lang,
    ),
  }
}

/** The controls the bar and its menus hold. */
const controlsOf = (read: Read, held: Held, pip: boolean, lang: string, own: boolean) => {
  const conditions = conditionsOf(read, pip)
  const extras = barControls(words(read('extraControls')), conditions)
  const overflow = menuControls(words(read('overflowControls')), extras, conditions)
  return {
    captioned: held.caption !== null,
    captionMenu: !own && held.tracks.length > 1,
    captionRows: captionRows(read, held),
    captionToggle: !own && held.tracks.length === 1,
    extras: extrasOf(extras, read, held, lang),
    overflowed: overflow.length > 0,
    overflowRows: overflowOf(overflow, read, held, lang),
  }
}

/** What the player's parts read, by the names the tree computes. */
export const videoValues = (read: Read, held: Held, pip: boolean, lang: string) => {
  const { playback } = held
  const { failed, own, playing, waiting } = standing(read, held)
  return {
    ...timeOf(read, playback, lang),
    ...controlsOf(read, held, pip, lang, own),
    /* A phone without the player draws no controls that would do nothing. */
    bar: !own && held.plays,
    failed,
    failWords: words(read('errorLabel')) || words(read('errorText')),
    full: held.full,
    level: playback.muted ? 0 : 1,
    named: words(read('label')) || words(read('playerLabel')),
    playing,
    playWords: words(read(playing ? 'pauseLabel' : 'playLabel')),
    postered: words(read('poster')) !== '' && (!held.played || failed),
    quiet: playback.muted,
    silent: playback.muted,
    start: !(own || playing || waiting || failed) && read('startControl') !== 'none',
    waiting,
    waitWords: words(read('loadingLabel')) || words(read('loadingText')),
  }
}

/** The states the element is in, which its styles read, as the web's custom states. */
export const marksOf = (values: ReturnType<typeof videoValues>, held: Held, idle: boolean) => [
  ...(held.playback.ended ? ['ended'] : []),
  ...(values.failed ? ['error'] : []),
  ...(held.full ? ['fullscreen'] : []),
  ...(idle && values.playing ? ['idle'] : []),
  ...(held.playback.muted ? ['muted'] : []),
  ...(values.playing ? ['playing'] : ['paused']),
  ...(values.waiting ? ['waiting'] : []),
]
