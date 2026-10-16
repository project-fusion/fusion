/*
 * A chart's readings as sound: time from left to right, in stereo from the
 * left ear to the right; the value as pitch; a soft tick at each gridline; one
 * timbre for each series. The plan is pure, so a spec reads what would be
 * played, and the player schedules it on Web Audio.
 */

/** One series to play: its name and its readings, a missing one as `null`. */
export interface SoundSeries {
  name: string
  values: ReadonlyArray<number | null>
}

/** One sound of a plan. */
export interface Sound {
  /** Hertz, for a tone. */
  frequency: number
  kind: 'tick' | 'tone'
  /** Seconds. */
  length: number
  /** From -1, the left ear, to 1, the right. */
  pan: number
  /** Which series, which picks its timbre. */
  series: number
  /** Seconds from the start. */
  time: number
}

/** The lowest and highest pitch, two octaves apart, in hertz. */
export const LOW = 220
export const HIGH = 880

/** The timbres, one a series, in turn. */
export const TIMBRES: readonly OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth']

/**
 * The pitch a value is played at: two octaves across the value axis, on a log
 * scale, so equal steps in value sound like equal steps in pitch.
 */
export const pitchOf = (value: number, min: number, max: number): number => {
  const share = max === min ? 0.5 : Math.min(1, Math.max(0, (value - min) / (max - min)))
  return LOW * (HIGH / LOW) ** share
}

/** Where a reading at this place of `count` sits between the ears. */
export const panOf = (place: number, count: number): number =>
  count <= 1 ? 0 : -1 + (2 * place) / (count - 1)

/** What a sweep plays, each series after the one before, over `duration` seconds apiece. */
export const sweepPlan = (
  series: readonly SoundSeries[],
  options: { duration: number; max: number; min: number },
): Sound[] => {
  const sounds: Sound[] = []
  const gap = 0.4
  series.forEach((one, depth) => {
    const start = depth * (options.duration + gap)
    const count = one.values.length
    const step = count > 1 ? options.duration / (count - 1) : 0
    const length = Math.min(0.2, Math.max(0.05, step * 0.8))
    /* A tick at each reading's gridline where there are few, and at tenths
       where there are many, so a long series is not a rattle. */
    const ticks = count <= 12 ? count : 11
    for (let tick = 0; tick < ticks; tick += 1) {
      const place = ticks > 1 ? tick / (ticks - 1) : 0
      sounds.push({
        frequency: 0,
        kind: 'tick',
        length: 0.02,
        pan: -1 + 2 * place,
        series: depth,
        time: start + place * options.duration,
      })
    }
    one.values.forEach((value, place) => {
      if (value === null || !Number.isFinite(value)) {
        return
      }
      sounds.push({
        frequency: pitchOf(value, options.min, options.max),
        kind: 'tone',
        length,
        pan: panOf(place, count),
        series: depth,
        time: start + place * step,
      })
    })
  })
  return sounds.sort((a, b) => a.time - b.time)
}

/**
 * Plays plans on Web Audio, one at a time.
 *
 * **The audio context is made on the first play**, which a page reaches only
 * from a reader's press: a browser refuses to start sound that no gesture
 * asked for.
 */
export class ChartSound {
  private context: AudioContext | undefined
  private playing: AudioScheduledSourceNode[] = []
  private ending: ReturnType<typeof setTimeout> | undefined
  private finish: (() => void) | undefined

  /** Whether this browser can play sound at all. */
  static get available(): boolean {
    return typeof (globalThis as { AudioContext?: unknown }).AudioContext === 'function'
  }

  /** Plays a plan, stopping whatever was playing, and resolves when it ends or is stopped. */
  play(plan: readonly Sound[], volume = 0.25): Promise<void> {
    this.stop()
    if (!ChartSound.available || plan.length === 0) {
      return Promise.resolve()
    }
    this.context ??= new AudioContext()
    const context = this.context
    void context.resume()
    const begin = context.currentTime + 0.05
    let last = 0
    for (const sound of plan) {
      const at = begin + sound.time
      last = Math.max(last, sound.time + sound.length)
      const gain = context.createGain()
      const pan = context.createStereoPanner()
      pan.pan.value = sound.pan
      gain.connect(pan).connect(context.destination)
      let source: AudioScheduledSourceNode
      if (sound.kind === 'tick') {
        const buffer = context.createBuffer(
          1,
          Math.ceil(context.sampleRate * sound.length),
          context.sampleRate,
        )
        const samples = buffer.getChannelData(0)
        for (let index = 0; index < samples.length; index += 1) {
          samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length)
        }
        const noise = context.createBufferSource()
        noise.buffer = buffer
        gain.gain.value = volume * 0.25
        source = noise
      } else {
        const oscillator = context.createOscillator()
        oscillator.type = TIMBRES[sound.series % TIMBRES.length] ?? 'sine'
        oscillator.frequency.value = sound.frequency
        /* A soft start and end, so no tone clicks; the brighter timbres are
           filtered so they sit beside a sine rather than over it. */
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(volume, at + 0.01)
        gain.gain.linearRampToValueAtTime(0, at + sound.length)
        if (oscillator.type === 'square' || oscillator.type === 'sawtooth') {
          const filter = context.createBiquadFilter()
          filter.type = 'lowpass'
          filter.frequency.value = 1800
          oscillator.connect(filter).connect(gain)
        } else {
          oscillator.connect(gain)
        }
        source = oscillator
      }
      if (sound.kind === 'tick') {
        source.connect(gain)
      }
      source.start(at)
      source.stop(at + sound.length)
      this.playing.push(source)
    }
    return new Promise((resolve) => {
      this.finish = resolve
      this.ending = setTimeout(() => this.stop(), (last + 0.1) * 1000)
    })
  }

  /** Stops whatever is playing. */
  stop(): void {
    clearTimeout(this.ending)
    const finish = this.finish
    this.finish = undefined
    for (const source of this.playing) {
      try {
        source.stop()
      } catch {
        /* Already stopped. */
      }
    }
    this.playing = []
    finish?.()
  }
}
