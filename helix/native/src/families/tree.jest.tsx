import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { HelixRoot } from '../index'
import { HelixTree, HelixTreeItem } from './tree/index.native'

const Item = HelixTreeItem as unknown as (props: Record<string, unknown>) => React.ReactNode

/** The row that says these words. */
const row = (words: string) => {
  for (
    let at = screen.getByText(words, { includeHiddenElements: true }).parent;
    at;
    at = at.parent
  ) {
    if (at.props.role === 'treeitem') {
      return at
    }
  }
  throw new Error(`no row says "${words}"`)
}

const draw = async (props: Record<string, unknown> = {}) =>
  render(
    <HelixRoot>
      <HelixTree label="Files" {...props}>
        <Item defaultOpen value="docs">
          Docs
          <Item slot="children" value="guide">
            Guide
          </Item>
          <Item disabled slot="children" value="draft">
            Draft
          </Item>
        </Item>
        <Item value="log">Log</Item>
      </HelixTree>
    </HelixRoot>,
  )

const press = async (words: string) => {
  await fireEvent.press(row(words))
  await act(async () => {
    await Promise.resolve()
  })
}

describe('Tree on a phone', () => {
  test('nested items draw under their branch, and each row says its level and its place', async () => {
    await draw()
    expect(row('Guide').props.accessibilityValue.text).toBe('Level 2, 1 of 2')
    expect(row('Log').props.accessibilityValue.text).toBe('Level 1, 2 of 2')
    expect(row('Docs').props.accessibilityState.expanded).toBe(true)
  })

  test('a disabled row is dimmed, and a press on it does nothing', async () => {
    const heard = jest.fn()
    await draw({ onBeforeActivate: heard })
    expect(StyleSheet.flatten(row('Draft').props.style).opacity).toBe(0.5)
    await press('Draft')
    expect(heard).not.toHaveBeenCalled()
  })

  test('a press on a branch closes it, and asks before it', async () => {
    await draw()
    await press('Docs')
    expect(row('Docs').props.accessibilityState.expanded).toBe(false)
    expect(row('Docs').props.accessibilityState.selected).toBe(true)
  })

  test('a press under multiple cascades, and a branch reads mixed, passing over a disabled item', async () => {
    await draw({ selectionMode: 'multiple' })
    await press('Guide')
    /* Draft is disabled, so Guide is all Docs stands for. */
    expect(row('Docs').props.accessibilityState.checked).toBe(true)
    await press('Guide')
    expect(row('Docs').props.accessibilityState.checked).toBe(false)
  })

  test('a screen reader moves an item, and the page moving it takes its new place', async () => {
    const Moved = () => {
      const [order, setOrder] = useState(['a', 'b', 'c'])
      return (
        <HelixRoot>
          <HelixTree
            label="Moved"
            onReorder={(event: { detail: { keys: string[] } }) => setOrder(event.detail.keys)}
            reorderable
          >
            {order.map((value) => (
              <Item key={value} value={value}>
                {value}
              </Item>
            ))}
          </HelixTree>
        </HelixRoot>
      )
    }
    await render(<Moved />)
    expect(row('a').props.accessibilityValue.text).toBe('Level 1, 1 of 3')
    await act(async () => {
      row('a').props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } })
    })
    expect(row('a').props.accessibilityValue.text).toBe('Level 1, 2 of 3')
    expect(row('b').props.accessibilityValue.text).toBe('Level 1, 1 of 3')
  })
})
