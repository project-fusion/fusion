import { describe, expect, test } from 'bun:test'
import { atTail, tailOffset, tailTurn } from './follow-tail.js'

const at = (offset: number) => ({ content: 1000, frame: 200, offset })

describe('follow tail', () => {
  test('the end is the content less the frame, and never below zero', () => {
    expect(tailOffset(at(0))).toBe(800)
    expect(tailOffset({ content: 100, frame: 200, offset: 0 })).toBe(0)
  })

  test('the tail reaches back by the threshold', () => {
    expect(atTail(at(800), 0)).toBe(true)
    expect(atTail(at(752), 48)).toBe(true)
    expect(atTail(at(751), 48)).toBe(false)
  })

  test('content growing under a reader who did not move holds the tail', () => {
    expect(tailTurn(at(500), true, 500, 48)).toBe('stick')
  })

  test('a reader scrolling up lets go, and coming back follows again', () => {
    expect(tailTurn(at(400), true, 800, 48)).toBe('let-go')
    expect(tailTurn(at(790), false, 800, 48)).toBe('follow')
    expect(tailTurn(at(400), false, 800, 48)).toBe('stay')
    expect(tailTurn(at(800), true, 800, 48)).toBe('stay')
  })
})
