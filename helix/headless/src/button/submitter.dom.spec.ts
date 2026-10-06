import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { type Carried, submitAs } from './submitter.js'

beforeAll(() => {
  registerDom()
})

const carried = (over: Partial<Carried> = {}): Carried => ({
  formAction: '',
  formEnctype: '',
  formMethod: '',
  formNoValidate: false,
  formTarget: '',
  name: '',
  value: '',
  ...over,
})

describe('submitting through a stand-in', () => {
  test('hands the form a native submit button carrying the name, value and overrides', () => {
    document.body.innerHTML = '<form action="/base"></form>'
    const form = document.querySelector('form') as HTMLFormElement
    let seen: HTMLButtonElement | undefined
    form.requestSubmit = (submitter?: HTMLElement | null) => {
      seen = submitter as HTMLButtonElement
      expect(seen.form).toBe(form)
    }
    submitAs(form, carried({ formMethod: 'post', formNoValidate: true, name: 'go', value: 'now' }))
    expect(seen?.type).toBe('submit')
    expect(seen?.getAttribute('formmethod')).toBe('post')
    expect(seen?.formNoValidate).toBe(true)
    expect([seen?.name, seen?.value]).toEqual(['go', 'now'])
    expect(form.getAttribute('action')).toBe('/base')
  })

  test('takes the stand-in out even when the submission throws', () => {
    document.body.innerHTML = '<form></form>'
    const form = document.querySelector('form') as HTMLFormElement
    form.requestSubmit = () => {
      throw new Error('refused')
    }
    expect(() => submitAs(form, carried())).toThrow('refused')
    expect(form.children).toHaveLength(0)
  })
})
