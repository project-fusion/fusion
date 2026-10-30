import { lookupWord } from '@fusion.dev/helix-core/words'
import { Platform } from 'react-native'
import type { Node } from '../style/form'
import { announcedAs, holds, readingOf } from './announced'
import { checkedOf, onAndOff, pressedOf } from './checked'
import { currentWords } from './current'
import { describedOf, drawsWhen, labelOf, wordsInside } from './node-words'
import { bound, read, type Styling, type Values } from './styles'

/** Leaves a view and what is inside it out of what a screen reader reaches. */
export const silent = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const

/**
 * What a part is read with beside its name and its role: **which of a set it
 * is, as its value**, since React Native has no `aria-current`, and **what
 * describes it, as its hint**, as `aria-describedby` does on the web. A
 * finished step's name is described by its `complete-label`.
 */
const told = (
  styling: Styling,
  node: Node,
): {
  readonly accessibilityHint?: string
  readonly accessibilityValue?: { readonly text: string }
} => {
  const current = currentWords(
    bound(styling, node.attributes?.current, node.name),
    styling.base.locale,
  )
  /* **React Native has no role description**, `aria-roledescription`, so
     a phone says it first in the hint, before what describes the part. */
  const hint = [
    bound(styling, node.attributes?.roledescription, node.name),
    bound(styling, node.attributes?.description, node.name),
    ...describedOf(styling, node),
  ].filter((words): words is string => typeof words === 'string' && words !== '')
  return {
    ...(hint.length === 0 ? {} : { accessibilityHint: hint.join('. ') }),
    ...(current === undefined ? {} : { accessibilityValue: { text: current } }),
  }
}

/**
 * What a box is read with beside its name, as `told` says, nothing where it
 * is decorative. **A box that says it is current is one element**, so its
 * words and the words that say so are read together, as the current crumb
 * is.
 */
const toldOfBox = (
  styling: Styling,
  node: Node,
  decorative: boolean,
): ReturnType<typeof told> & { readonly accessible?: true } => {
  const said = decorative ? {} : told(styling, node)
  return said.accessibilityValue === undefined ? said : { ...said, accessible: true }
}

/** Whether a node draws words alone: a text, or a region that falls back to words. */
const wordsOnly = (node: Node): boolean =>
  node.kind === 'text' ||
  (node.kind === 'region' &&
    (node.children ?? []).length > 0 &&
    (node.children ?? []).every((child) => child.kind === 'text'))

/** The children a screen reader reads: a decorative one is drawn and not read, as a badge's icon is. */
const readChildren = (children: readonly Node[]): readonly Node[] =>
  children.filter((child) => child.attributes?.decorative !== true)

/**
 * **A status is a polite live region**, as on the web: TalkBack says its new
 * words as they change. iOS has no live region of a view's own, so the box
 * says them through the announce capability, as `saidStatus` in `live.tsx`
 * draws.
 */
const liveOf = (announced: Readonly<Record<string, string>>, decorative: boolean) =>
  announced.role === 'status' && !decorative ? { accessibilityLiveRegion: 'polite' } : {}

/** Whether a box is inert, or kept drawn while `closed`, which is inert too. */
const inertOf = (values: Styling, node: Node): boolean =>
  holds(values, node, 'inert') || holds(values, node, 'closed')

/** The roles of a box a screen reader reaches whole, never what is inside it. */
const ATOMIC: ReadonlySet<string> = new Set(['image', 'keyboardkey'])

/** Whether a screen reader reaches a box as one element, and never what is inside it. */
const oneElement = (
  node: Node,
  label: string | undefined,
  announced: Readonly<Record<string, unknown>>,
  decorative: boolean,
): boolean => {
  const children = node.children ?? []
  /* **A labeled box that holds no part is one element**, as a labeled icon is
     one image: without `accessible`, VoiceOver and TalkBack pass over a view
     to what is inside it, and a glyph has nothing a reader reaches. **A
     labeled key or picture is one too**, its label said in place of what it
     holds, as the web says a chord's words and hides its keys. */
  if (
    label !== undefined &&
    (children.length === 0 || ATOMIC.has(String(announced.accessibilityRole)))
  ) {
    return true
  }
  /* **A box with a role that holds only words is one element too**, as a
     heading of words is one header: without it, a reader reaches the words
     and never hears the role. A region that falls back to words counts as
     words, as a field's message does. */
  const read = readChildren(children)
  return (
    !decorative && read.length > 0 && read.every(wordsOnly) && Object.keys(announced).length > 0
  )
}

/**
 * What a screen reader hears of a box: its role, its label unless it is
 * decorative, and its reading where it is a range. **An inert box takes no
 * touch**, and nothing in it is reached, as `inert` leaves it on the web. A
 * box kept drawn while `closed` is inert too.
 */
export const boxSemantics = (values: Styling, node: Node): Readonly<Record<string, unknown>> => {
  const inert = inertOf(values, node)
  const decorative = inert || holds(values, node, 'decorative')
  const label = decorative ? undefined : labelOf(values, node)
  const said = toldOfBox(values, node, decorative)
  const announced = announcedAs(values, node)
  const one = oneElement(node, label, announced, decorative) || said.accessible === true
  return {
    ...(decorative ? silent : {}),
    ...(inert ? { pointerEvents: 'none' } : {}),
    ...announced,
    ...liveOf(announced, decorative),
    ...(label === undefined ? {} : { accessibilityLabel: label }),
    ...(one ? { accessible: true } : {}),
    ...said,
    ...(decorative ? {} : readingOf(values, node)),
  }
}

/**
 * A press's label: its own, or, **for a checkbox, the words it holds**.
 *
 * React Native on Android writes a view's content description from its label
 * and adds "mixed" while it is mixed, and writes it again only where it has a
 * label. **A checkbox with no label of its own was named "mixed"**, and kept
 * that name once it was checked: Checkbox Group's select-all box on an
 * emulator in run 38957410938. With its words as its label, it is "Select
 * all, mixed" while mixed and "Select all" once checked, as the web's box is
 * named by its `<label>`.
 */
const pressLabelOf = (styling: Styling, node: Node): string | undefined => {
  const own = labelOf(styling, node)
  if (own !== undefined || node.attributes?.role !== 'checkbox') {
    return own
  }
  const words = wordsInside(styling, node.children ?? []).join(' ')
  return words === '' ? undefined : words
}

/** An action a screen reader is offered: its words, the event it sends, and the press it runs. */
interface Offered {
  readonly label: string
  readonly name: string
  readonly part: string
}

/** A press a node holds that only a pointer reaches, as the action a screen reader is offered. */
const offered = (values: Values, child: Node): Offered[] => {
  const sends = child.attributes?.sends
  if (child.kind !== 'pressable' || !holds(values, child, 'decorative')) {
    return []
  }
  if (typeof sends !== 'string') {
    return []
  }
  const label = bound(values, child.attributes?.label, child.name)
  return [{ label: typeof label === 'string' ? label : sends, name: sends, part: child.name }]
}

/**
 * **A press hidden from screen readers is offered to them as an action of the
 * control around it.** A tab's close mark is for the pointer, and a reader
 * closes the tab from the tab.
 */
const actions = (styling: Styling, node: Node): Offered[] =>
  (node.children ?? []).flatMap((child) => {
    if (child.kind === 'when') {
      return drawsWhen(styling, child) ? actions(styling, child) : []
    }
    return offered(styling, child)
  })

/**
 * **An action a screen reader takes runs the press it names**, as a tap on
 * the press does, so a tag's remove action asks for the tag to be removed.
 */
const actOn =
  (styling: Styling, offers: readonly Offered[]) =>
  (event: { readonly nativeEvent: { readonly actionName: string } }): void => {
    const part = offers.find((one) => one.name === event.nativeEvent.actionName)?.part
    const press = part === undefined ? undefined : styling.behavior.parts[part]?.view?.onPress
    if (typeof press === 'function') {
      press()
    }
  }

/** Whether a link inside `child` is out of a press's reach: in a press of its own, or not drawn. */
const beyond = (styling: Styling, child: Node): boolean =>
  child.kind === 'pressable' || (child.kind === 'when' && !drawsWhen(styling, child))

/**
 * **Where a press goes**: its own `href`, as a tab's, or the `href` of a
 * link it wraps, as a row's, while there is one.
 */
const linkOf = (styling: Styling, node: Node): string | undefined => {
  const own = bound(styling, node.attributes?.href, node.name)
  if (typeof own === 'string' && own !== '') {
    return own
  }
  for (const child of node.children ?? []) {
    const found = beyond(styling, child) ? undefined : linkOf(styling, child)
    if (found !== undefined) {
      return found
    }
  }
  return undefined
}

/**
 * What a press is: busy, disabled, expanded, selected, and checked, where its
 * attributes say. **A press its set holds `locked` is disabled to a screen
 * reader** and keeps its stop, as the web's `aria-disabled` does.
 */
const stateOf = (values: Values, node: Node, busy: boolean, off: boolean) => {
  const expanded = bound(values, node.attributes?.expanded, node.name)
  const selected = bound(values, node.attributes?.selected, node.name)
  const checked = checkedOf(values, node)
  const locked = read(values, 'locked', node.name) === true
  return {
    busy,
    disabled: off || busy || locked,
    ...(checked === undefined ? {} : { checked }),
    ...(typeof expanded === 'boolean' ? { expanded } : {}),
    ...(typeof selected === 'boolean' ? { selected } : {}),
  }
}

/**
 * A press's state, without `disabled` on Android where the press keeps its
 * stop, as Android would write it as the view's `enabled`.
 */
const keptState = (state: ReturnType<typeof stateOf>, kept: boolean) => {
  if (!kept || Platform.OS !== 'android') {
    return state
  }
  const { disabled: _, ...rest } = state
  return rest
}

/**
 * The words a phone says after a kept press's name on Android, where its
 * state cannot say it is disabled. **An app translates them** under
 * `helix-disabled`, as `registerWords('de', { 'helix-disabled': { disabled:
 * 'Deaktiviert' } })` does.
 */
const disabledWords = (locale: string | undefined): string => {
  const found = locale === undefined ? undefined : lookupWord(locale, 'helix-disabled', 'disabled')
  return typeof found?.[0] === 'string' ? found[0] : 'Disabled'
}

/**
 * What a kept press is read with on Android: its value's words, then the
 * words that say it is disabled, which React Native joins to its label in
 * the view's content description. Its value as it stands elsewhere.
 */
const keptValue = (
  styling: Styling,
  value: Readonly<Record<string, number | string>> | undefined,
  kept: boolean,
): { accessibilityValue?: Readonly<Record<string, number | string>> } => {
  if (!kept || Platform.OS !== 'android') {
    return value === undefined ? {} : { accessibilityValue: value }
  }
  const words = disabledWords(styling.base.locale)
  const text = typeof value?.text === 'string' ? `${value.text}, ${words}` : words
  return { accessibilityValue: { ...value, text } }
}

/**
 * A kept press's label on Android, its own or its words: TalkBack reads the
 * content description its label and value make in place of the words inside.
 */
const keptLabel = (styling: Styling, node: Node, kept: boolean): string | undefined => {
  const own = pressLabelOf(styling, node)
  if (own !== undefined || !kept || Platform.OS !== 'android') {
    return own
  }
  return wordsInside(styling, node.children ?? []).join(' ') || undefined
}

/**
 * What a press is announced as: its role, a toggle button where it stays
 * `pressed` or where a button `toggles`, as a toggle button on its own does,
 * or a link where it goes somewhere.
 */
const pressedAs = (styling: Styling, node: Node): Readonly<Record<string, unknown>> => {
  const announced = announcedAs(styling, node)
  const toggles = onAndOff(styling, node) && node.attributes?.role === 'button'
  if ((pressedOf(styling, node) !== undefined || toggles) && announced.role === undefined) {
    return { accessibilityRole: 'togglebutton' }
  }
  if (Object.keys(announced).length > 0) {
    return announced
  }
  return { accessibilityRole: linkOf(styling, node) === undefined ? undefined : 'link' }
}

/**
 * What a screen reader hears of a field: its name, from the region that
 * labels it or its own `label`, what describes it as its hint, and whether
 * it is disabled. **React Native has no required state for a field**, and a
 * read-only field is a `TextInput` that opens no keyboard and takes no edit.
 *
 * **A field whose role is `spinbutton` is a spin button with its range on
 * Android.** On iOS it stays a text field, with no role and no range, as
 * the web's is there: VoiceOver reads an adjustable field as a slider a
 * reader cannot type in.
 */
export const fieldSemantics = (styling: Styling, node: Node): Readonly<Record<string, unknown>> => {
  const label = labelOf(styling, node)
  const off = Boolean(bound(styling, node.attributes?.disabled, node.name))
  const spins = node.attributes?.role === 'spinbutton' && Platform.OS !== 'ios'
  return {
    ...(label === undefined ? {} : { accessibilityLabel: label }),
    ...told(styling, node),
    ...(spins ? { ...announcedAs(styling, node), ...readingOf(styling, node) } : {}),
    accessibilityState: { disabled: off },
  }
}

/**
 * What a screen reader hears of a press: what it is announced as, its label,
 * its state, its reading where it is a range, and the presses inside it a
 * pointer alone reaches, as actions. A decorative press is hidden, and its label goes to
 * the action it is offered as.
 *
 * **`disabled` is passed only while it holds.** `Pressable` writes the prop
 * over its state's `disabled`, and a busy press is disabled to a screen
 * reader while it still takes a press, which its machine swallows.
 *
 * **A disabled press that is `focusable-when-disabled` keeps its stop**, as
 * on the web: `Pressable` takes no `disabled`, which would take its focus,
 * and is `focusable`, while its state says disabled and its machine refuses
 * the press. **Android takes no `disabled` state on a press that keeps its
 * stop**: React Native writes that state as the view's own `enabled`, and a
 * view that is not enabled takes no focus from a keyboard. **TalkBack
 * hears it as disabled in its value's words** instead, which React Native
 * adds to the view's content description and leaves the view enabled.
 */
export const pressSemantics = (styling: Styling, node: Node): Readonly<Record<string, unknown>> => {
  const decorative = holds(styling, node, 'decorative')
  const busy = Boolean(bound(styling, node.attributes?.busy, node.name))
  const off = Boolean(bound(styling, node.attributes?.disabled, node.name))
  const kept =
    off && Boolean(bound(styling, node.attributes?.['focusable-when-disabled'], node.name))
  const offers = decorative || off ? [] : actions(styling, node)
  const said = { ...(decorative ? {} : told(styling, node)), ...readingOf(styling, node) }
  return {
    accessibilityActions:
      offers.length === 0 ? undefined : offers.map(({ label, name }) => ({ label, name })),
    ...(offers.length === 0 ? {} : { onAccessibilityAction: actOn(styling, offers) }),
    accessibilityLabel: decorative ? undefined : keptLabel(styling, node, kept),
    ...pressedAs(styling, node),
    accessibilityState: keptState(stateOf(styling, node, busy, off), kept),
    ...said,
    ...keptValue(styling, said.accessibilityValue, kept),
    ...(kept ? { focusable: true } : off ? { disabled: true } : {}),
    ...(decorative ? silent : {}),
  }
}
