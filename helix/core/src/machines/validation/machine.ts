import type { Answer, Statechart } from '../statechart.js'

/*
 * Validation: whether a form control's value is acceptable, and when a reader
 * is shown that it is not. The verdict has three sources:
 *
 * - what the control finds wrong with its own value
 * - a message a script sets with `setCustomValidity`
 * - the page's own message, `feedback`
 *
 * A failure shows once the reader has had a go at the field. An edit they
 * commit, a submission that finds the field failing, and a report each give
 * them one. The page's message shows at once, and so does an answer a picker
 * refuses.
 *
 * The machine reaches no form and no platform. Handing the verdict on, firing
 * `invalid`, and pointing the reader at the control are effects. On the web
 * the host performs them through `ElementInternals`, and a form's submission
 * reaches the machine as the go it gives the reader.
 *
 * The host holds the context in its properties and reads the machine from
 * them before each event. The properties a verdict reads, such as `required`,
 * travel with `JUDGE`, which a host sends on every update, as every web
 * control reports its verdict on every update. Each move ends in the state
 * its context reads as, so a host records the mark of the state a move leaves
 * the machine in.
 */

/** A way a value fails, named as the platform's validity flags are. */
export type Flag =
  | 'badInput'
  | 'customError'
  | 'patternMismatch'
  | 'rangeOverflow'
  | 'rangeUnderflow'
  | 'stepMismatch'
  | 'tooLong'
  | 'tooShort'
  | 'typeMismatch'
  | 'valueMissing'

/** Every flag, in the order a verdict lists them. */
export const FLAGS: readonly Flag[] = [
  'badInput',
  'customError',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'typeMismatch',
  'valueMissing',
]

/** What is wrong with a value: the flags it fails and the message to say, or neither. */
export interface Verdict {
  /** The ways the value fails. None means nothing is wrong. */
  flags: readonly Flag[]

  /** The sentence a reader is told, or `''` where nothing is wrong. */
  message: string
}

/** A verdict that finds nothing wrong. */
export const VALID: Verdict = { flags: [], message: '' }

/**
 * What a page's own rule (`validate` on Input and Textarea) answers for a
 * value. A message or a list of them refuses the value, and `true`, `null`, or
 * nothing accepts it.
 */
export type RuleAnswer = string | readonly string[] | true | null | undefined

/** What the machine holds between events. */
export interface ValidationContext {
  /** The message `setCustomValidity` was given, or `''`. */
  custom: string

  /**
   * Whether an answer the control refuses shows before the reader has had a
   * go, as on Color Picker, Date Picker, and Time Picker. A missing answer
   * still waits. Such a control reads its own verdict alone to decide.
   */
  eager: boolean

  /** The page's message for the field (`feedback`), or `''`. */
  feedback: string

  /** Whether a field that wraps the control marks it wrong: a picker's `invalid`. */
  flagged: boolean

  /** What the control found wrong with its own value at the last `JUDGE`. */
  own: Verdict

  /** Whether the reader has had a go at the field. A reset forgets it. */
  touched: boolean
}

/** What an event carries. */
export interface ValidationInput {
  /** For `JUDGE`: whether the control is barred from validation, being read-only or disabled. */
  barred: boolean

  /** For `JUDGE`: what the control's own constraint finds, besides a missing value. */
  constraint: Verdict

  /** For `JUDGE`: whether the control holds nothing, by its own reading. */
  empty: boolean

  /** For `CUSTOM`: the message, or `''` to clear it. */
  message: string

  /** For `JUDGE`: whether the field needs a value (`required`). */
  required: boolean

  /** For `JUDGE`: the page's rule's answer for the value, which the host asks. */
  rule: RuleAnswer

  /** For `JUDGE`: the control's own sentence for a missing value. */
  sentence: string

  /** For `JUDGE`: the page's sentence for a missing value (`value-missing-message`), or `''`. */
  valueMissingMessage: string
}

/** Whether the value is missing: the field needs one, and the control holds nothing. */
export const missing = (required: boolean, empty: boolean): boolean => required && empty

/** The sentence for a missing value: the page's, where it wrote one, or the control's own. */
export const missingSentence = (page: string, own: string): string => (page === '' ? own : page)

/**
 * A rule's answer as one message. A list is joined with spaces, a message
 * stays as it was written, and an answer that accepts the value is `''`.
 */
export const ruleMessage = (answer: RuleAnswer): string => {
  if (typeof answer === 'string') {
    return answer
  }
  return answer !== null && typeof answer === 'object' ? answer.join(' ') : ''
}

/**
 * What the control finds wrong with its own value. Nothing, where it is barred
 * from validation. Then a missing value, then its own constraint, and last the
 * page's rule, which is read only where nothing else is wrong, so a required
 * empty field says its sentence for a missing value first.
 */
export const ownVerdict = (input: ValidationInput): Verdict => {
  if (input.barred) {
    return VALID
  }
  if (missing(input.required, input.empty)) {
    const message = missingSentence(input.valueMissingMessage, input.sentence)
    return { flags: ['valueMissing'], message }
  }
  if (input.constraint.flags.length > 0) {
    return input.constraint
  }
  const message = ruleMessage(input.rule)
  return message === '' ? VALID : { flags: ['customError'], message }
}

/**
 * Lays a message over a verdict, as a custom message or the page's message is
 * laid over what the control finds. The verdict keeps its flags and gains
 * `customError`, and the laid message is the one said. An empty message lays
 * nothing.
 */
export const overlay = (verdict: Verdict, laid: string): Verdict =>
  laid === ''
    ? verdict
    : {
        flags: FLAGS.filter((flag) => flag === 'customError' || verdict.flags.includes(flag)),
        message: laid,
      }

/**
 * The verdict the control stands behind: its own, with the custom message laid
 * over it, or the page's message where no custom message is set.
 */
export const verdictOf = (context: ValidationContext): Verdict =>
  overlay(context.own, context.custom === '' ? context.feedback : context.custom)

/** Whether the verdict finds something wrong, so a form refuses the control. */
export const fails = (context: ValidationContext): boolean => verdictOf(context).flags.length > 0

/** Whether a verdict refuses the value for a reason other than its being missing. */
const refuses = (own: Verdict): boolean =>
  own.flags.length > 0 && !own.flags.includes('valueMissing')

/**
 * Whether a failure shows, as `:state(invalid)` and `aria-invalid`. The page's
 * message and a wrapping field's flag show at once. Otherwise a field shows a
 * failing verdict once the reader has had a go, and an eager control shows an
 * answer it refuses at once and a missing answer once the reader has had a go.
 */
export const shows = (context: ValidationContext): boolean => {
  if (context.flagged || context.feedback !== '') {
    return true
  }
  if (context.eager) {
    return refuses(context.own) || (context.touched && context.own.flags.length > 0)
  }
  return context.touched && fails(context)
}

/**
 * The message shown under the control: the page's message, and otherwise the
 * verdict's, on a field the reader has had a go at. An eager control shows
 * the page's message alone.
 */
export const said = (context: ValidationContext): string => {
  if (context.feedback !== '') {
    return context.feedback
  }
  return context.eager || !context.touched ? '' : verdictOf(context).message
}

/** Whether the reader has not had a go at the field yet. */
export const fresh = (context: ValidationContext): boolean => !context.touched

/** Whether a failure shows once the reader has had a go. */
export const showsOnTouch = (context: ValidationContext): boolean =>
  shows({ ...context, touched: true })

/** Whether a failure still shows once the reader's go is forgotten. */
export const showsOnReset = (context: ValidationContext): boolean =>
  shows({ ...context, touched: false })

/** Takes what the control finds wrong with its value now. */
export const judge = (context: ValidationContext, input: ValidationInput): ValidationContext => ({
  ...context,
  own: ownVerdict(input),
})

/** Takes the message `setCustomValidity` was given. */
export const customize = (
  context: ValidationContext,
  input: ValidationInput,
): ValidationContext => ({ ...context, custom: input.message })

/** Records that the reader has had a go at the field. */
export const touch = (context: ValidationContext): ValidationContext => ({
  ...context,
  touched: true,
})

/** Forgets the reader's go, as a form reset does. */
export const forget = (context: ValidationContext): ValidationContext => ({
  ...context,
  touched: false,
})

/** Whether the verdict finds nothing wrong. */
export const passes = (context: ValidationContext): boolean => !fails(context)

/** Whether a failure shows once the control's verdict is taken again. */
export const showsJudged = (context: ValidationContext, input: ValidationInput): boolean =>
  shows(judge(context, input))

/** Whether a failure shows once the custom message is taken. */
export const showsCustomized = (context: ValidationContext, input: ValidationInput): boolean =>
  shows(customize(context, input))

type State = 'invalid' | 'touched' | 'untouched'

type Event = 'CHECK' | 'CUSTOM' | 'JUDGE' | 'REPORT' | 'RESET' | 'TOUCH'

type Effect = 'announce' | 'apply' | 'point'

type Reply = Answer<State, ValidationContext, ValidationInput, Effect>

/** A new verdict from the control, which the host hands on. */
const judging = { effects: ['apply'], update: judge } as const

/** A new custom message, which the host hands on with the verdict. */
const customizing = { effects: ['apply'], update: customize } as const

/**
 * A report that fails: the host hands the verdict on, `invalid` fires, the
 * reader is pointed at the control, and the reader has had a go.
 */
const reporting = { effects: ['apply', 'announce', 'point'], update: touch } as const

/** A new verdict where nothing shows. A failure it shows marks the field. */
const rejudge: Reply = [{ ...judging, guard: showsJudged, target: 'invalid' }, judging]

/** A new custom message where nothing shows. A failure it shows marks the field. */
const recustom: Reply = [{ ...customizing, guard: showsCustomized, target: 'invalid' }, customizing]

/** A check from a script or a form: `invalid` fires where the verdict fails, and nothing shows. */
const check: Reply = [{ effects: ['announce'], guard: fails }, 'ignore']

/**
 * A report where the reader has had a go or a failure shows already. A
 * passing verdict is handed on alone.
 */
const report: Reply = [{ effects: ['apply'], guard: passes }, reporting]

/** The machine, written once. `validation.generated.ts` is what runs. */
export const validation: Statechart<State, Event, ValidationContext, ValidationInput, Effect> = {
  /* `apply` hands the verdict to what keeps it for the platform: on the web,
     `ElementInternals.setValidity`, anchored where focus can go. `announce`
     fires `invalid` at the control, which the web platform does inside a
     check and a report. `point` shows the reader the failure at the control,
     which is the browser's bubble on the web. */
  effects: ['apply', 'announce', 'point'],
  events: ['JUDGE', 'CUSTOM', 'TOUCH', 'CHECK', 'REPORT', 'RESET'],
  initial: [
    { guard: shows, target: 'invalid' },
    { guard: fresh, target: 'untouched' },
    { target: 'touched' },
  ],
  states: {
    /* A failure shows. A go keeps it shown, and a reset hides it unless the
       page's message, a wrapping field's flag, or a refused answer shows it.
       A verdict or message that shows nothing moves the field to the state
       the reader's go puts it in. */
    invalid: {
      mark: true,
      on: {
        CHECK: check,
        CUSTOM: [
          { ...customizing, guard: showsCustomized },
          { ...customizing, guard: fresh, target: 'untouched' },
          { ...customizing, target: 'touched' },
        ],
        JUDGE: [
          { ...judging, guard: showsJudged },
          { ...judging, guard: fresh, target: 'untouched' },
          { ...judging, target: 'touched' },
        ],
        REPORT: report,
        RESET: [
          { guard: showsOnReset, update: forget },
          { target: 'untouched', update: forget },
        ],
        TOUCH: { update: touch },
      },
    },
    /* The reader has had a go, and nothing shows. A verdict fails here only
       on an eager control with a custom message, and a report of it shows
       nothing. */
    touched: {
      on: {
        CHECK: check,
        CUSTOM: recustom,
        JUDGE: rejudge,
        REPORT: report,
        RESET: { target: 'untouched', update: forget },
        TOUCH: 'ignore',
      },
    },
    /* The reader has not had a go, and a failure waits for one. A report that
       fails gives them one. */
    untouched: {
      on: {
        CHECK: check,
        CUSTOM: recustom,
        JUDGE: rejudge,
        REPORT: [
          { effects: ['apply'], guard: passes },
          { ...reporting, guard: showsOnTouch, target: 'invalid' },
          { ...reporting, target: 'touched' },
        ],
        RESET: 'ignore',
        TOUCH: [
          { guard: showsOnTouch, target: 'invalid', update: touch },
          { target: 'touched', update: touch },
        ],
      },
    },
  },
}
