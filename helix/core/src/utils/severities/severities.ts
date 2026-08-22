import {
  checkCircleFill,
  type HelixIcon,
  infoFill,
  warningFill,
  xCircleFill,
} from '@helix-io/icons'

/** The four severities, as a type anything branching on them can take. */
export type HelixSeverity = 'danger' | 'info' | 'success' | 'warning'

/** What a severity is drawn as, and what it is called. */
export interface SeverityMark {
  /** The mark drawn beside the message. Never the only carrier of the meaning. */
  icon: HelixIcon

  /** What a screen reader is told, since the color says nothing to them. */
  label: string
}

/**
 * The one severity vocabulary.
 *
 * It was two, defined identically in `Callout` and in `Toast.Item`, and only one
 * of the copies carried the comment saying the two must not drift. A reader
 * meets these marks in a passage and in a message and has to read them as the
 * same four things, so there is one place they come from.
 *
 * **Filled at every severity**, which is what it already was at one of them.
 * `danger` took `xCircleFill` and the other three took outlines, so a set meant
 * to be read as one vocabulary had one member drawn a different way. Filled
 * because a severity mark is a status indicator and not an action: it wants to
 * read at a glance and at a small size, where an outline at this weight loses
 * its interior.
 *
 * **The label is not the severity name.** `danger` is announced as "Error",
 * because that is the word a reader understands and `danger` is the word the API
 * uses. Both matter and they are not the same string.
 */
export const SEVERITIES: Record<HelixSeverity, SeverityMark> = {
  danger: { icon: xCircleFill, label: 'Error' },
  info: { icon: infoFill, label: 'Information' },
  success: { icon: checkCircleFill, label: 'Success' },
  warning: { icon: warningFill, label: 'Warning' },
}

/**
 * The mark for a severity, or `undefined` where the name is not one.
 *
 * A lookup rather than direct indexing, because `severity` reaches a component
 * as an attribute and an attribute can say anything. Callers decide what an
 * unknown one means: `Callout` falls back to `info`, since a callout is always
 * *about* something, and `Toast.Item` draws nothing, since a message is just the
 * next thing that happened.
 */
export const severityMark = (severity: string | undefined): SeverityMark | undefined =>
  severity ? SEVERITIES[severity as HelixSeverity] : undefined
