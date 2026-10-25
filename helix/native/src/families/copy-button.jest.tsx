/*
 * The generated Copy Button, drawn from its real intermediate form: a press
 * puts its value on the clipboard, sends `copy`, and names the button by its
 * confirmation for `feedback-duration`, in the tooltip it draws around its
 * press as well; a press with nothing to copy, or one the clipboard refuses,
 * sends `copy-error` and names it by its failure. It is drawn with Icon
 * Button's rules under its own. `test:native` writes the component beside
 * this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setClipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import {
  type FakeClipboard,
  fakeClipboard,
} from '@fusion.dev/helix-core/capabilities/clipboard/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixCopyButton } from './copy-button/index.native'
import { styleOf } from './drawn'

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: () => ({
      middlewareData: {},
      placement: 'top',
      refs: {
        reference: { current: null },
        setFloating: () => undefined,
        setReference: () => undefined,
      },
      update: () => undefined,
      x: 20,
      y: 20,
    }),
  }
})

let drawn: Awaited<ReturnType<typeof render>> | undefined
let written: FakeClipboard
let announced: FakeAnnounce
let clock: FakeTimers
const real = timers()

const draw = async (content: ReactNode) => {
  drawn = await render(
    <ThemeProvider tokens={light}>
      <LayerHostView>
        <Text>Page</Text>
        {content}
      </LayerHostView>
    </ThemeProvider>,
  )
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** The button's press, which a screen reader hears by its name. */
const button = () =>
  viewsWhere((props) => props.accessibilityRole === 'button' || props.role === 'button')[0]

/** Presses the button and lets the write settle, and the layer host draw a frame or two. */
const press = async () => {
  await act(async () => {
    fireEvent.press(button() as never)
  })
  await act(async () => {
    await Promise.resolve()
  })
  await act(async () => {
    clock.runFrame()
    clock.runFrame()
  })
}

/** The words drawn, by what they say, and not the unseen copies measured for their width. */
const wordsNamed = (words: string) =>
  viewsWhere(() => true).filter(
    (node) =>
      node.type === 'Text' &&
      node.props.testID !== 'helix-widest' &&
      [node.props.children].flat(3).some((child) => typeof child === 'string' && child === words),
  )

/** The unseen copies of the words measured for their width, by what they say. */
const measuredWords = () =>
  viewsWhere((props) => props.testID === 'helix-widest').filter((node) => node.type === 'Text')

/** Whether the words are drawn. */
const shows = (words: string) =>
  viewsWhere(() => true).some(
    (node) =>
      node.type === 'Text' &&
      [node.props.children].flat(3).some((child) => typeof child === 'string' && child === words),
  )

beforeEach(() => {
  written = fakeClipboard()
  announced = fakeAnnounce()
  clock = fakeTimers()
  setClipboard(written)
  setAnnounce(announced)
  setTimers(clock)
})

afterEach(() => {
  setTimers(real)
})

describe('the generated Copy Button', () => {
  test('is named Copy, and copies its value on a press, sending press and then copy', async () => {
    const heard: string[] = []
    await draw(
      <HelixCopyButton
        onCopy={(event: { detail: { value: string } }) => heard.push(`copy ${event.detail.value}`)}
        onPress={() => heard.push('press')}
        value="npm i @fusion.dev/helix"
      />,
    )
    expect(button()?.props.accessibilityLabel).toBe('Copy')
    await press()
    expect(written.written).toEqual(['npm i @fusion.dev/helix'])
    expect(heard).toEqual(['press', 'copy npm i @fusion.dev/helix'])
  })

  test('is named Copied for its feedback duration, says so, and shows it in its tooltip', async () => {
    await draw(<HelixCopyButton feedbackDuration={800} showLabel value="token" />)
    await press()
    expect(button()?.props.accessibilityLabel).toBe('Copied')
    expect(announced.said.map((one) => one.message)).toContain('Copied')
    /* Beside the check, and in the tooltip. */
    expect(wordsNamed('Copied')).toHaveLength(2)
    /* The words stand in the success ink. */
    const ink = wordsNamed('Copied').map((node) => styleOf(node).color)
    expect(ink).toContain(light['color-success'])
    await act(async () => clock.advance(800))
    expect(button()?.props.accessibilityLabel).toBe('Copy')
  })

  test('with nothing to copy, or a clipboard that refuses, sends copy-error and is named by its failure', async () => {
    const failed = jest.fn()
    await draw(<HelixCopyButton onCopyError={failed} />)
    await press()
    expect(written.written).toEqual([])
    expect(failed).toHaveBeenCalledTimes(1)
    expect(button()?.props.accessibilityLabel).toBe('Could not copy')
    written.refuses = true
    await draw(<HelixCopyButton errorLabel="Nicht kopiert" onCopyError={failed} value="x" />)
    await press()
    expect(failed).toHaveBeenCalledTimes(2)
    expect(button()?.props.accessibilityLabel).toBe('Nicht kopiert')
  })

  test('copies nothing while disabled', async () => {
    await draw(<HelixCopyButton disabled value="token" />)
    await press()
    expect(written.written).toEqual([])
  })

  test('is named by its aria-label, then its label, and draws its words under show-label', async () => {
    await draw(<HelixCopyButton ariaLabel="Copy the token" label="Copy" value="x" />)
    expect(button()?.props.accessibilityLabel).toBe('Copy the token')
    await draw(<HelixCopyButton label="Kopieren" showLabel value="x" />)
    expect(button()?.props.accessibilityLabel).toBe('Kopieren')
    expect(shows('Kopieren')).toBe(true)
  })

  test('keeps the width of its widest word under show-label, as the web stacks its words', async () => {
    const widths: Readonly<Record<string, number>> = {
      Copied: 52,
      Copy: 34,
      'Could not copy': 96.4,
    }
    /* Each copy measured as a phone lays it out, once it is drawn. */
    const layOut = async () => {
      await act(async () => {
        for (const node of measuredWords()) {
          const word = [node.props.children].flat(3).join('')
          fireEvent(node, 'layout', { nativeEvent: { layout: { width: widths[word] } } })
        }
      })
    }
    await draw(<HelixCopyButton showLabel value="token" />)
    const said = measuredWords().map((node) => [node.props.children].flat(3).join(''))
    expect(said).toEqual(['Copied', 'Could not copy', 'Copy'])
    await layOut()
    expect(styleOf(wordsNamed('Copy')[0] ?? { props: {} }).minWidth).toBe(97)
    await press()
    await layOut()
    /* The words beside the check, and the tooltip's, which hold no width. */
    expect(wordsNamed('Copied').map((node) => styleOf(node).minWidth)).toContain(97)
  })

  test('is an icon button in its size, a ghost in its resting ink', async () => {
    await draw(<HelixCopyButton value="x" />)
    const style = styleOf(button() ?? { props: {} })
    expect(style.width).toBe(40)
    expect(style.height).toBe(40)
    expect(style.backgroundColor).toBe('transparent')
    await draw(<HelixCopyButton showLabel value="x" />)
    expect(styleOf(wordsNamed('Copy')[0] ?? { props: {} }).color).toBe(
      light['color-foreground-muted'],
    )
  })
})
