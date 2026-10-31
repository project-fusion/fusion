import { clearWords, registerWords } from '@fusion.dev/helix-core/words'
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { HelixRoot } from '../index'
import type { NotificationHandle } from '../machines/notification'
import {
  HelixNotification,
  HelixNotificationGroup,
  HelixNotifications,
} from './notifications/index.native'

type Drawn = (given: Record<string, unknown>) => React.ReactNode
const Feed = HelixNotifications as unknown as Drawn
const Row = HelixNotification as unknown as Drawn
const Group = HelixNotificationGroup as unknown as Drawn

const draw = (element: React.ReactNode) => render(<HelixRoot>{element}</HelixRoot>)

/** Each row's words, as a screen reader hears them. */
const heard = (): string[] =>
  (
    screen.root?.queryAll(
      (node) =>
        typeof node.type === 'string' &&
        node.props.accessibilityRole === 'text' &&
        node.props.accessible === true,
    ) ?? []
  ).map((node) => String(node.props.accessibilityLabel))

describe('a feed of notifications on a phone', () => {
  test('a row arriving above the others stands first, and the feed reads them in order', async () => {
    const feed = createRef<{ readonly items: readonly unknown[]; readonly unread: number }>()
    const page = (rows: readonly string[]) => (
      <HelixRoot>
        <Feed ref={feed}>
          {rows.map((words) => (
            <Row key={words}>{words}</Row>
          ))}
        </Feed>
      </HelixRoot>
    )
    const { rerender } = await render(page(['Second']))
    await rerender(page(['First', 'Second']))
    expect(heard()).toEqual(['Unread First', 'Unread Second'])
    expect(feed.current?.unread).toBe(2)
  })

  test('a row hears `markRead` once, and its handler can refuse it', async () => {
    const row = createRef<NotificationHandle>()
    const onBeforeRead = jest.fn((event: { preventDefault(): void }) => event.preventDefault())
    await draw(
      <Row onBeforeRead={onBeforeRead} ref={row}>
        Refused
      </Row>,
    )
    await act(async () => {
      expect(row.current?.markRead(true)).toBe(false)
    })
    expect(onBeforeRead).toHaveBeenCalledTimes(1)
    expect(row.current?.read).toBe(false)
  })

  test('`read` set by the page wins each time it changes', async () => {
    const page = (read: boolean) => (
      <HelixRoot>
        <Row read={read}>Owned</Row>
      </HelixRoot>
    )
    const { rerender } = await render(page(false))
    expect(heard()).toEqual(['Unread Owned'])
    await rerender(page(true))
    expect(heard()).toEqual(['Owned'])
  })

  test('a press on a row hands its handler the row, as `currentTarget`', async () => {
    const onPress = jest.fn((event: { currentTarget: NotificationHandle }) =>
      event.currentTarget.markRead(true),
    )
    await draw(<Row onPress={onPress}>Pressed</Row>)
    const box = screen.root?.queryAll(
      (node) => node.props.onStartShouldSetResponder !== undefined,
    )[0]
    await act(async () => {
      box?.props.onResponderRelease()
    })
    expect(heard()).toEqual(['Pressed'])
  })

  test('a group folds to its first row, and the feed still counts the rest', async () => {
    const feed = createRef<{ readonly unread: number }>()
    await draw(
      <Feed ref={feed}>
        <Group collapsible label="Today">
          <Row>One</Row>
          <Row>Two</Row>
        </Group>
      </Feed>,
    )
    expect(heard()).toEqual(['Unread One'])
    expect(feed.current?.unread).toBe(2)
    await fireEvent.press(screen.getByRole('button'))
    expect(heard()).toEqual(['Unread One', 'Unread Two'])
  })
})

describe('notifications on the words registry', () => {
  test('the feed and a row read the words registered for their language', async () => {
    registerWords('de', {
      'helix-notification': { dismissLabel: 'Schliessen {label}' },
      'helix-notifications': { markAllLabel: 'Alle gelesen' },
    })
    await draw(
      <Feed lang="de" markAll>
        <Row dismissible lang="de" value="one">
          Ready
        </Row>
      </Feed>,
    )
    expect(screen.getByText('Alle gelesen')).toBeTruthy()
    expect(screen.getByLabelText('Schliessen Ready')).toBeTruthy()
    clearWords()
  })
})
