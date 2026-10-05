import { describe, expect, test } from 'bun:test'
import { type Color, parseColor } from '@fusion.dev/helix-core'
import { type ChannelName, channelFields, writeChannel } from './channels.js'

const model = (value: string): Color => parseColor(value) as Color

const numbers = (value: string, format: 'hex' | 'hsl' | 'rgb', alpha = false): unknown[] =>
  channelFields(value, model(value), format, alpha).map((one) => [one.channel, one.value])

describe('the channels a value is written with', () => {
  test('are the bytes for hex and rgb, read off the text', () => {
    expect(numbers('#33c8cc', 'hex')).toEqual([
      ['red', 51],
      ['green', 200],
      ['blue', 204],
    ])
    expect(numbers('rgba(51, 200, 204, 0.5)', 'rgb', true).at(-1)).toEqual(['alpha', 50])
    expect(channelFields('#33c8cc', model('#33c8cc'), 'hex', false)[0]?.max).toBe(255)
  })

  test('are hue, saturation and lightness for hsl', () => {
    expect(numbers('hsl(182, 60%, 50%)', 'hsl')).toEqual([
      ['hue', 182],
      ['saturation', 60],
      ['lightness', 50],
    ])
  })

  test('come from the color where the text is in another syntax', () => {
    expect(numbers('rgb(255, 0, 0)', 'hsl')).toEqual([
      ['hue', 0],
      ['saturation', 100],
      ['lightness', 50],
    ])
  })
})

describe('setting one channel', () => {
  const write = (
    value: string,
    format: 'hex' | 'hsl' | 'rgb',
    alpha: boolean,
    channel: ChannelName,
    to: number,
  ): string | null =>
    writeChannel(channelFields(value, model(value), format, alpha), format, alpha, channel, to)

  test('moves that channel alone and keeps the others exactly', () => {
    expect(write('#3366cc', 'hex', false, 'green', 200)).toBe('#33c8cc')
    expect(write('#33c8cc', 'hex', false, 'green', 201)).toBe('#33c9cc')
    expect(write('hsl(0, 100%, 50%)', 'hsl', false, 'lightness', 25)).toBe('hsl(0, 100%, 25%)')
  })

  test('keeps the number inside the channel, and writes nothing for what is not one', () => {
    expect(write('rgb(255, 0, 0)', 'rgb', false, 'blue', 400)).toBe('rgb(255, 0, 255)')
    expect(write('rgb(255, 0, 0)', 'rgb', false, 'blue', Number.NaN)).toBeNull()
  })

  test('writes the opacity the way the picker does in each syntax', () => {
    expect(write('#ff0000ff', 'hex', true, 'alpha', 50)).toBe('#ff000080')
    expect(write('rgba(255, 0, 0, 1)', 'rgb', true, 'alpha', 40)).toBe('rgba(255, 0, 0, 0.4)')
  })
})
