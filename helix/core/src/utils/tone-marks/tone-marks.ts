import {
  checkCircleFill,
  type HelixIcon,
  infoFill,
  warningFill,
  xCircleFill,
} from '@fusion.dev/helix-icons'

/**
 * The four status tones, as a type anything branching on them can take.
 *
 * **A subset of `tone` rather than an axis of its own.** A `severity` beside it
 * would be a sixth spelling of the axis for what a thing *means*: `Callout` and
 * `Toast.Item` report a status and never a brand role, so they take four of the
 * seven values and not four values of their own. `Callout` also takes
 * `neutral`, for a note that reports none, and draws it with its own mark.
 *
 * `Status` stays in the name because that is the half of `tone` these are: there
 * is no mark for `primary` or `accent`, a brand role having nothing to announce.
 */
export type HelixStatusTone = 'danger' | 'info' | 'success' | 'warning'

/** What a tone is drawn as, and what it is called. */
export interface ToneMark {
  /** The mark drawn beside the message. Never the only carrier of the meaning. */
  icon: HelixIcon

  /** What a screen reader is told, since the color says nothing to them. */
  label: string
}

/**
 * The one status vocabulary.
 *
 * A reader meets these marks in a passage and in a message and has to read them
 * as the same four things, so there is one place they come from.
 *
 * **Filled at every tone**, or a set meant to be read as one vocabulary has a
 * member drawn a different way. Filled because a tone mark is a status
 * indicator and not an action: it wants to read at a glance and at a small
 * size, where an outline at this weight loses its interior.
 *
 * **The label is not the tone name.** `danger` is announced as "Error",
 * because that is the word a reader understands and `danger` is the word the API
 * uses. Both matter and they are not the same string.
 */
export const TONE_MARKS: Record<HelixStatusTone, ToneMark> = {
  danger: { icon: xCircleFill, label: 'Error' },
  info: { icon: infoFill, label: 'Information' },
  success: { icon: checkCircleFill, label: 'Success' },
  warning: { icon: warningFill, label: 'Warning' },
}

/**
 * The mark for a tone, or `undefined` where the name is not one of the four.
 *
 * A lookup rather than direct indexing, because `tone` reaches a component as an
 * attribute and an attribute can say anything, including the three tones that
 * have no mark. Callers decide what an unknown one means: `Callout` falls back
 * to `info`, since a callout is always *about* something, and `Toast.Item` draws
 * nothing, since a message is just the next thing that happened.
 */
export const toneMark = (tone: string | undefined): ToneMark | undefined =>
  tone ? TONE_MARKS[tone as HelixStatusTone] : undefined
