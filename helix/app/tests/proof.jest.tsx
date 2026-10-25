import { HelixRoot } from '@fusion.dev/helix-native'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Projects } from 'helix-proof'

/* The proof page on a phone: the page the web draws, through the gallery's
   runtime for shared code, which warns about anything a phone leaves out. */

let warn: ReturnType<typeof jest.spyOn>

beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  expect(warn.mock.calls.filter(([message]) => String(message).startsWith('Helix:'))).toEqual([])
  jest.useRealTimers()
  jest.restoreAllMocks()
})

const draw = async (mode: 'dark' | 'light' = 'light') => {
  await render(
    <HelixRoot mode={mode}>
      <Projects />
    </HelixRoot>,
  )
}

describe('the proof page', () => {
  test('lists the projects, the week in numbers, and the project at risk', async () => {
    await draw()
    expect(screen.getByText('Projects')).toBeOnTheScreen()
    expect(screen.getByText('3 active, 1 at risk')).toBeOnTheScreen()
    expect(screen.getByText('Open')).toBeOnTheScreen()
    expect(screen.getByText('Mobile app is behind schedule')).toBeOnTheScreen()
    expect(screen.getByText('Website redesign')).toBeOnTheScreen()
    expect(screen.getByText('34 of 50 tasks done')).toBeOnTheScreen()
  })

  test('a row opens its project, and the first crumb goes back', async () => {
    await draw()
    await act(async () => {
      fireEvent.press(screen.getByText('Website redesign'))
    })
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeSelected()
    expect(screen.getByText('Ada Okonjo')).toBeOnTheScreen()
    expect(screen.getByText('Progress')).toBeOnTheScreen()
    /* The meter's slotted label is drawn, as the web draws it, and names it. */
    expect(screen.getByText('Tasks done')).toBeOnTheScreen()
    expect(screen.getByRole('progressbar', { name: 'Tasks done' })).toBeOnTheScreen()
    await act(async () => {
      fireEvent.press(screen.getByText('Projects'))
    })
    expect(screen.getByText('3 active, 1 at risk')).toBeOnTheScreen()
  })

  test('the activity tab shows the timeline, and the settings tab archives', async () => {
    jest.useFakeTimers()
    await draw()
    await act(async () => {
      fireEvent.press(screen.getByText('Website redesign'))
    })
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Activity' }))
    })
    expect(screen.getByText('Merged the pricing page')).toBeOnTheScreen()
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Settings' }))
    })
    expect(screen.getByText('Email when a task is overdue')).toBeOnTheScreen()
    /* The outline draws a link for each section the panel marks. */
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeOnTheScreen()
    expect(screen.getByRole('link', { name: 'Visibility' })).toBeOnTheScreen()
    expect(screen.getByRole('link', { name: 'Archive' })).toBeOnTheScreen()
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Archive project' }))
    })
    await act(async () => {
      jest.advanceTimersByTime(1200)
    })
    expect(screen.getByText('Website redesign is archived')).toBeOnTheScreen()
  })

  test('opens at the project and the tab it is given, and a project opened later opens on its overview', async () => {
    await render(
      <HelixRoot mode="light">
        <Projects project="website" tab="activity" />
      </HelixRoot>,
    )
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeSelected()
    expect(screen.getByText('Merged the pricing page')).toBeOnTheScreen()
    await act(async () => {
      fireEvent.press(screen.getByText('Projects'))
    })
    await act(async () => {
      fireEvent.press(screen.getByText('Mobile app'))
    })
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeSelected()
  })

  test('opens at the settings tab it is given', async () => {
    await render(
      <HelixRoot mode="dark">
        <Projects project="website" tab="settings" />
      </HelixRoot>,
    )
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeSelected()
    expect(screen.getByText('Email when a task is overdue')).toBeOnTheScreen()
  })

  test('draws in dark mode', async () => {
    await draw('dark')
    expect(screen.getByText('Billing migration')).toBeOnTheScreen()
  })
})
