import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet, Text } from 'react-native'
import { ThemeProvider } from '../theme/theme'
import { SharedBox, sharedStyles } from './share'

const layout = (width: number) => ({
  nativeEvent: { layout: { height: 20, width, x: 0, y: 0 } },
})

describe('SharedBox', () => {
  test('grows from no basis, so the parts that share a row come out the same width', () => {
    expect(sharedStyles({ flexGrow: 1, gap: 8 }, undefined, false)).toEqual({
      inner: { flexDirection: 'row', gap: 8 },
      outer: { flexBasis: 0, flexGrow: 1, gap: 8 },
    })
  })

  test('is held at its content’s width and its padding where its share is narrower', () => {
    expect(sharedStyles({ flexGrow: 1, paddingHorizontal: 4 }, 72, true).outer).toEqual({
      flexGrow: 0,
      minWidth: 80,
      paddingHorizontal: 4,
      width: 80,
    })
  })

  test('measures what it holds, and holds the part once its share falls short of it', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <SharedBox style={{ flexGrow: 1 }} view={{ testID: 'part' }}>
          <Text>Actions</Text>
        </SharedBox>
      </ThemeProvider>,
    )
    const part = () => StyleSheet.flatten(screen.getByTestId('part').props.style)
    expect(part()).toMatchObject({ flexBasis: 0, flexGrow: 1 })
    const content = screen.getByText('Actions').parent
    if (content === null) {
      throw new Error('The words are not in a view.')
    }
    await act(() => fireEvent(content, 'layout', layout(72)))
    await act(() => fireEvent(screen.getByTestId('part'), 'layout', layout(120)))
    expect(part()).toMatchObject({ flexBasis: 0, flexGrow: 1 })
    await act(() => fireEvent(screen.getByTestId('part'), 'layout', layout(40)))
    expect(part()).toMatchObject({ flexGrow: 0, width: 72 })
  })
})
