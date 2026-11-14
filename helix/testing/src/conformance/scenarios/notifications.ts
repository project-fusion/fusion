import { el, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Notifications, whose rows are written into the feed. The
 * record says what a screen reader hears of each row a reader can reach, how many
 * are unread, the line that says why there are none, which of the feed's presses
 * are drawn, what its live region says, each group's count, and the row with focus.
 */

const row = (words: string, props: Readonly<Record<string, PropValue>> = {}): Setup =>
  el('helix-notification', props, [words])

const ROWS = [
  row('Ada approved your deploy', { dismissible: true }),
  row('Build 4821 failed', { dismissible: true }),
  row('Your invitation was accepted', { 'default-read': true, dismissible: true }),
]

const feed = (
  props: Readonly<Record<string, PropValue>> = {},
  children: readonly (Setup | string)[] = ROWS,
): Setup => el('helix-notifications', { label: 'Activity', ...props }, children)

const group = (props: Readonly<Record<string, PropValue>> = {}): Setup =>
  el('helix-notification-group', { label: 'Today', ...props }, [
    row('First of the day'),
    row('Second of the day'),
    row('Third of the day', { 'default-read': true }),
  ])

/** A press that lands on nothing, which changes nothing and reads what stands. */
const READ = { kind: 'press' as const, row: 99 }
const part = (name: string) => ({ kind: 'press' as const, part: name })
const dismiss = (at: number) => ({ kind: 'press' as const, part: 'dismiss', row: at })
const refuse = (event: string) => ({ event, kind: 'refuse' as const })
const focusRow = (at: number) => ({ kind: 'focus' as const, row: at })
const key = (name: string) => ({ key: name, kind: 'key' as const })

/** Feeds: what each row says, marking them read, a dismissal, a fold, and the keys. */
export const NOTIFICATIONS: readonly Scenario[] = [
  {
    family: 'notifications',
    intents: [READ],
    name: 'each row says its words, and that it is unread while it is',
    setup: feed(),
  },
  {
    family: 'notifications',
    intents: [READ],
    name: '`read` set by the page reads as read, and `unread-label` names the rest',
    setup: feed({}, [row('Seen', { read: true }), row('Not seen', { 'unread-label': 'New' })]),
  },
  {
    family: 'notifications',
    intents: [part('mark-all')],
    name: 'mark-all marks every row read, and draws no press once it has',
    setup: feed({ 'mark-all': true }),
  },
  {
    family: 'notifications',
    intents: [READ],
    name: 'mark-all draws no press where nothing is unread',
    setup: feed({ 'mark-all': true }, [row('Seen', { 'default-read': true })]),
  },
  {
    family: 'notifications',
    intents: [refuse('before-read'), part('mark-all')],
    name: 'a refused mark-all changes nothing',
    setup: feed({ 'mark-all': true }),
  },
  {
    family: 'notifications',
    intents: [dismiss(1)],
    name: 'a dismissal removes the row, and the count follows',
    setup: feed(),
  },
  {
    family: 'notifications',
    intents: [refuse('dismiss'), dismiss(1)],
    name: 'a refused dismissal keeps the row',
    setup: feed(),
  },
  {
    family: 'notifications',
    intents: [dismiss(0), dismiss(0), dismiss(0)],
    name: 'the last row dismissed leaves the empty line',
    setup: feed({ 'empty-text': 'Nothing yet' }),
  },
  {
    family: 'notifications',
    intents: [READ],
    name: 'a feed with no rows says `empty-text`',
    setup: feed({ 'empty-text': 'Nothing yet' }, []),
  },
  {
    family: 'notifications',
    intents: [READ],
    name: 'a loading feed says `loading-text` under its rows',
    setup: feed({ loading: true, 'loading-text': 'Fetching' }),
  },
  {
    family: 'notifications',
    intents: [READ],
    name: '`error-text` wins over the other lines, under the rows there are',
    setup: feed({ 'empty-text': 'Nothing yet', 'error-text': 'Could not load', loading: true }),
  },
  {
    family: 'notifications',
    intents: [part('more')],
    name: 'load-more asks for the next page',
    setup: feed({ 'load-more': true }),
  },
  {
    family: 'notifications',
    intents: [part('more')],
    name: 'load-more sends nothing while a page is on its way',
    setup: feed({ 'load-more': true, loading: true, 'loading-text': 'Fetching' }),
  },
  {
    family: 'notifications',
    intents: [READ],
    name: 'a group counts its rows, and the feed counts them through it',
    setup: feed({}, [group()]),
  },
  {
    family: 'notifications',
    intents: [READ],
    name: 'a set `count` stands for more rows than are written',
    setup: feed({}, [group({ count: 5 })]),
  },
  {
    family: 'notifications',
    intents: [READ, part('trigger'), part('trigger')],
    name: 'a collapsible group draws its first row until it opens, and unread still counts the rest',
    setup: feed({}, [group({ collapsible: true })]),
  },
  {
    family: 'notifications',
    intents: [refuse('before-open'), part('trigger')],
    name: 'a refused open keeps the group folded',
    setup: feed({}, [group({ collapsible: true })]),
  },
  {
    family: 'notifications',
    intents: [READ],
    name: 'a group open from the start draws every row',
    setup: feed({}, [group({ collapsible: true, 'default-open': true })]),
  },
  {
    family: 'notifications',
    intents: [focusRow(0), key('ArrowDown'), key('ArrowDown'), key('ArrowDown'), key('Home')],
    name: 'the arrows and Home move between rows, and stop at the last',
    setup: feed(),
  },
  {
    family: 'notifications',
    intents: [focusRow(0), key('End'), key('ArrowUp'), key('PageUp'), key('PageDown')],
    name: 'End and the page keys move between rows',
    setup: feed(),
  },
]
