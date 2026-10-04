import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core'
import { teams } from './data'
import { DOCS } from './docs'

/** One message in the toast region, and what it says. */
interface Message {
  readonly id: number
  readonly text: string
}

/**
 * The form.
 *
 * **Every control here is a form-associated custom element**, so a `<form>`
 * collects them, resets them, and validates them the way it does an `<input>`.
 * The submit proves it: it reads the answers with `new FormData(form)`, and
 * nothing gathers them by hand. No `FormsModule` is involved.
 *
 * There is no wrapping `Field` component. A label in one shadow root cannot
 * name a control in another, so every control renders its own `label`, `hint`,
 * and `feedback`.
 */
@Component({
  host: { class: 'stack' },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'div[app-signup-form]',
  templateUrl: './signup-form.html',
})
export class SignupForm {
  protected readonly docs = DOCS
  protected readonly teams = teams
  protected readonly handle = signal('')
  protected readonly messages = signal<readonly Message[]>([])

  /**
   * The page takes the submit, so nothing navigates. Remove `preventDefault()`
   * and the form posts to the server like any other, with the same names.
   */
  protected join(event: SubmitEvent): void {
    event.preventDefault()
    const answers = [...new FormData(event.currentTarget as HTMLFormElement).entries()]
      .map(([field, value]) => `${field}=${value}`)
      .join('  ')
    this.messages.update((sent) => [...sent, { id: Date.now(), text: answers }])
  }

  /**
   * **A controlled value, which is the one habit to unlearn.** A Helix element
   * is not read-only: writing `value` seeds it, and the element goes on
   * applying its own changes. So taking the decision means refusing the change
   * with `preventDefault()`, then setting the value you want. Leaving `handle`
   * as it was does not refuse anything.
   *
   * No typings ship for Angular, so the event's detail is named here.
   */
  protected takeHandle(event: Event): void {
    event.preventDefault()
    const { value } = (event as CustomEvent<{ value: string }>).detail
    this.handle.set(value.toLowerCase().replaceAll(/[^a-z0-9-]/g, ''))
  }

  protected dismiss(id: number): void {
    this.messages.update((sent) => sent.filter((one) => one.id !== id))
  }
}
