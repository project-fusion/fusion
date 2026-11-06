import { afterEach, describe, expect, test } from 'bun:test'
import { fakeForm } from '../../capabilities/form/fake.js'
import { setForm } from '../../capabilities/form/index.js'
import { serverForm } from '../../capabilities/form/server.js'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import { run } from '../runner.js'
import { validationHost } from './host.js'
import { VALID, type ValidationContext, type ValidationInput } from './machine.js'
import * as validation from './validation.generated.js'

afterEach(() => {
  setForm(serverForm)
})

/** A field the reader has not had a go at, with nothing wrong. */
const FRESH: ValidationContext = {
  custom: '',
  eager: false,
  feedback: '',
  flagged: false,
  own: VALID,
  touched: false,
}

/** An event's input, with the fields it reads given and the rest finding nothing wrong. */
const input = (fields: Partial<ValidationInput> = {}): ValidationInput => ({
  barred: false,
  constraint: VALID,
  empty: false,
  message: '',
  required: false,
  rule: undefined,
  sentence: 'Fill out this field.',
  valueMissingMessage: '',
  ...fields,
})

/** A required field left empty. */
const EMPTY = input({ empty: true, required: true })

/**
 * Runs validation on a control named `field` whose anchor is `input`, with a
 * fake form. `heard` keeps each verdict the form is given and each call to
 * the family, in the order they came.
 */
const validate = (context: ValidationContext = FRESH) => {
  const heard: string[] = []
  const given = fakeForm<string>()
  setForm<string>({
    ...given,
    validity: (node, flags, message, anchor) => {
      heard.push(flags.length === 0 ? 'passes' : `fails: ${message}`)
      given.validity(node, flags, message, anchor)
    },
  })
  const runner = run(
    validation,
    context,
    validationHost<string>({
      anchor: () => 'input',
      control: () => 'field',
      invalid: () => heard.push('invalid'),
      point: () => heard.push('point'),
    }),
    { ask: () => true, timers: fakeTimers() },
  )
  return { given, heard, runner }
}

describe('validationHost', () => {
  test('hands the form each verdict the control finds, at the control and pointing at its anchor', () => {
    const { given, heard, runner } = validate()
    runner.send(validation.EVENT_JUDGE, EMPTY)
    runner.send(validation.EVENT_JUDGE, input({ required: true }))
    expect(given.validities).toEqual([
      { anchor: 'input', flags: ['valueMissing'], message: 'Fill out this field.', node: 'field' },
      { anchor: 'input', flags: [], message: '', node: 'field' },
    ])
    expect(heard).toEqual(['fails: Fill out this field.', 'passes'])
  })

  test('lays a custom message over the verdict it hands the form', () => {
    const { given, runner } = validate()
    runner.send(validation.EVENT_CUSTOM, input({ message: 'Pick another name.' }))
    expect(given.validities.map(({ flags, message }) => ({ flags, message }))).toEqual([
      { flags: ['customError'], message: 'Pick another name.' },
    ])
  })

  test('hands a failing verdict on, fires invalid, and points the reader at the control, in order, for a report', () => {
    const { heard, runner } = validate()
    runner.send(validation.EVENT_JUDGE, EMPTY)
    runner.send(validation.EVENT_REPORT, input())
    expect(heard).toEqual([
      'fails: Fill out this field.',
      'fails: Fill out this field.',
      'invalid',
      'point',
    ])
    expect(runner.state()).toBe(validation.STATE_INVALID)
  })

  test('fires invalid and shows the reader nothing for a check that fails', () => {
    const { heard, runner } = validate()
    runner.send(validation.EVENT_JUDGE, EMPTY)
    runner.send(validation.EVENT_CHECK, input())
    expect(heard).toEqual(['fails: Fill out this field.', 'invalid'])
    expect(runner.state()).toBe(validation.STATE_UNTOUCHED)
  })

  test('hands a passing verdict on alone for a report', () => {
    const { heard, runner } = validate()
    runner.send(validation.EVENT_REPORT, input())
    expect(heard).toEqual(['passes'])
  })

  test('fires no invalid and shows the reader nothing once stopped', () => {
    const { heard, runner } = validate()
    runner.send(validation.EVENT_JUDGE, EMPTY)
    runner.stop()
    runner.send(validation.EVENT_CHECK, input())
    runner.send(validation.EVENT_REPORT, input())
    expect(heard).toEqual(['fails: Fill out this field.'])
  })
})
