import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

/**
 * The label, hint, feedback and validity contract every form control inherits.
 *
 * 467 lines mixed into every field in the library, and the parts worth asking
 * about directly are the three that no single component's spec covers, because
 * each component only ever exercises its own path through them: which message
 * wins, which description a control points at, and when a corrected field stops
 * showing the error it had.
 */
type Field = HTMLElement & {
  feedback: string
  hint: string
  label: string
  required: boolean
  updateComplete: Promise<boolean>
  // internal, and the reason this is asked here rather than through a component
  describedBy: string | undefined
  resolvedFeedback: string
  reportRequired(empty: boolean, message: string, anchor: string): void
  refreshFeedback(): void
  internals: ElementInternals
}

const tag = 'probe-field'
const looseTag = 'probe-field-loose'

beforeAll(async () => {
  registerDom()
  const { HelixFormElement } = await import('../../helix-form-element/helix-form-element.js')
  const { HelixElement } = await import('../../helix-element/helix-element.js')
  const { MixinField } = await import('./mixin-field.js')
  customElements.define(tag, class extends MixinField(HelixFormElement) {})
  /* Not form-associated, which is a real shape here: a group whose members each
     submit themselves is asked about its own validity and would throw. */
  customElements.define(looseTag, class extends MixinField(HelixElement) {})
})

const field = async (attrs = '', name = tag): Promise<Field> => {
  document.body.innerHTML = `<${name} ${attrs}></${name}>`
  const host = document.body.firstElementChild as Field
  await host.updateComplete
  return host
}

describe('which message a field shows', () => {
  test('the consumer’s, when they set one', async () => {
    const host = await field('feedback="Pick a color"')
    expect(host.resolvedFeedback).toBe('Pick a color')
  })

  /* The consumer's wins outright, even over a platform verdict, because they
     said something specific about their own form and the browser said something
     generic about an input. */
  test('and theirs beats the platform’s', async () => {
    const host = await field('feedback="Pick a color" required')
    host.internals.setValidity({ valueMissing: true }, 'Please fill in this field')
    expect(host.resolvedFeedback).toBe('Pick a color')
  })

  /* Nothing until the reader has had a go at it. A form that greets somebody
     with errors before they have typed is a form scolding them for arriving. */
  test('nothing at all before the field has been touched', async () => {
    const host = await field('required')
    host.internals.setValidity({ valueMissing: true }, 'Please fill in this field')
    expect(host.resolvedFeedback).toBe('')
  })

  test('and nothing when the platform is content', async () => {
    const host = await field()
    host.internals.setValidity({})
    expect(host.resolvedFeedback).toBe('')
  })
})

describe('a control that cannot be asked about validity', () => {
  /* `validity` and `validationMessage` throw `NotSupportedError` on an element
     that is not form-associated, so the mixin reads the static the platform
     itself reads rather than probing. Such a control still shows a message, it
     just has to be given one. */
  test('shows the message it is given and never asks the platform', async () => {
    const host = await field('feedback="Choose one"', looseTag)
    expect(host.resolvedFeedback).toBe('Choose one')
  })

  test('and shows nothing rather than throwing when it is given none', async () => {
    const host = await field('required', looseTag)
    expect(() => host.resolvedFeedback).not.toThrow()
    expect(host.resolvedFeedback).toBe('')
  })
})

describe('what the control is described by', () => {
  test('the hint, when there is one and nothing is wrong', async () => {
    const host = await field('hint="Two letters"')
    expect(host.describedBy).toBeDefined()
  })

  test('nothing, when there is neither', async () => {
    expect((await field()).describedBy).toBeUndefined()
  })

  /* One at a time, because only one of the two is ever rendered. Naming both
     would point a screen reader at an id resolving to nothing, which it reads
     as a description it cannot find. */
  test('and the feedback rather than the hint once there is a message', async () => {
    const host = await field('hint="Two letters" feedback="Wrong"')
    const withMessage = host.describedBy
    const other = (await field('hint="Two letters"')).describedBy
    expect(withMessage).not.toBe(other)
    expect(withMessage).toBeDefined()
  })
})

describe('being required', () => {
  test('reports a missing value with the sentence it was given', async () => {
    const host = await field('required')
    host.reportRequired(true, 'Tick this box', 'control')
    expect(host.internals.validity.valueMissing).toBe(true)
    expect(host.internals.validationMessage).toBe('Tick this box')
  })

  test('and clears it once the control is no longer empty', async () => {
    const host = await field('required')
    host.reportRequired(true, 'Tick this box', 'control')
    host.reportRequired(false, 'Tick this box', 'control')
    expect(host.internals.validity.valueMissing).toBeFalsy()
  })

  test('a field that is not required reports nothing however empty it is', async () => {
    const host = await field()
    host.reportRequired(true, 'Tick this box', 'control')
    expect(host.internals.validity.valueMissing).toBeFalsy()
  })
})
