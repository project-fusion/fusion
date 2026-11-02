import { describe, expect, test } from 'bun:test'
import { firstPhase, fittedHeight, moving, type OpenPhase, phaseAfter } from './opening'

describe('phaseAfter', () => {
  test('opens and closes through a motion, which its done signal ends', () => {
    let phase: OpenPhase = firstPhase(false)
    phase = phaseAfter(phase, 'open', true)
    expect(phase).toBe('opening')
    expect(moving(phase)).toBe(true)
    phase = phaseAfter(phase, 'done', true)
    expect(phase).toBe('open')
    phase = phaseAfter(phase, 'close', true)
    expect(phase).toBe('closing')
    expect(phaseAfter(phase, 'done', true)).toBe('closed')
  })

  test('goes straight to the end where no motion runs, as under reduced motion', () => {
    expect(phaseAfter('closed', 'open', false)).toBe('open')
    expect(phaseAfter('open', 'close', false)).toBe('closed')
  })

  test('turns back from where a motion stands, and keeps a phase asked again', () => {
    expect(phaseAfter('opening', 'close', true)).toBe('closing')
    expect(phaseAfter('closing', 'open', true)).toBe('opening')
    expect(phaseAfter('opening', 'open', true)).toBe('opening')
    expect(phaseAfter('closed', 'close', true)).toBe('closed')
    expect(phaseAfter('open', 'done', true)).toBe('open')
  })
})

describe('fittedHeight', () => {
  test('takes no height while open, so content that reflows moves the part with it', () => {
    expect(fittedHeight('open', 120, false)).toBeUndefined()
    expect(fittedHeight('closed', 120, false)).toBe(0)
  })

  test('moves to the measured height opening, and from it closing', () => {
    expect(fittedHeight('opening', 120, false)).toBe(120)
    expect(fittedHeight('opening', 180, false)).toBe(180)
    expect(fittedHeight('closing', 120, false)).toBe(120)
    expect(fittedHeight('closing', 120, true)).toBe(0)
  })
})
