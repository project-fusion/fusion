import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HelixTheme, useTokens } from '@fusion.dev/helix-native'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { Slot } from 'expo-router'
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { StyleSheet } from 'react-native'
import { Root } from '../src/root'

/* The proof app on a phone: its route tree, the one the web exports, drawn
   through `@fusion.dev/helix/jsx-runtime`, which warns about anything a
   phone leaves out. Each press on a link goes through the router. */

const APP = join(__dirname, '..', 'app')

let warn: ReturnType<typeof jest.spyOn>

beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  expect(warn.mock.calls.filter(([message]) => String(message).startsWith('Helix:'))).toEqual([])
  jest.useRealTimers()
  jest.restoreAllMocks()
})

const press = async (words: string | RegExp) => {
  await act(async () => {
    fireEvent.press(screen.getAllByText(words).at(-1) ?? screen.getByText(words))
  })
}

function Probe({
  mode,
  read,
}: {
  readonly mode: 'dark' | 'light'
  readonly read: Partial<Record<'dark' | 'light', Readonly<Record<string, number | string>>>>
}) {
  read[mode] = useTokens()
  return null
}

describe('the proof app', () => {
  test('opens on the projects, which the header marks current', async () => {
    const app = await renderRouter(APP, { initialUrl: '/' })
    expect(app.getPathname()).toBe('/projects')
    expect(screen.getByText('3 active, 1 at risk')).toBeOnTheScreen()
    expect(screen.getByText('Mobile app is behind schedule')).toBeOnTheScreen()
    expect(screen.getByText('34 of 50 tasks done')).toBeOnTheScreen()
    expect(screen.getByRole('link', { name: /^Projects/ })).toHaveAccessibilityValue({
      text: 'Current page',
    })
  })

  test('a row opens its project at its overview, under a trail back to the list', async () => {
    const app = await renderRouter(APP, { initialUrl: '/projects' })
    await press(/Website redesign/)
    expect(app.getPathname()).toBe('/projects/website')
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeSelected()
    expect(screen.getByText('Progress')).toBeOnTheScreen()
    expect(screen.getByRole('progressbar', { name: 'Tasks done' })).toBeOnTheScreen()
    /* The header's destination stays current, as the section the page is
       in, and the first crumb links back to the list. The project's crumb is
       the page showing, which is no link. */
    const [destination, crumb] = screen.getAllByRole('link', { name: /^Projects/ })
    expect(destination).toHaveAccessibilityValue({ text: 'Current' })
    expect(crumb).not.toHaveAccessibilityValue({ text: 'Current page' })
    expect(screen.queryByRole('link', { name: /Website redesign/ })).toBeNull()
  })

  test('each tab is a route, and the first crumb goes back to the list', async () => {
    jest.useFakeTimers()
    const app = await renderRouter(APP, { initialUrl: '/projects/website' })
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Activity' }))
    })
    expect(app.getPathname()).toBe('/projects/website/activity')
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeSelected()
    expect(screen.getByText('Merged the pricing page')).toBeOnTheScreen()
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Settings' }))
    })
    expect(app.getPathname()).toBe('/projects/website/settings')
    expect(screen.getByText('Email when a task is overdue')).toBeOnTheScreen()
    expect(screen.getByRole('link', { name: 'Archive' })).toBeOnTheScreen()
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Archive project' }))
    })
    await act(async () => {
      jest.advanceTimersByTime(1200)
    })
    expect(screen.getByText('Website redesign is archived')).toBeOnTheScreen()
    /* The overview is the project's own route, above the tab showing. */
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Overview' }))
    })
    expect(app.getPathname()).toBe('/projects/website')
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeSelected()
    await act(async () => {
      /* The first crumb, after the header's destination of the same name. */
      fireEvent.press(screen.getAllByRole('link', { name: 'Projects' }).at(-1) as never)
    })
    expect(app.getPathname()).toBe('/projects')
    expect(screen.getByText('3 active, 1 at risk')).toBeOnTheScreen()
  })

  test('the header goes to every project’s activity, and marks it current', async () => {
    const app = await renderRouter(APP, { initialUrl: '/projects/mobile' })
    await act(async () => {
      fireEvent.press(screen.getByRole('link', { name: /^Activity/ }))
    })
    expect(app.getPathname()).toBe('/activity')
    expect(screen.getByText('8 changes across every project')).toBeOnTheScreen()
    expect(screen.getByRole('link', { name: /^Activity/ })).toHaveAccessibilityValue({
      text: 'Current page',
    })
  })

  test('a project the data lacks goes back to the list', async () => {
    const app = await renderRouter(APP, { initialUrl: '/projects/nowhere' })
    expect(app.getPathname()).toBe('/projects')
  })

  test('a project’s meter draws its label on a line of its own above the bar, as the web does', async () => {
    await renderRouter(APP, { initialUrl: '/projects/website' })
    const meter = screen.getByRole('progressbar', { name: 'Tasks done' })
    expect(StyleSheet.flatten(meter.props.style)).toMatchObject({ flexWrap: 'wrap' })
    const label = screen
      .getAllByText('Tasks done', { includeHiddenElements: true })
      .find((one) => StyleSheet.flatten(one.props.style)?.width !== undefined)
    expect(label === undefined ? undefined : StyleSheet.flatten(label.props.style).width).toBe(
      '100%',
    )
  })

  test('the root draws the colors of the web’s theme, in light and dark', async () => {
    /* Each color `src/theme.css` writes, as `[name, light, dark]`. */
    const css = readFileSync(join(__dirname, '..', 'src', 'theme.css'), 'utf8')
    const colors = [
      ...css.matchAll(/--helix-(color-[\w-]+): (?:light-dark\((#\w+), (#\w+)\)|(#\w+));/g),
    ].map(([, name, light, dark, both]) => [name, light ?? both, dark ?? both])
    expect(colors.length).toBeGreaterThan(40)
    const read: Partial<Record<'dark' | 'light', Readonly<Record<string, number | string>>>> = {}
    await renderRouter(
      {
        _layout: () => (
          <Root>
            <Slot />
          </Root>
        ),
        index: () => (
          <>
            <HelixTheme mode="light">
              <Probe mode="light" read={read} />
            </HelixTheme>
            <HelixTheme mode="dark">
              <Probe mode="dark" read={read} />
            </HelixTheme>
          </>
        ),
      },
      { initialUrl: '/' },
    )
    for (const [name, light, dark] of colors) {
      expect([name, read.light?.[name as string]]).toEqual([name, light])
      expect([name, read.dark?.[name as string]]).toEqual([name, dark])
    }
  })
})
