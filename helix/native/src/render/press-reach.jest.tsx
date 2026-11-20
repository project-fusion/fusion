import { describe, expect, test } from '@jest/globals'
import type { ReactElement } from 'react'
import type { Family } from '../style/form'
import { pressReach } from './press-reach'

const family = (set: readonly (readonly [string, unknown])[]): Family =>
  ({
    name: 'x',
    rules: [
      { inner: '::after', kind: 'rule', order: 0, set, target: 'button', values: [], when: [] },
    ],
  }) as unknown as Family

const reach = { calc: { op: '/', operands: [{ token: 'size-target' }] } }

const styleOf = (made: unknown): Readonly<Record<string, unknown>> =>
  (made as ReactElement<{ style: Record<string, unknown> }>).props.style

describe('a press reaches the target', () => {
  test('a box the size of the target, centered on the control', () => {
    expect(styleOf(pressReach(family([['inset', reach]]), 'button', '2.75rem', 16))).toEqual({
      height: 44,
      left: '50%',
      marginLeft: -22,
      marginTop: -22,
      position: 'absolute',
      top: '50%',
      width: 44,
    })
  })

  test('along the row alone where a rule writes only its block', () => {
    const style = styleOf(
      pressReach(
        family([
          ['inset-block', reach],
          ['inset-inline', { number: 0 }],
        ]),
        'button',
        '2.75rem',
        16,
      ),
    )
    expect(style.height).toBe(44)
    expect(style.left).toBe(0)
    expect(style.right).toBe(0)
    expect(style.width).toBeUndefined()
  })

  test('nothing for a part its family gives no reach', () => {
    expect(pressReach(family([['inset', reach]]), 'other', '2.75rem', 16)).toBeNull()
  })
})
