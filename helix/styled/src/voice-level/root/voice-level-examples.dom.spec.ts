import { beforeAll, describe, expect, test } from 'bun:test'
import { example, framesBooked, hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'
import readings from '../.examples/readings.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

type Level = HTMLElement & { bands: string | readonly number[]; level: number }

describe('the readings example', () => {
  run('feeds the spectrum 24 bands and the waves a level, and both draw', async () => {
    await example(readings)
    await framesBooked(20)
    const spectrum = document.getElementById('spectrum') as Level
    const waves = document.getElementById('waves') as Level
    expect(Array.isArray(spectrum.bands)).toBe(true)
    expect(spectrum.bands).toHaveLength(24)
    expect(waves.level).toBeGreaterThanOrEqual(0)
    expect(waves.level).toBeLessThanOrEqual(1)
    /* A phrase is under way for its first two seconds, so the loop runs. */
    expect(await framesBooked(10)).toBeGreaterThan(0)
  })
})
