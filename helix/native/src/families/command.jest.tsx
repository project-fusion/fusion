/*
 * The generated Command, drawn from its real intermediate form: the palette opens as
 * a dialog with its filter and its commands, typing narrows them, a choice asks
 * before-select, says select, and closes, a refusal keeps it open, the same command
 * runs twice, `inline` draws the list in the page and keeps it there, and the footer
 * is drawn only when something fills it.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { HelixRoot } from '../index'
import { HelixCommand } from './command/index.native'
import { HelixOption } from './option/index.native'

/** A moment for what the layer waits on. */
const settle = async (): Promise<void> => {
  await new Promise((done) => setTimeout(done, 60))
}

const draw = async (element: ReactNode) => {
  const drawn = await render(<HelixRoot>{element}</HelixRoot>)
  await act(settle)
  return drawn
}

const commands = [
  <HelixOption key="n" value="new">
    New file
  </HelixOption>,
  <HelixOption key="o" value="open">
    Open folder
  </HelixOption>,
  <HelixOption key="s" value="save">
    Save all
  </HelixOption>,
]

/** Presses the words in the open palette. */
const press = async (words: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(words))
    await settle()
  })
}

/** Types into the palette's filter. */
const type = async (text: string) => {
  await act(async () => {
    fireEvent.changeText(screen.getByPlaceholderText('Search commands'), text)
    await settle()
  })
}

describe('Command', () => {
  test('opens as a dialog named by its label, with its filter and its commands', async () => {
    await draw(
      <HelixCommand defaultOpen label="Commands">
        {commands}
      </HelixCommand>,
    )
    expect(screen.getByPlaceholderText('Search commands')).toBeTruthy()
    expect(screen.getByText('Save all')).toBeTruthy()
    expect(screen.getAllByLabelText('Commands').length).toBeGreaterThan(0)
  })

  test('typing narrows the commands', async () => {
    await draw(
      <HelixCommand defaultOpen label="Commands">
        {commands}
      </HelixCommand>,
    )
    await type('sav')
    expect(screen.getByText('Save all')).toBeTruthy()
    expect(screen.queryByText('New file')).toBeNull()
  })

  test('a choice asks before-select, says select, and closes', async () => {
    const heard: string[] = []
    const onToggle = jest.fn()
    await draw(
      <HelixCommand
        defaultOpen
        label="Commands"
        onBeforeSelect={(event: { detail: { value: string } }) =>
          heard.push(`before ${event.detail.value}`)
        }
        onSelect={(event: { detail: { value: string } }) => heard.push(`ran ${event.detail.value}`)}
        onToggle={onToggle}
      >
        {commands}
      </HelixCommand>,
    )
    await press('Open folder')
    expect(heard).toEqual(['before open', 'ran open'])
    expect(onToggle).toHaveBeenCalled()
    /* The panel falls out before the layer lets it go. */
    await act(async () => {
      await new Promise((done) => setTimeout(done, 600))
    })
    expect(screen.queryByText('Open folder')).toBeNull()
  })

  test('a refused before-select keeps the palette open and runs nothing', async () => {
    const onSelect = jest.fn()
    await draw(
      <HelixCommand
        defaultOpen
        label="Commands"
        onBeforeSelect={(event: { preventDefault: () => void }) => event.preventDefault()}
        onSelect={onSelect}
      >
        {commands}
      </HelixCommand>,
    )
    await press('Save all')
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByText('Save all')).toBeTruthy()
  })

  test('keeps no value, so the same command runs again', async () => {
    const ran: string[] = []
    await draw(
      <HelixCommand
        inline
        label="Commands"
        onSelect={(event: { detail: { value: string } }) => ran.push(event.detail.value)}
      >
        {commands}
      </HelixCommand>,
    )
    await press('Save all')
    await press('Save all')
    expect(ran).toEqual(['save', 'save'])
  })

  test('inline draws the list in the page with no dialog, and a choice leaves it there', async () => {
    await draw(
      <HelixCommand inline label="Commands">
        {commands}
      </HelixCommand>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    await press('New file')
    expect(screen.getByText('New file')).toBeTruthy()
  })

  test('draws its footer only when something fills it', async () => {
    const { rerender } = await draw(
      <HelixCommand inline label="Commands">
        {commands}
      </HelixCommand>,
    )
    expect(screen.queryByText('Esc to close')).toBeNull()
    await rerender(
      <HelixRoot>
        <HelixCommand footer={<Text>Esc to close</Text>} inline label="Commands">
          {commands}
        </HelixCommand>
      </HelixRoot>,
    )
    await act(settle)
    expect(screen.getByText('Esc to close')).toBeTruthy()
  })
})
