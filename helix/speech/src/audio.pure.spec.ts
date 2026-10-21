import { describe, expect, test } from 'bun:test'
import { loudness, MODEL_RATE, resample } from './audio.js'

describe('resample', () => {
  test('audio at the model rate passes through', () => {
    const input = new Float32Array([0.1, 0.2, 0.3])
    expect(resample(input, MODEL_RATE)).toBe(input)
  })

  test('48 kHz audio keeps one sample in three', () => {
    const input = Float32Array.from({ length: 48 }, (_, at) => at)
    const output = resample(input, 48_000)
    expect(output.length).toBe(16)
    expect(Array.from(output.slice(0, 4))).toEqual([0, 3, 6, 9])
  })

  test('44.1 kHz audio interpolates between neighbors', () => {
    const input = Float32Array.from({ length: 441 }, (_, at) => at)
    const output = resample(input, 44_100)
    expect(output.length).toBe(160)
    expect(output[1]).toBeCloseTo(2.75625, 4)
  })
})

describe('loudness', () => {
  test('silence reads zero', () => {
    expect(loudness(new Float32Array(128))).toBe(0)
    expect(loudness(new Float32Array())).toBe(0)
  })

  test('a full-scale signal reads one', () => {
    expect(loudness(new Float32Array(128).fill(1))).toBe(1)
  })

  test('a quiet voice reads in proportion', () => {
    expect(loudness(new Float32Array(128).fill(0.1))).toBeCloseTo(0.4, 5)
  })
})
