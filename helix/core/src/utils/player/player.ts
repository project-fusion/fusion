/**
 * What a video player's controls say and do, worked out from its props and
 * from where its media stands, for the web's player and a phone's alike.
 *
 * Nothing here reaches a media element or draws anything: the clock the bar
 * shows, which extra controls a player offers and which of them go behind the
 * overflow button, the next playback speed, and what each key asks for.
 */

import { writtenList, writtenNumbers } from '../written-list/written-list.js'

/** How far the skip controls, `j` and `l`, and Shift with an arrow move, in seconds. */
export const PLAYER_SKIP_SECONDS = 10

/** How far an arrow alone moves, in seconds, the distance a native `<video controls>` moves by. */
export const PLAYER_STEP_SECONDS = 5

/**
 * Seconds as a clock, with an hour only when there is one.
 *
 * `0:42` and not `00:00:42`. A reader comparing the position to the duration is
 * reading two numbers at a glance, and leading zeroes that never change are
 * digits in the way of the ones that do.
 */
export const clock = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const padded = String(whole % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${padded}`
    : `${minutes}:${padded}`
}

/** What the existence of a control depends on, which only the player can answer. */
export interface PlayerConditions {
  /** Whether the platform offers picture in picture here, and the player has not refused it. */
  readonly pip: boolean
  /** Whether anything on the network has offered to play this. */
  readonly remote: boolean
  /** Whether a file is named, which is what a download needs. */
  readonly source: boolean
}

/**
 * Whether this platform can do a named control at all.
 *
 * `remote` is availability, not support: an AirPlay control with nothing to
 * send to opens an empty list. A download needs a file named by `src`.
 * Previous and next say the reader asked, and whatever holds the set answers,
 * so they are always offered, as the skips and the speed are.
 */
export const playerOffers = (one: string, player: PlayerConditions): boolean => {
  if (one === 'pip') {
    return player.pip
  }
  if (one === 'remote') {
    return player.remote
  }
  if (one === 'download') {
    return player.source
  }
  return ['forward', 'next', 'previous', 'rewind', 'speed'].includes(one)
}

/**
 * What `full` stands for in a list of controls: every control that does
 * something to the video by itself. `download`, `previous` and `next` are left
 * out, since offering the file is a decision about the content, and the other
 * two move a set the player cannot see.
 */
export const FULL_CONTROLS = ['rewind', 'forward', 'speed', 'pip', 'remote'] as const

/** The names in a written list, with `full` read as the controls it stands for, each once. */
export const controlNames = (written: string): string[] => [
  ...new Set(
    writtenList(written).flatMap((one): readonly string[] =>
      one === 'full' ? FULL_CONTROLS : [one],
    ),
  ),
]

/** The extras asked for on the bar, in order, and only the ones this platform can do. */
export const barControls = (written: string, player: PlayerConditions): string[] =>
  controlNames(written).filter((one) => playerOffers(one, player))

/**
 * The controls asked for behind the overflow button, in order. A name in both
 * lists is on the bar and not here, since the bar is the one a reader can see.
 */
export const menuControls = (
  written: string,
  onBar: readonly string[],
  player: PlayerConditions,
): string[] => {
  const bar = new Set(onBar)
  return controlNames(written).filter((one) => !bar.has(one) && playerOffers(one, player))
}

/**
 * The speed after `rate` among the `written` speeds, round to the first after
 * the last, or `undefined` where none is offered. A rate of zero is no rate.
 */
export const speedAfter = (written: string, rate: number): number | undefined => {
  const speeds = writtenNumbers(written).filter((one) => one > 0)
  if (speeds.length === 0) {
    return undefined
  }
  return speeds[(speeds.indexOf(rate) + 1) % speeds.length] ?? 1
}

/** What a key asks of a player. */
export type PlayerKey =
  | { readonly kind: 'captions' | 'fullscreen' | 'mute' | 'toggle' }
  /** A move from where the media stands, in seconds. */
  | { readonly kind: 'seek-by' | 'skip-by'; readonly seconds: number }
  /** A move to a share of the media's length: Home, End, or a digit, which needs a known length. */
  | { readonly kind: 'seek-to'; readonly share: number; readonly needsLength: boolean }
  /** A change of the volume by a tenth of its range. */
  | { readonly kind: 'volume-by'; readonly by: number }

/** The keys `playerKey` answers, as `aria-keyshortcuts` names them. */
export const PLAYER_KEYS =
  'Space K ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight J L ArrowUp ArrowDown M F C Home End 0 1 2 3 4 5 6 7 8 9'

/** The keys that ask for one thing whatever else is held. */
const PLAIN: Readonly<Record<string, PlayerKey>> = {
  ' ': { kind: 'toggle' },
  ArrowDown: { by: -0.1, kind: 'volume-by' },
  ArrowUp: { by: 0.1, kind: 'volume-by' },
  c: { kind: 'captions' },
  End: { kind: 'seek-to', needsLength: false, share: 1 },
  f: { kind: 'fullscreen' },
  Home: { kind: 'seek-to', needsLength: false, share: 0 },
  j: { kind: 'skip-by', seconds: -PLAYER_SKIP_SECONDS },
  k: { kind: 'toggle' },
  l: { kind: 'skip-by', seconds: PLAYER_SKIP_SECONDS },
  m: { kind: 'mute' },
}

/**
 * What `key` asks of a player, or `undefined` for a key it leaves alone.
 *
 * Space and `k` play or pause, an arrow across moves five seconds and ten with
 * `shift`, an arrow up or down moves the volume a tenth, `j` and `l` skip as
 * the bar's skips do, `m` mutes, `f` fills the screen, `c` turns captions on
 * and off, Home and End go to the ends, and a digit goes to that tenth.
 */
export const playerKey = (key: string, shift: boolean): PlayerKey | undefined => {
  const step = shift ? PLAYER_SKIP_SECONDS : PLAYER_STEP_SECONDS
  if (key === 'ArrowRight' || key === 'ArrowLeft') {
    return { kind: 'seek-by', seconds: key === 'ArrowRight' ? step : -step }
  }
  if (/^[0-9]$/.test(key)) {
    return { kind: 'seek-to', needsLength: true, share: Number(key) / 10 }
  }
  return PLAIN[key]
}
