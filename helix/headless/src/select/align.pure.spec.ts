import { describe, expect, test } from 'bun:test'
import { over } from './align.js'

const trigger = { height: 40, left: 100, top: 300, width: 200 }
const viewport = { height: 800, width: 1200 }
const base = {
  margin: 8,
  option: { height: 32, top: 64 },
  panel: { height: 200, width: 240 },
  rtl: false,
  trigger,
  viewport,
}

describe('a list opened over its trigger', () => {
  test('puts the option it opens on over the trigger, start edges together', () => {
    /* The option's middle, 64 + 16 down the list, on the trigger's, 320. */
    expect(over(base)).toEqual({ left: 100, top: 240 })
  })

  test('lines up the end edges in a right-to-left page', () => {
    expect(over({ ...base, rtl: true }).left).toBe(60)
  })

  test('stays on the screen near an edge, and starts at the top when taller than it', () => {
    expect(over({ ...base, trigger: { ...trigger, top: 10 } }).top).toBe(8)
    expect(over({ ...base, trigger: { ...trigger, top: 780 } }).top).toBe(592)
    expect(over({ ...base, panel: { height: 900, width: 240 } }).top).toBe(8)
    expect(over({ ...base, trigger: { ...trigger, left: 1100 } }).left).toBe(952)
  })
})
