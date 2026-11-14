import { describe, expect, test } from 'bun:test'
import { type Compiled, conforms, coverage, effectNames } from '../conformance.js'
import {
  fails,
  said,
  VALID,
  type ValidationContext,
  type ValidationInput,
  type Verdict,
  validation,
  verdictOf,
} from './machine.js'
import * as validity from './validation.generated.js'

const compiled: Compiled<ValidationContext, ValidationInput> = validity

const MISSING: Verdict = { flags: ['valueMissing'], message: 'Fill this in.' }
const REFUSED: Verdict = { flags: ['rangeOverflow'], message: 'Choose a time before noon.' }

/** A context with nothing set but what a case names. */
const field = (over: Partial<ValidationContext> = {}): ValidationContext => ({
  custom: '',
  eager: false,
  feedback: '',
  flagged: false,
  own: VALID,
  touched: false,
  ...over,
})

/** An eager picker's context with nothing set but what a case names. */
const picker = (over: Partial<ValidationContext> = {}): ValidationContext =>
  field({ eager: true, ...over })

/** An input with nothing set but what a case names. */
const given = (over: Partial<ValidationInput> = {}): ValidationInput => ({
  barred: false,
  constraint: VALID,
  empty: false,
  message: '',
  required: false,
  rule: undefined,
  sentence: 'Fill this in.',
  valueMissingMessage: '',
  ...over,
})

/* Every context the machine tells apart. Each pairs a custom message or none,
   a field or an eager picker, the page's message or none, a wrapping field's
   flag or none, a verdict that passes, misses, or refuses, and a reader who
   has had a go or not. The inputs take each branch of the control's own
   verdict, and one carries a custom message. */
const contexts: ValidationContext[] = ['', 'Taken.'].flatMap((custom) =>
  [false, true].flatMap((eager) =>
    ['', 'Pick one.'].flatMap((feedback) =>
      [false, true].flatMap((flagged) =>
        [VALID, MISSING, REFUSED].flatMap((own) =>
          [false, true].map((touched) => ({ custom, eager, feedback, flagged, own, touched })),
        ),
      ),
    ),
  ),
)
const inputs: ValidationInput[] = [
  given(),
  given({ empty: true, required: true }),
  given({ empty: true, required: true, valueMissingMessage: 'Obligatoire.' }),
  given({ barred: true, empty: true, required: true }),
  given({ constraint: { flags: ['tooShort'], message: 'Too short.' } }),
  given({ rule: ['Too short.', 'Taken.'] }),
  given({ message: 'Taken.' }),
]

/** Every guard the machine's answers name. */
const GUARDS = [
  'fails',
  'fresh',
  'passes',
  'showsCustomized',
  'showsJudged',
  'showsOnReset',
  'showsOnTouch',
]

describe('the compiled validation module', () => {
  test('answers every event in every state as the machine does', () => {
    expect(conforms(validation, compiled, contexts, inputs)).toEqual([])
  })

  test('is walked through every state and both answers of every guard', () => {
    const reached = coverage(validation, contexts, inputs)
    const answers = GUARDS.flatMap((guard) => [`${guard} false`, `${guard} true`])
    expect(reached).toEqual(new Set([...validity.STATES, ...answers]))
  })

  test('marks the state that shows a failure, and no other', () => {
    expect(validity.STATES.map((_, state) => validity.mark(state))).toEqual([['invalid'], [], []])
  })
})

type Step = [event: number, input?: Partial<ValidationInput>]

/**
 * Sends events as a host does: starts in the state the context reads as, and
 * keeps the state and the context each move leaves. Returns those, the names
 * of the effects the moves ran in order, and the marks the host records.
 */
const host = (context: ValidationContext, ...steps: Step[]) => {
  let held = context
  let state = validity.start(context)
  const effects: string[] = []
  for (const [event, input] of steps) {
    const move = validity.step(state, held, event, given(input))
    if (move === undefined || 'ask' in move) {
      continue
    }
    held = move.context
    state = move.state
    effects.push(...effectNames(compiled, move.effects))
  }
  return { context: held, effects, marks: validity.mark(state), state: validity.STATES[state] }
}

const {
  EVENT_CHECK: CHECK,
  EVENT_CUSTOM: CUSTOM,
  EVENT_JUDGE: JUDGE,
  EVENT_REPORT: REPORT,
  EVENT_RESET: RESET,
  EVENT_TOUCH: TOUCH,
} = validity

const empty: Step = [JUDGE, { empty: true, required: true }]
const answered: Step = [JUDGE, { required: true }]

/* Restated from helix-form-element.dom.spec.ts. */
describe('the verdict a control stands behind', () => {
  /* "reads the platform’s verdict, as a native control does". */
  test('passes with no message where nothing is wrong', () => {
    expect(verdictOf(host(field(), [JUDGE]).context)).toEqual(VALID)
  })

  /* "setCustomValidity marks it invalid with the words it was given". */
  test('takes a custom message as a custom error in its words, and hands it on', () => {
    const { context, effects } = host(field(), [CUSTOM, { message: 'That name is taken.' }])
    expect(verdictOf(context)).toEqual({ flags: ['customError'], message: 'That name is taken.' })
    expect(effects).toEqual(['apply'])
  })

  /* "and the control’s next report keeps it, beside its own flags". */
  test('keeps a custom message over the control’s next verdict, beside its flags', () => {
    const { context } = host(field(), [CUSTOM, { message: 'That name is taken.' }], empty)
    expect(verdictOf(context).flags).toEqual(['customError', 'valueMissing'])
    expect(verdictOf(context).message).toBe('That name is taken.')
  })

  /* "an empty message clears it and the control’s own verdict stands". */
  test('clears a custom message with an empty one, and the control’s verdict stands', () => {
    const { context } = host(field(), empty, [CUSTOM, { message: 'Taken.' }], [CUSTOM])
    expect(verdictOf(context)).toEqual(MISSING)
  })

  /* "feedback on a field": "marks it invalid, so the form does not submit" and "and clearing
     it lets the form submit again". */
  test('takes the page’s message as a custom error, and passes once it is cleared', () => {
    const marked = field({ feedback: 'That name is taken.' })
    expect(verdictOf(marked)).toEqual({ flags: ['customError'], message: 'That name is taken.' })
    expect(fails({ ...marked, feedback: '' })).toBe(false)
  })

  /* "is valid until a custom message says otherwise, and valid again once it is cleared", on a
     control that reports no verdict of its own. */
  test('fails for a custom message alone on a control with no verdict of its own', () => {
    const set = host(field(), [CUSTOM, { message: 'Pick a plan first.' }])
    expect(verdictOf(set.context).message).toBe('Pick a plan first.')
    expect(host(set.context, [CHECK]).effects).toEqual(['announce'])
    expect(fails(host(set.context, [CUSTOM]).context)).toBe(false)
  })
})

describe('what a control finds wrong with its own value', () => {
  const judged = (input: Partial<ValidationInput>): Verdict =>
    host(field(), [JUDGE, input]).context.own

  /* mixin-field.dom.spec.ts: "being required", all three cases. */
  test('a required empty value is missing, and nothing else is', () => {
    const tick = judged({ empty: true, required: true, sentence: 'Tick this box' })
    expect(tick).toEqual({ flags: ['valueMissing'], message: 'Tick this box' })
    expect(judged({ required: true })).toEqual(VALID)
    expect(judged({ empty: true })).toEqual(VALID)
  })

  /* input-controlled.dom.spec.ts: "a required, empty field raises the page’s sentence, and the
     browser’s otherwise". */
  test('says the page’s sentence for a missing value, and its own otherwise', () => {
    const missing = { empty: true, required: true, sentence: 'Please fill in this field.' }
    expect(judged({ ...missing, valueMissingMessage: 'Obligatoire.' }).message).toBe('Obligatoire.')
    expect(judged(missing).message).toBe('Please fill in this field.')
  })

  /* input-root.dom.spec.ts: "read-only, holding text its type refuses, is valid" and "disabled
     after the fact, with a pattern it misses, is valid, and valid again is checked again". */
  test('finds nothing wrong while it is barred, and judges again once it is not', () => {
    const constraint: Verdict = { flags: ['patternMismatch'], message: 'Match the format.' }
    const barred = host(field(), [JUDGE, { barred: true, constraint, empty: true, required: true }])
    expect(fails(barred.context)).toBe(false)
    expect(verdictOf(host(barred.context, [JUDGE, { constraint }]).context)).toEqual(constraint)
  })

  /* own-rule.dom.spec.ts: "marks the field with its message, or its messages joined". */
  test('takes the page’s rule as a custom error, its messages joined', () => {
    expect(judged({ rule: 'Too short.' })).toEqual({
      flags: ['customError'],
      message: 'Too short.',
    })
    const joined = judged({ rule: ['Too short.', 'Needs a digit.'] })
    expect(joined).toEqual({ flags: ['customError'], message: 'Too short. Needs a digit.' })
  })

  /* own-rule.dom.spec.ts: "accepts with true, null or nothing, and says nothing". */
  test('takes nothing from a rule that accepts', () => {
    for (const rule of [true, null, undefined, '', []] as const) {
      expect(judged({ rule })).toEqual(VALID)
    }
  })

  /* own-rule.dom.spec.ts: "is not asked while the browser finds the value wrong", and
     input-root.dom.spec.ts: "a list of messages is said as one, and the browser speaks first". */
  test('reads the rule only where nothing else is wrong', () => {
    const rule = ['Too short.', 'Taken.']
    const tooShort: Verdict = { flags: ['tooShort'], message: 'Use 4 characters.' }
    expect(judged({ empty: true, required: true, rule })).toEqual(MISSING)
    expect(judged({ constraint: tooShort, rule })).toEqual(tooShort)
    expect(judged({ required: true, rule }).message).toBe('Too short. Taken.')
  })

  /* input-root.dom.spec.ts: "validate runs on every change and its message is the verdict". */
  test('judges the rule again on every update', () => {
    const short = host(field(), [JUDGE, { rule: 'Use four characters or more.' }])
    expect(verdictOf(short.context).message).toBe('Use four characters or more.')
    expect(short.effects).toEqual(['apply'])
    expect(verdictOf(host(short.context, [JUDGE, { rule: true }]).context)).toEqual(VALID)
  })
})

describe('when a field shows a failure', () => {
  /* mixin-field.dom.spec.ts: "the consumer’s, when they set one" and "and theirs beats the
     platform’s". */
  test('shows the page’s message at once, over the verdict’s', () => {
    const { context, marks } = host(field({ feedback: 'Pick a color' }), empty)
    expect([marks, said(context)]).toEqual([['invalid'], 'Pick a color'])
  })

  /* mixin-field.dom.spec.ts: "nothing at all before the field has been touched", and
     checkbox-root.dom.spec.ts: "says nothing before the reader has had a go at it". */
  test('shows nothing before the reader has had a go', () => {
    const { context, state } = host(field(), empty)
    expect([state, said(context)]).toEqual(['untouched', ''])
  })

  /* mixin-field.dom.spec.ts: "and nothing when the platform is content". */
  test('shows nothing where the verdict passes', () => {
    const { context, state } = host(field(), answered, [TOUCH])
    expect([state, said(context)]).toEqual(['touched', ''])
  })

  /* checkbox-root.dom.spec.ts: "a failed submission puts the message in the hint’s place", and
     chat-composer.dom.spec.ts: "and one the reader emptied by hand is marked when left". */
  test('shows the verdict’s message once a submission or an edit gives the reader a go', () => {
    const missing: Step = [JUDGE, { empty: true, required: true, sentence: 'Tick this box.' }]
    const { context, effects, marks } = host(field(), missing, [TOUCH])
    expect([marks, said(context)]).toEqual([['invalid'], 'Tick this box.'])
    expect(effects).toEqual(['apply'])
  })

  /* checkbox-root.dom.spec.ts: "answering it takes the message away again". */
  test('stops showing it once the control is answered', () => {
    const { context, state } = host(field(), empty, [TOUCH], answered)
    expect([state, said(context)]).toEqual(['touched', ''])
  })

  /* field-invalid.dom.spec.ts: "checkValidity() fires invalid and shows nothing", and
     "form.checkValidity() fires invalid on each field and marks none". */
  test('a check fires invalid and shows nothing', () => {
    const judged = host(field(), empty).context
    const { context, effects, state } = host(judged, [CHECK])
    expect([fails(context), effects, state]).toEqual([true, ['announce'], 'untouched'])
    expect(host(host(field(), answered).context, [CHECK]).effects).toEqual([])
  })

  /* field-invalid.dom.spec.ts: "reportValidity() shows the message". */
  test('a report hands the verdict on, fires invalid, points at the control, and shows it', () => {
    const judged = host(field(), empty).context
    const { context, effects, marks } = host(judged, [REPORT])
    expect(effects).toEqual(['apply', 'announce', 'point'])
    expect([marks, said(context)]).toEqual([['invalid'], 'Fill this in.'])
    expect(host(host(field(), answered).context, [REPORT]).effects).toEqual(['apply'])
  })

  /* radio-group.dom.spec.ts: "a reset forgets the failed attempt along with the answer", and
     chat-composer.dom.spec.ts: "a reset takes the mark away". */
  test('a reset forgets the reader’s go, so an empty field shows nothing again', () => {
    const { context, state } = host(field(), empty, [TOUCH], answered, [RESET], empty)
    expect([state, said(context)]).toEqual(['untouched', ''])
  })

  /* field-invalid.dom.spec.ts: "the control it describes says it is invalid" and "and stops
     saying so when the message goes". */
  test('marks a field showing the page’s message, and stops once the message goes', () => {
    const { context, marks } = host(field({ feedback: 'Too short' }), [JUDGE])
    expect(marks).toEqual(['invalid'])
    expect(host({ ...context, feedback: '' }, [JUDGE]).marks).toEqual([])
  })
})

/* Restated from mixin-picker-feedback.dom.spec.ts. */
describe('when a picker shows a failure', () => {
  /* "is a message under it, a verdict the form reads, and a mark on it". */
  test('takes the page’s message as its line, its verdict, and its mark', () => {
    const { context, marks } = host(picker({ feedback: 'Pick a weekday' }), [JUDGE])
    expect(verdictOf(context)).toEqual({ flags: ['customError'], message: 'Pick a weekday' })
    expect([marks, said(context)]).toEqual([['invalid'], 'Pick a weekday'])
  })

  /* "marks the picker as `invalid` does, and both go with it". */
  test('is marked by a wrapping field’s flag, which leaves its verdict passing', () => {
    const { context, marks } = host(picker({ flagged: true }), [JUDGE])
    expect([marks, fails(context), said(context)]).toEqual([['invalid'], false, ''])
    expect(host({ ...context, flagged: false }, [JUDGE]).state).toBe('untouched')
  })

  /* "marks a refused answer at once". */
  test('marks an answer it refuses at once', () => {
    expect(host(picker(), [JUDGE, { constraint: REFUSED }]).marks).toEqual(['invalid'])
  })

  /* "marks a missing answer once a form has refused it, until a reset", and
     time-picker-root.dom.spec.ts: "a missing time waits until a form refuses it, and a reset
     forgets that". */
  test('marks a missing answer once a form refuses it, until a reset', () => {
    const waiting = host(picker(), empty)
    expect(waiting.state).toBe('untouched')
    const refused = host(waiting.context, [TOUCH])
    expect(refused.marks).toEqual(['invalid'])
    expect(host(refused.context, [RESET]).state).toBe('untouched')
  })

  /* "and once the reader has committed an answer". */
  test('and once the reader has committed an answer', () => {
    expect(host(picker(), empty, [TOUCH]).marks).toEqual(['invalid'])
  })
})

/* The old format had no effects on a move, so a verdict taken again, a check,
   and a report each entered a state of its own for its effects, and the host
   read the field's mark from the context again. Each move now runs its
   effects and ends where the field rests, which `host` keeps. */
describe('a move that judges, checks, or reports', () => {
  /* time-picker-root.dom.spec.ts: "a time past a bound is marked at once, on the list and as a
     state", and mixin-field.ts, which sets `:state(invalid)` again on every update. */
  test('hands the verdict on and ends marked where it shows a failure', () => {
    const refused = host(picker(), [JUDGE, { constraint: REFUSED }])
    expect([refused.effects, refused.marks]).toEqual([['apply'], ['invalid']])
    const still = host(field({ own: MISSING, touched: true }), empty)
    expect([still.effects, still.marks]).toEqual([['apply'], ['invalid']])
  })

  /* field-invalid.dom.spec.ts: "reportValidity() shows the message", and
     color-picker-root.dom.spec.ts: "a required picker with no color is marked once a form refuses
     it, and not before". */
  test('fires invalid, points at the control, and ends marked where a report fails', () => {
    const { effects, marks } = host(picker({ own: MISSING }), [REPORT])
    expect([effects, marks]).toEqual([['apply', 'announce', 'point'], ['invalid']])
  })

  /* field-invalid.dom.spec.ts: "checkValidity() fires invalid and shows nothing". */
  test('fires invalid and ends where the field was where a check fails', () => {
    const shown = host(field({ own: MISSING, touched: true }), [CHECK])
    expect([shown.effects, shown.marks]).toEqual([['announce'], ['invalid']])
    const waiting = host(field({ own: MISSING }), [CHECK])
    expect([waiting.effects, waiting.state]).toEqual([['announce'], 'untouched'])
  })

  /* mixin-field.ts and mixin-picker-feedback.ts set `:state(invalid)` from the field's
     properties on every update, which is the state its context reads as. */
  test('ends in the state its context reads as, so a host records the mark of that state', () => {
    const parted = contexts.flatMap((context) =>
      [...validity.EVENTS.keys()].flatMap((event) =>
        inputs.flatMap((input) => {
          const move = validity.step(validity.start(context), context, event, input)
          return move && 'state' in move && validity.start(move.context) !== move.state
            ? [move]
            : []
        }),
      ),
    )
    expect(parted).toEqual([])
  })
})
