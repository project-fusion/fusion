/*
 * The generated Avatar and Avatar Group, drawn from their real intermediate
 * forms: an image named by its name, its initials until a picture arrives
 * or after it fails, `fallback-delay` holding the initials back on a fake
 * clock, and a group that folds the people past `max` into a count named by
 * who it stands for. `test:native` writes the components beside this file.
 */
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions } from 'react-native'
import { setPictureView } from '../render/picture'
import { FakePicture, fakeImage } from '../render/picture.fixtures'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { HelixAvatar, HelixAvatarGroup } from './avatar/index.native'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'

const original = timers()
let clock: FakeTimers

beforeAll(() => setPictureView(FakePicture))
afterAll(() => setPictureView())

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
  atTextSize(1)
})

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

const all = (): Drawn[] => nodes(screen.toJSON())
const host = (): Drawn | undefined => all()[0]
const picture = (): Drawn | undefined => all().find((node) => node.type === 'Image')

/** Whether the initials are drawn: their text, in a view that is not hidden. */
const initialsShown = (letters: string): boolean => {
  const drawn = all()
  const text = drawn.find((node) => node.type === 'Text' && wordsOf(node) === letters)
  const box = drawn.find(
    (node) => node.type === 'View' && (node.children ?? []).some((child) => child === text),
  )
  return text !== undefined && styleOf(box ?? { props: {} }).display !== 'none'
}

describe('the generated Avatar', () => {
  test('is an image named by its name, a circle of the avatar size in the raised surface', async () => {
    await render(themed(<HelixAvatar name="Ada Lovelace" />))
    expect(host()?.props.accessibilityRole).toBe('image')
    expect(host()?.props.accessibilityLabel).toBe('Ada Lovelace')
    expect(styleOf(host() ?? { props: {} }).backgroundColor).toBe(light['color-surface-raised'])
    expect(initialsShown('AL')).toBe(true)
  })

  test('sizes its initials against its circle at every text size, as the web does', async () => {
    for (const fontScale of [1, 3.1]) {
      atTextSize(fontScale)
      await render(themed(<HelixAvatar name="Ada Lovelace" />))
      const circle = styleOf(host() ?? { props: {} })
      const text = all().find((node) => node.type === 'Text' && wordsOf(node) === 'AL')
      expect(styleOf(text ?? { props: {} }).fontSize).toBeCloseTo(Number(circle.width) * 0.4)
    }
  })

  test('sizes the count against its circle at every text size, as the web does', async () => {
    const shares: number[] = []
    for (const fontScale of [1, 3.1]) {
      atTextSize(fontScale)
      await render(
        themed(
          <HelixAvatarGroup max={1}>
            <HelixAvatar name="Ada Lovelace" />
            <HelixAvatar name="Grace Hopper" />
          </HelixAvatarGroup>,
        ),
      )
      const drawn = all()
      const count = drawn.find((node) => node.type === 'Text' && wordsOf(node) === '+1')
      /* The innermost view with a width that holds the count, which is its circle. */
      const circle = drawn
        .filter((node) => count !== undefined && nodes(node).includes(count))
        .filter((node) => typeof styleOf(node).width === 'number')
        .at(-1)
      const size = styleOf(count ?? { props: {} }).fontSize
      shares.push(Number(size) / Number(styleOf(circle ?? { props: {} }).width))
    }
    expect(shares[0]).toBeCloseTo(0.3)
    expect(shares[1]).toBeCloseTo(0.3)
  })

  test('has no role without a name', async () => {
    await render(themed(<HelixAvatar initials="?" />))
    expect(host()?.props.accessibilityRole).toBeUndefined()
  })

  test('shows the picture once it loads, and the initials once it fails', async () => {
    const view = await render(themed(<HelixAvatar name="Ada Lovelace" src={fakeImage('loads')} />))
    await act(async () => undefined)
    expect(styleOf(picture() ?? { props: {} }).display).not.toBe('none')
    expect(initialsShown('AL')).toBe(false)
    await view.rerender(themed(<HelixAvatar name="Ada Lovelace" src={fakeImage('fails')} />))
    await act(async () => undefined)
    expect(styleOf(picture() ?? { props: {} }).display).toBe('none')
    expect(initialsShown('AL')).toBe(true)
  })

  test('holds the initials back for fallback-delay while a picture is on its way', async () => {
    await render(
      themed(<HelixAvatar fallbackDelay={300} name="Ada Lovelace" src={fakeImage('hangs')} />),
    )
    expect(initialsShown('AL')).toBe(false)
    await act(async () => {
      clock.advance(300)
    })
    expect(initialsShown('AL')).toBe(true)
  })
})

describe('the generated Avatar Group', () => {
  test('draws the first max avatars and a count named by who it stands for', async () => {
    await render(
      themed(
        <HelixAvatarGroup label="Reviewers" max={2}>
          <HelixAvatar name="Ada Lovelace" />
          <HelixAvatar name="Grace Hopper" />
          <HelixAvatar name="Alan Turing" />
          <HelixAvatar name="Katherine Johnson" />
        </HelixAvatarGroup>,
      ),
    )
    expect(screen.queryByLabelText('Alan Turing')).toBeNull()
    expect(screen.getByText('+2')).toBeTruthy()
    const count = all().find((node) =>
      node.props.accessibilityLabel?.toString().startsWith('2 more'),
    )
    expect(count?.props.accessibilityLabel).toBe('2 more: Alan Turing, Katherine Johnson')
    expect(host()?.props.accessibilityLabel).toBe('Reviewers')
  })

  test('overlaps each avatar by a quarter of its own size, as the web does', async () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      await render(
        themed(
          <HelixAvatarGroup>
            <HelixAvatar name="Ada Lovelace" size={size} />
            <HelixAvatar name="Grace Hopper" size={size} />
          </HelixAvatarGroup>,
        ),
      )
      const first = styleOf(screen.getByLabelText('Ada Lovelace') as never)
      const second = styleOf(screen.getByLabelText('Grace Hopper') as never)
      expect(first.marginStart).toBeUndefined()
      expect(typeof second.width).toBe('number')
      expect(second.marginStart).toBe(-Number(second.width) / 4)
    }
  })

  test('centers the initials of an overlapped avatar in the part left showing', async () => {
    await render(
      themed(
        <HelixAvatarGroup>
          <HelixAvatar name="Lin Wei" />
          <HelixAvatar name="Grace Hopper" />
        </HelixAvatarGroup>,
      ),
    )
    const box = (letters: string) =>
      all().find(
        (node) =>
          node.type === 'View' &&
          (node.children ?? []).some(
            (child) =>
              typeof child !== 'string' && child.type === 'Text' && wordsOf(child) === letters,
          ),
      ) ?? { props: {} }
    const second = styleOf(screen.getByLabelText('Grace Hopper') as never)
    expect(styleOf(box('LW')).marginEnd).toBe(Number(second.width) / 4)
    expect(styleOf(box('GH')).marginEnd ?? 0).toBe(0)
  })

  test('draws them all with no max', async () => {
    await render(
      themed(
        <HelixAvatarGroup>
          <HelixAvatar name="Ada Lovelace" />
          <HelixAvatar name="Grace Hopper" />
        </HelixAvatarGroup>,
      ),
    )
    expect(screen.getByLabelText('Grace Hopper')).toBeTruthy()
    expect(screen.queryByText(/^\+/)).toBeNull()
  })
})
