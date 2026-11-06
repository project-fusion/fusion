import { describe, expect, test } from 'bun:test'
import {
  barControls,
  clock,
  controlNames,
  menuControls,
  playerKey,
  playerOffers,
  speedAfter,
} from './player.js'

const player = { pip: true, remote: true, source: true }

describe('a player clock', () => {
  test('writes minutes and seconds, and an hour only where there is one', () => {
    expect(clock(0)).toBe('0:00')
    expect(clock(42.9)).toBe('0:42')
    expect(clock(3725)).toBe('1:02:05')
  })

  test('reads a length not yet known as nothing played', () => {
    expect(clock(Number.NaN)).toBe('0:00')
    expect(clock(Number.POSITIVE_INFINITY)).toBe('0:00')
    expect(clock(-3)).toBe('0:00')
  })
})

describe('the controls a player offers', () => {
  test('reads full as the controls that act on the video by themselves, each once', () => {
    expect(controlNames('previous full next speed')).toEqual([
      'previous',
      'rewind',
      'forward',
      'speed',
      'pip',
      'remote',
      'next',
    ])
  })

  test('offers picture in picture, a remote, and a download only where each can happen', () => {
    const none = { pip: false, remote: false, source: false }
    expect(['pip', 'remote', 'download'].map((one) => playerOffers(one, none))).toEqual([
      false,
      false,
      false,
    ])
    expect(barControls('full download', player)).toEqual([
      'rewind',
      'forward',
      'speed',
      'pip',
      'remote',
      'download',
    ])
    expect(playerOffers('volume', player)).toBe(false)
  })

  test('leaves behind the button what the bar already holds', () => {
    expect(menuControls('full', ['speed'], player)).toEqual(['rewind', 'forward', 'pip', 'remote'])
  })
})

describe('a speed control', () => {
  test('steps to the next speed offered, round to the first', () => {
    expect(speedAfter('0.5 1 1.5 2', 1)).toBe(1.5)
    expect(speedAfter('0.5 1 1.5 2', 2)).toBe(0.5)
    expect(speedAfter('0.5 1 1.5 2', 1.25)).toBe(0.5)
  })

  test('offers nothing where no speed is a rate', () => {
    expect(speedAfter('', 1)).toBeUndefined()
    expect(speedAfter('0', 1)).toBeUndefined()
  })
})

describe('what a key asks of a player', () => {
  test('moves five seconds an arrow, and ten with shift', () => {
    expect(playerKey('ArrowRight', false)).toEqual({ kind: 'seek-by', seconds: 5 })
    expect(playerKey('ArrowLeft', true)).toEqual({ kind: 'seek-by', seconds: -10 })
  })

  test('goes to the ends, and to a tenth by a digit where the length is known', () => {
    expect(playerKey('Home', false)).toEqual({ kind: 'seek-to', needsLength: false, share: 0 })
    expect(playerKey('End', false)).toEqual({ kind: 'seek-to', needsLength: false, share: 1 })
    expect(playerKey('5', false)).toEqual({ kind: 'seek-to', needsLength: true, share: 0.5 })
  })

  test('plays, mutes, fills the screen, captions, skips, and leaves other keys alone', () => {
    expect([' ', 'k', 'm', 'f', 'c'].map((key) => playerKey(key, false)?.kind)).toEqual([
      'toggle',
      'toggle',
      'mute',
      'fullscreen',
      'captions',
    ])
    expect(playerKey('j', false)).toEqual({ kind: 'skip-by', seconds: -10 })
    expect(playerKey('ArrowUp', false)).toEqual({ by: 0.1, kind: 'volume-by' })
    expect(playerKey('x', false)).toBeUndefined()
  })
})
