/** The rate Moonshine's models take audio at. */
export const MODEL_RATE = 16_000

/**
 * Resamples mono audio to the model's rate by linear interpolation. A
 * microphone captures at the device's rate, usually 44.1 or 48 kHz, and
 * Firefox refuses to connect it to an `AudioContext` running at another.
 */
export const resample = (input: Float32Array, rate: number): Float32Array => {
  if (rate === MODEL_RATE) {
    return input
  }
  const step = rate / MODEL_RATE
  const output = new Float32Array(Math.floor(input.length / step))
  for (let at = 0; at < output.length; at += 1) {
    const position = at * step
    const before = Math.floor(position)
    const after = Math.min(before + 1, input.length - 1)
    const weight = position - before
    output[at] = (input[before] ?? 0) * (1 - weight) + (input[after] ?? 0) * weight
  }
  return output
}

/**
 * How loud a chunk is, from 0 to 1: the root mean square, scaled by the same
 * factor as the browser engine's meter, so a voice at speaking level reads
 * near the top of the ring either way.
 */
export const loudness = (samples: Float32Array): number => {
  if (samples.length === 0) {
    return 0
  }
  let sum = 0
  for (const sample of samples) {
    sum += sample * sample
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 4)
}

/**
 * The audio worklet that hands the page each block the microphone delivers,
 * averaged to mono. Averaging matters: a headset can open as stereo with the
 * voice on one channel and silence on the other.
 */
export const CAPTURE_WORKLET = `registerProcessor('helix-speech-capture', class extends AudioWorkletProcessor {
  process(inputs) {
    const channels = inputs[0]
    if (channels && channels.length > 0) {
      const mono = new Float32Array(channels[0].length)
      for (const channel of channels) {
        for (let at = 0; at < mono.length; at += 1) {
          mono[at] += channel[at] / channels.length
        }
      }
      this.port.postMessage(mono, [mono.buffer])
    }
    return true
  }
})`
