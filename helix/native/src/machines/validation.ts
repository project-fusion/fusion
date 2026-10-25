import { validationHost } from '@fusion.dev/helix-core/machines/validation/host'
import {
  passes,
  VALID,
  type ValidationContext,
  type ValidationInput,
} from '@fusion.dev/helix-core/machines/validation/machine'
import * as validation from '@fusion.dev/helix-core/machines/validation/validation.generated'
import { type Ref, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react'
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
  /** Whether the answer is missing: an unchecked box, or a set with nothing chosen. */
  readonly empty: boolean
}

/** What validation gives the element: its mark while a failure shows, and how a change touches it. */
export interface Judged {
  readonly behavior: Behavior
  /** Records that the reader has had a go at the control, as a change does. */
  readonly touch: () => void
}

/** The text a prop holds, where it holds text. Words passed in as content are no message. */
const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

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
  const sentence = textOf(given(family, {}, missingProp))
  const barred =
    given(family, props, boundTo(use, 'disabled', 'prop')) === true ||
    given(family, props, boundTo(use, 'readonly', 'prop')) === true
  const input: ValidationInput = {
    barred,
    constraint: VALID,
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
      constraint: VALID,
      empty,
      message: '',
      required,
      rule: undefined,
      sentence,
      valueMissingMessage: page,
    })
  }, [barred, empty, feedback, page, required, revise, send, sentence])
  const touch = useCallback(() => send(validation.EVENT_TOUCH, latest.current), [send])
  const validate = useCallback((): boolean => {
    send(validation.EVENT_JUDGE, latest.current)
    send(validation.EVENT_REPORT, latest.current)
    const { empty, required: needed } = latest.current
    return passes({
      ...context,
      feedback,
      own:
        needed && empty && !latest.current.barred
          ? { flags: ['valueMissing'], message: '' }
          : VALID,
    })
  }, [context, feedback, send])
  useImperativeHandle(props.ref as Ref<FieldHandle> | undefined, () => ({ validate }), [validate])
  return {
    behavior: { marks: machine.marks, parts: {} },
    touch,
  }
}
