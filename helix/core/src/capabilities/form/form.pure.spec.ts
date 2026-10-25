import { afterEach, describe, expect, test } from 'bun:test'
import { fakeForm } from './fake.js'
import { form, setForm } from './index.js'
import { serverForm } from './server.js'

afterEach(() => {
  setForm(serverForm)
})

/** A part as a spec stands one in: any value works as a node for the fake. */
interface Part {
  readonly name: string
}

describe('form', () => {
  test('is the server implementation until one is set', () => {
    expect(form()).toBe(serverForm)
  })

  test('calls the implementation set last', () => {
    const fake = fakeForm<Part>()
    const field = { name: 'field' }
    setForm(fake)
    form().value(field, 'Ada')
    expect(fake.values).toEqual([{ node: field, value: 'Ada' }])
  })
})

describe('serverForm', () => {
  test('does nothing with a value, a verdict, or a submission', () => {
    const field = { name: 'field' }
    expect(serverForm.value(field, 'Ada')).toBeUndefined()
    expect(serverForm.validity(field, ['valueMissing'], 'Enter your name', null)).toBeUndefined()
    expect(serverForm.submit(field)).toBeUndefined()
  })
})

describe('fakeForm', () => {
  test('keeps each value in order, and no value as `null`', () => {
    const fake = fakeForm<Part>()
    const field = { name: 'field' }
    fake.value(field, 'Ad')
    fake.value(field, 'Ada')
    fake.value(field, null)
    expect(fake.values.map((given) => given.value)).toEqual(['Ad', 'Ada', null])
  })

  test('keeps each verdict in order, with its flags, message, and anchor', () => {
    const fake = fakeForm<Part>()
    const field = { name: 'field' }
    const control = { name: 'control' }
    fake.validity(field, ['valueMissing'], 'Enter your name', control)
    fake.validity(field, [], '', null)
    expect(fake.validities).toEqual([
      { anchor: control, flags: ['valueMissing'], message: 'Enter your name', node: field },
      { anchor: null, flags: [], message: '', node: field },
    ])
  })

  test('keeps a copy of the flags, so a list changed after the call does not change the record', () => {
    const fake = fakeForm<Part>()
    const field = { name: 'field' }
    const flags: ('tooLong' | 'tooShort')[] = ['tooShort']
    fake.validity(field, flags, 'Use at least 4 characters', null)
    flags.push('tooLong')
    expect(fake.validities[0]?.flags).toEqual(['tooShort'])
  })

  test('keeps each node whose form was submitted, in order', () => {
    const fake = fakeForm<Part>()
    const first = { name: 'first' }
    const second = { name: 'second' }
    fake.submit(first)
    fake.submit(second)
    expect(fake.submitted).toEqual([first, second])
  })
})
