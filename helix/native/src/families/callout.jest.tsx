/*
 * The generated Callout, drawn from its real intermediate form: a note whose
 * mark is named for its tone, tinted and barred in the tone's color, and a
 * dismiss button named for its heading that sends `dismiss` with what the
 * callout is called, after which the callout hides itself unless a handler
 * refused. `test:native` writes the component beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { HelixCallout } from './callout/index.native'
import { type Drawn, nodes, styleOf } from './drawn'

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

const host = (): Drawn | undefined => nodes(screen.toJSON())[0]

/** The node named by these words. */
const named = (words: string): Drawn | undefined =>
  nodes(screen.toJSON()).find((node) => node.props.accessibilityLabel === words)

type Heard = (event: { detail: { label?: string }; preventDefault: () => void }) => void

afterEach(() => {
  jest.useRealTimers()
})

describe('the generated Callout', () => {
  test('is a note whose mark is named for its tone', async () => {
    await render(themed(<HelixCallout tone="danger">Check the address.</HelixCallout>))
    expect(named('Error')?.props.accessibilityRole).toBe('image')
    expect(screen.getByText('Check the address.')).toBeTruthy()
  })

  test('names an unknown or absent tone Information, and neutral Note', async () => {
    const view = await render(themed(<HelixCallout>Words</HelixCallout>))
    expect(named('Information')).toBeDefined()
    await view.rerender(themed(<HelixCallout tone="neutral">Words</HelixCallout>))
    expect(named('Note')).toBeDefined()
    await view.rerender(
      themed(
        <HelixCallout tone="danger" toneLabel="Fehler">
          Words
        </HelixCallout>,
      ),
    )
    expect(named('Fehler')).toBeDefined()
  })

  test('draws the tone as a bar on the start edge, and tints the box', async () => {
    await render(themed(<HelixCallout tone="success">Saved.</HelixCallout>))
    const bar = nodes(host() ?? null).find(
      (node) =>
        styleOf(node).position === 'absolute' && styleOf(node).backgroundColor !== undefined,
    )
    expect(styleOf(bar ?? { props: {} }).backgroundColor).toBe(light['color-success'])
    expect(styleOf(host() ?? { props: {} }).backgroundColor).toBeDefined()
    expect(styleOf(host() ?? { props: {} }).overflow).toBe('hidden')
  })

  test('takes the control steps of its data-density, as the web does', async () => {
    const at = async (density?: string) => {
      await render(
        themed(
          <HelixCallout {...(density === undefined ? {} : { 'data-density': density })}>
            Words
          </HelixCallout>,
        ),
      )
      const style = styleOf(host() ?? { props: {} })
      return [style.padding, style.fontSize]
    }
    const [restingInset, restingSize] = await at()
    const [tightInset, tightSize] = await at('sm')
    const [looseInset, looseSize] = await at('lg')
    /* space-sm, space-md, and space-lg; text-xs, text-sm, and text-md, at 16 points a rem. */
    expect([tightInset, restingInset, looseInset]).toEqual([12, 16, 24])
    expect([tightSize, restingSize, looseSize]).toEqual([12, 13, 14])
  })

  test('names its dismiss button for its heading, and fades out once dismissed', async () => {
    jest.useFakeTimers()
    const heard = jest.fn<Heard>()
    await render(
      themed(
        <HelixCallout dismissible heading={<Text>Maintenance</Text>} onDismiss={heard}>
          The service is down tonight.
        </HelixCallout>,
      ),
    )
    const dismiss = named('Dismiss Maintenance')
    expect(dismiss?.props.accessibilityRole).toBe('button')
    await fireEvent.press(screen.getByLabelText('Dismiss Maintenance'))
    await act(async () => undefined)
    expect(heard).toHaveBeenCalledTimes(1)
    expect(heard.mock.calls[0]?.[0].detail).toEqual({ label: 'Maintenance' })
    /* Exiting: faded, and still drawn until the fade has run. */
    expect(styleOf(host() ?? { props: {} }).opacity).toBe(0)
    expect(styleOf(host() ?? { props: {} }).display).not.toBe('none')
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })
    expect(styleOf(host() ?? { props: {} }).display).toBe('none')
  })

  test('shrinks its content to leave room for the dismiss button', async () => {
    await render(
      themed(
        <HelixCallout dismissible heading={<Text>Tip</Text>}>
          Press the slash key to search from anywhere.
        </HelixCallout>,
      ),
    )
    const content = nodes(host() ?? null).find((node) => styleOf(node).minWidth === 0)
    expect(content).toBeDefined()
    expect(styleOf(content ?? { props: {} }).flexShrink).toBe(1)
  })

  test('fades in from nothing as the page shows it again', async () => {
    jest.useFakeTimers()
    const view = await render(themed(<HelixCallout open={false}>Back.</HelixCallout>))
    await view.rerender(themed(<HelixCallout open>Back.</HelixCallout>))
    await act(async () => undefined)
    expect(styleOf(host() ?? { props: {} }).display).not.toBe('none')
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })
    expect(styleOf(host() ?? { props: {} }).opacity).not.toBe(0)
  })

  test('hands focus to the dismiss button of the callout beside it', async () => {
    const focus = fakeFocus<unknown>()
    setFocus(focus)
    await render(
      themed(
        <>
          <HelixCallout dismissible heading={<Text>First</Text>}>
            One.
          </HelixCallout>
          <HelixCallout dismissible heading={<Text>Second</Text>}>
            Two.
          </HelixCallout>
        </>,
      ),
    )
    await fireEvent.press(screen.getByLabelText('Dismiss First'))
    await act(async () => undefined)
    /* Once, to the one press still shown. */
    expect(focus.moved).toHaveLength(1)
    expect(focus.moved[0]?.node).toBeDefined()
  })

  test('names its dismiss button for its tone without a heading, and stays where refused', async () => {
    const heard = jest.fn<Heard>((event) => event.preventDefault())
    await render(
      themed(
        <HelixCallout dismissible onDismiss={heard} tone="warning">
          Disk nearly full.
        </HelixCallout>,
      ),
    )
    await fireEvent.press(screen.getByLabelText('Dismiss Warning'))
    await act(async () => undefined)
    expect(heard.mock.calls[0]?.[0].detail).toEqual({ label: 'Disk nearly full.' })
    expect(styleOf(host() ?? { props: {} }).display).not.toBe('none')
  })

  test('is shown again where the page writes open', async () => {
    const view = await render(themed(<HelixCallout open={false}>Hidden.</HelixCallout>))
    expect(styleOf(host() ?? { props: {} }).display).toBe('none')
    await view.rerender(themed(<HelixCallout open>Hidden.</HelixCallout>))
    expect(styleOf(host() ?? { props: {} }).display).not.toBe('none')
  })
})
