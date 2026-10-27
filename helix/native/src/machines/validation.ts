import { validationHost } from '@fusion.dev/helix-core/machines/validation/host'
import {
  passes,
  said,
  shows,
  VALID,
  type ValidationContext,
  type ValidationInput,
  type Verdict,
} from '@fusion.dev/helix-core/machines/validation/machine'
import { TEXT_SENTENCES, textVerdict } from '@fusion.dev/helix-core/machines/validation/text'
import * as validation from '@fusion.dev/helix-core/machines/validation/validation.generated'
import { type Ref, useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, camel, given } from './props'
import { useMachine } from './use-machine'

/** What a form control's ref offers beside its props, as a field's handle does. */
export interface FieldHandle {
  /**
   * Shows what is wrong with the answer, as the web's `reportValidity()`
   * does: a missing answer shows its message from now on, and the answer
   * is acceptable where it returns `true`.
   */
  readonly validate: () => boolean
}

/** What validation reads of the element beside its props: whether its answer is missing now. */
export interface Answered {
  /** Whether the answer is missing: an unchecked box, an empty field, or a set with nothing chosen. */
  readonly empty: boolean
  /**
   * The text a field holds, and whether the reader typed it, which its own
   * constraint reads: its length, its pattern, and its type.
   */
  readonly text?: { readonly edited: boolean; readonly value: string } | undefined
}

/** What validation gives the element: its mark while a failure shows, and how a change touches it. */
export interface Judged {
  readonly behavior: Behavior
  /** Records that the reader has had a go at the control, as a change does. */
  readonly touch: () => void
}

/** The text a prop holds, where it holds text. Words passed in as content are no message. */
const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/** A count a prop holds, where it holds a whole number. */
const countOf = (value: unknown): number | undefined => {
  const count = typeof value === 'string' && value !== '' ? Number(value) : value
  return typeof count === 'number' && Number.isInteger(count) ? count : undefined
}

/**
 * What a field's own constraint finds wrong with its text, from the props the
 * form binds: its length, its pattern, and its type, worked out again only as
 * one of them or the text changes. Nothing, where the element has no field.
 */
const useConstraint = (
  family: Family,
  props: Props,
  use: MachineUse,
  text: Answered['text'],
): Verdict => {
  const maxLength = countOf(given(family, props, boundTo(use, 'maxlength', 'prop')))
  const minLength = countOf(given(family, props, boundTo(use, 'minlength', 'prop')))
  const pattern = textOf(given(family, props, boundTo(use, 'pattern', 'prop')))
  const type = textOf(given(family, props, boundTo(use, 'type', 'prop')))
  const edited = text?.edited === true
  const value = text?.value
  return useMemo(
    () =>
      value === undefined
        ? VALID
        : textVerdict({ edited, maxLength, minLength, pattern, type, value }),
    [edited, maxLength, minLength, pattern, type, value],
  )
}

/**
 * Hosts validation on a form control, as the expansion binds it: the prop
 * that makes an answer required, the page's own message, and the page's
 * sentence for a missing answer, with the props that bar the control from
 * validation.
 *
 * **The verdict is the web's**, from core's validation machine: a missing
 * answer shows once the reader has had a go at the control, which a change
 * gives them and `validate()` does too, and the page's message shows at
 * once. While a failure shows, the element is marked `invalid`, which its
 * styles and its tree read as the web reads `:state(invalid)`.
 *
 * **The form capability is given nothing to submit**, since on a phone the
 * app owns its forms, and `validate()` on the element's ref returns whether
 * its answer is acceptable.
 */
export const useValidation = (
  family: Family,
  props: Props,
  use: MachineUse,
  answered: Answered,
): Judged => {
  const required = given(family, props, boundTo(use, 'required', 'prop')) === true
  const feedback = textOf(given(family, props, boundTo(use, 'feedback', 'prop')))
  const missingProp = boundTo(use, 'missing', 'prop')
  const page = textOf(missingProp === undefined ? undefined : props[camel(missingProp)])
  /* A field whose web element says the browser's sentence says Helix's. */
  const own = textOf(given(family, {}, missingProp))
  const sentence = own === '' && answered.text !== undefined ? TEXT_SENTENCES.missing : own
  const constraint = useConstraint(family, props, use, answered.text)
  const barred =
    given(family, props, boundTo(use, 'disabled', 'prop')) === true ||
    given(family, props, boundTo(use, 'readonly', 'prop')) === true
  const input: ValidationInput = {
    barred,
    constraint,
    empty: answered.empty,
    message: '',
    required,
    rule: undefined,
    sentence,
    valueMissingMessage: page,
  }
  const machine = useMachine<ValidationContext, ValidationInput, 'announce' | 'apply' | 'point'>(
    validation,
    {
      custom: '',
      eager: false,
      feedback,
      flagged: false,
      own: VALID,
      touched: false,
    },
    validationHost<null>({
      anchor: () => null,
      control: () => null,
      invalid: () => undefined,
      point: () => undefined,
    }),
    () => true,
  )
  const { context, revise, send } = machine
  const latest = useRef(input)
  latest.current = input
  /* The verdict is taken again whenever what it reads changes, as the web
     element reports it on every update. */
  const { empty } = answered
  useLayoutEffect(() => {
    revise((held) => ({ ...held, feedback }))
    send(validation.EVENT_JUDGE, {
      barred,
      constraint,
      empty,
      message: '',
      required,
      rule: undefined,
      sentence,
      valueMissingMessage: page,
    })
  }, [barred, constraint, empty, feedback, page, required, revise, send, sentence])
  const touch = useCallback(() => send(validation.EVENT_TOUCH, latest.current), [send])
  const validate = useCallback((): boolean => {
    send(validation.EVENT_JUDGE, latest.current)
    send(validation.EVENT_REPORT, latest.current)
    const { barred: off, constraint: own, empty, required: needed } = latest.current
    return passes({
      ...context,
      feedback,
      own: off ? VALID : needed && empty ? { flags: ['valueMissing'], message: '' } : own,
    })
  }, [context, feedback, send])
  useImperativeHandle(props.ref as Ref<FieldHandle> | undefined, () => ({ validate }), [validate])
  /* The sentence under the control, which the tree reads by the name the
     form gives it, while a failure shows. */
  const message = boundTo(use, 'message', 'state')
  const saying = shows(context) ? said(context) : ''
  return {
    behavior: {
      marks: machine.marks,
      parts: message === undefined ? {} : { host: { states: { [message]: saying } } },
    },
    touch,
  }
}
