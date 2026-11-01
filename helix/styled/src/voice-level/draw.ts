/**
 * The arithmetic behind a voice level's two drawings, with no canvas in it.
 *
 * Every function takes plain numbers and returns plain numbers, so the shapes
 * are held by a pure spec and the element is left with measuring a box and
 * filling paths.
 */

/** What a voice level draws. */
export type VoiceLevelPattern = 'spectrum' | 'waves'

/** The bar count the spectrum draws where `--voice-level-bars` says nothing. */
export const DEFAULT_BARS = 24

/** The fewest and the most bars a spectrum draws, whatever the hook asks for. */
export const MIN_BARS = 3
export const MAX_BARS = 96

/**
 * How fast a bar or a wave follows a louder reading and a quieter one, as a
 * rate per second.
 *
 * **Up fast and down slower**, as a meter's needle moves: a syllable shows the
 * frame it starts, and the fall that follows is slow enough to read.
 */
export const RISE = 22
export const FALL = 6

/**
 * How long the drawing has to rest at zero before its loop stops, in seconds,
 * counted from the end of the fall, so the last frame drawn is the resting
 * shape.
 */
export const QUIET_STOP = 0.5

/** Below this a reading is silence. */
export const SILENT = 0.002

/**
 * How near its target an eased value lands on it. A tenth of a pixel in a box
 * 24 pixels tall, so the fall ends in under a second and nobody sees the
 * last step.
 */
const SETTLED = 0.004

/** A reading clamped to the range a level is written in. */
export const unit = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0

/**
 * The bar count, from what the hook computed to.
 *
 * Anything that is not a whole number in the range keeps the default or is
 * brought into it.
 */
export const barCount = (written: string): number => {
  const read = Number.parseInt(written, 10)
  if (!Number.isFinite(read)) {
    return DEFAULT_BARS
  }
  return Math.min(MAX_BARS, Math.max(MIN_BARS, read))
}

/**
 * How tall bar `index` of `count` may stand, from about a quarter at either end
 * to the whole box in the middle.
 *
 * **Center weighted**, so the row reads as one shape that swells with the
 * voice. Without it, the loud low bands sit at one end and the drawing leans.
 */
export const envelope = (index: number, count: number): number => {
  if (count <= 1) {
    return 1
  }
  const across = Math.sin((Math.PI * (index + 0.5)) / count)
  return 0.25 + 0.75 * across ** 1.2
}

/**
 * Whether bar `index` of `count` is one of the center bars, which take the
 * stronger color. The middle half of the row is.
 */
export const centered = (index: number, count: number): boolean =>
  Math.abs(index + 0.5 - count / 2) < count / 4

/**
 * The reading bar `index` of `count` follows: its band, where `bands` holds a
 * different number of bands than there are bars read between the two nearest,
 * and the level where there are no bands at all.
 */
export const bandFor = (
  bands: readonly number[],
  level: number,
  index: number,
  count: number,
): number => {
  if (bands.length === 0) {
    return unit(level)
  }
  if (bands.length === 1) {
    return unit(bands[0] ?? 0)
  }
  const at = ((index + 0.5) / count) * bands.length - 0.5
  const low = Math.max(0, Math.min(bands.length - 1, Math.floor(at)))
  const high = Math.min(bands.length - 1, low + 1)
  const mix = Math.min(1, Math.max(0, at - low))
  return unit((bands[low] ?? 0) * (1 - mix) + (bands[high] ?? 0) * mix)
}

/**
 * One step of `current` toward `target` over `delta` seconds, rising at
 * `RISE` and falling at `FALL`. Exponential, so the step is the same however
 * the frames are spaced.
 */
export const ease = (current: number, target: number, delta: number): number => {
  const rate = target > current ? RISE : FALL
  const next = current + (target - current) * (1 - Math.exp(-rate * delta))
  return Math.abs(next - target) < SETTLED ? target : next
}

/** One of the three lines the waves draw. */
export interface WaveLine {
  /** How many whole waves fit across the box. */
  cycles: number
  /** Which color the line takes: the main color, the accent, or the main color faded. */
  ink: 'accent' | 'faint' | 'main'
  /** Where the line starts in its cycle, in radians. */
  phase: number
  /** How fast it travels, in radians a second. A negative speed travels the other way. */
  speed: number
  /** Its share of the amplitude, `1` for the main line. */
  weight: number
  /** Its stroke, in CSS pixels. */
  width: number
}

/**
 * The three lines, in the order they are drawn, the main line last so it lies
 * on top. **Different speeds, phases, and weights**, so the three cross and
 * part and never move as one.
 */
export const WAVE_LINES: readonly WaveLine[] = [
  { cycles: 2.6, ink: 'faint', phase: 2.4, speed: 3.4, weight: 0.5, width: 1 },
  { cycles: 1.9, ink: 'accent', phase: 1.1, speed: -2.3, weight: 0.75, width: 1.5 },
  { cycles: 1.3, ink: 'main', phase: 0, speed: 1.8, weight: 1, width: 2 },
]

/**
 * The moment the waves are drawn at when the element is `still`, in seconds.
 * Fixed, so a still picture is the same on every load.
 */
export const STILL_TIME = 0

/**
 * How far a wave may leave the center line at `across`, from `0` at the start
 * to `1` at the end: nothing at either end and all of it in the middle, so
 * every line is pinned to the center at both ends.
 */
export const pinned = (across: number): number => Math.sin(Math.PI * unit(across)) ** 2

/**
 * How far `line` stands from the center line at `across`, at `time` seconds,
 * as a share of the amplitude: from `-1` to `1`.
 */
export const waveAt = (line: WaveLine, across: number, time: number): number =>
  line.weight *
  pinned(across) *
  Math.sin(Math.PI * 2 * line.cycles * across + line.phase + line.speed * time)

/**
 * The length of the still bar drawn under `prefers-reduced-motion`: the level's
 * share of `span`, and never shorter than its own `thickness`, so silence is a
 * dot.
 */
export const stillLength = (level: number, span: number, thickness: number): number =>
  Math.max(thickness, unit(level) * span)
