import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { HelixRoot } from '../index'
import { HelixCheckbox } from './checkbox/index.native'
import { HelixTree, HelixTreeItem } from './tree/index.native'

const Item = HelixTreeItem

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

type Found = ReturnType<typeof screen.getByRole>

/** A tree under `selection-mode="multiple"`, with a branch of two. */
const drawChecks = async () =>
  render(
    <HelixRoot>
      <HelixTree label="Files" selectionMode="multiple">
        <Item defaultOpen value="docs">
          Docs
          <Item slot="children" value="guide">
            Guide
          </Item>
          <Item slot="children" value="notes">
            Notes
          </Item>
        </Item>
        <Item value="log">Log</Item>
      </HelixTree>
    </HelixRoot>,
  )

/** Each row's check mark, a Checkbox no screen reader reaches. */
const boxes = () => screen.getAllByRole('checkbox', { includeHiddenElements: true })

/** The view around a check mark that takes no touch. */
const inertAround = (box: Found) => {
  let at = box.parent
  while (at && at.props.pointerEvents !== 'none') {
    at = at.parent
  }
  return at
}

/** The box a Checkbox draws for its input, in the checkbox's row. */
const drawnBox = (field: Found) => {
  const box = field.children[0]
  const drawn = typeof box === 'string' ? undefined : box?.children[0]
  return typeof drawn === 'string' ? undefined : StyleSheet.flatten(drawn?.props.style)
}

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

  test('under multiple each check mark is an inert Checkbox, and a press on it checks the row', async () => {
    await drawChecks()
    /* A screen reader reaches the rows, never the boxes. */
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(boxes()).toHaveLength(4)
    for (const box of boxes()) {
      expect(inertAround(box)?.props.pointerEvents).toBe('none')
    }
    /* A press on Guide's box lands on the part around it, which checks the row. */
    await fireEvent.press(boxes()[1] as never)
    await act(async () => {
      await Promise.resolve()
    })
    expect(row('Guide').props.accessibilityState.checked).toBe(true)
    expect(boxes()[1]?.props.accessibilityState.checked).toBe(true)
    expect(row('Docs').props.accessibilityState.checked).toBe('mixed')
    expect(boxes()[0]?.props.accessibilityState.checked).toBe('mixed')
    expect(boxes()[3]?.props.accessibilityState.checked).toBe(false)
  })

  test("a check mark draws a form's box, centered at its own height, 8 from the words", async () => {
    await drawChecks()
    const box = boxes()[3] as Found
    const field = StyleSheet.flatten(box.props.style)
    expect(field.minHeight).toBe(0)
    expect(field.alignItems).toBe('center')
    const holder = StyleSheet.flatten(inertAround(box)?.parent?.props.style)
    expect(holder.alignSelf).toBe('center')
    expect(Number(holder.marginEnd) + Number(StyleSheet.flatten(row('Log').props.style).gap)).toBe(
      8,
    )
    const drawn = drawnBox(box)
    await screen.unmount()
    await render(
      <HelixRoot>
        <HelixCheckbox />
      </HelixRoot>,
    )
    expect(drawn).toEqual(drawnBox(screen.getByRole('checkbox')))
  })

  test('a heading tree rests its leaves in the full ink, and its heading in the muted', async () => {
    const ink = (words: string) =>
      StyleSheet.flatten(screen.getByText(words, { includeHiddenElements: true }).props.style).color
    await draw()
    const muted = ink('Log')
    expect(ink('Docs')).toBe(muted)
    expect(ink('Guide')).toBe(muted)
    await screen.unmount()
    await draw({ nesting: 'heading' })
    expect(ink('Docs')).toBe(muted)
    expect(ink('Log')).not.toBe(muted)
    expect(ink('Guide')).toBe(ink('Log'))
  })

  test('a screen reader moves an item, and the page moving it takes its new place', async () => {
    await render(<Moved />)
    expect(row('a').props.accessibilityValue.text).toBe('Level 1, 1 of 3')
    await act(async () => {
      row('a').props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } })
    })
    expect(row('a').props.accessibilityValue.text).toBe('Level 1, 2 of 3')
    expect(row('b').props.accessibilityValue.text).toBe('Level 1, 1 of 3')
  })
})
