import { describe, expect, test } from 'bun:test'
import { barControls, controlNames, menuControls } from './extra-controls.js'

const player = { hydrating: false, refusedPip: false, remote: true, source: true }

describe('the controls a player is asked for', () => {
  test('reads full as every control that acts on the video by itself, in its place', () => {
    expect(controlNames('full')).toEqual(['rewind', 'forward', 'speed', 'pip', 'remote'])
    expect(controlNames('previous, full next')).toEqual([
      'previous',
      'rewind',
      'forward',
      'speed',
      'pip',
      'remote',
      'next',
    ])
  })

  test('names each control once, where it first appears', () => {
    expect(controlNames('speed full')).toEqual(['speed', 'rewind', 'forward', 'pip', 'remote'])
  })

  test('keeps what the platform cannot do off the bar, full or not', () => {
    // No picture in picture without a document to ask.
    expect(barControls('full', player)).toEqual(['rewind', 'forward', 'speed', 'remote'])
    expect(barControls('full', { ...player, remote: false })).toEqual([
      'rewind',
      'forward',
      'speed',
    ])
  })

  test('puts behind the button what full names and the bar does not hold', () => {
    expect(menuControls('full', ['speed'], player)).toEqual(['rewind', 'forward', 'remote'])
  })
})
