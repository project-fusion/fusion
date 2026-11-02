import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { StandingUndo } from '../src/standing'

/* The check the Toast flow presses: its row goes, its message offers it back,
   and Undo puts the row back where it stood. */

describe('the standing undo check', () => {
  test('takes a row out with its message, and Undo puts the row back', async () => {
    await render(
      <HelixRoot mode="light">
        <StandingUndo />
      </HelixRoot>,
    )
    expect(screen.queryByText('Archived Quarterly report.pdf')).toBeNull()
    const [first] = screen.getAllByText('Archive')
    await fireEvent.press(first as never)
    expect(screen.getByText('Archived Quarterly report.pdf')).toBeTruthy()
    expect(screen.queryByText('Quarterly report.pdf')).toBeNull()
    await fireEvent.press(screen.getByText('Undo'))
    expect(screen.queryByText('Archived Quarterly report.pdf')).toBeNull()
    expect(screen.getByText('Quarterly report.pdf')).toBeTruthy()
  })
})
