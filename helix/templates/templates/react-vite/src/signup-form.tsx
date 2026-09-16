import { type FormEvent, useState } from 'react'
import { teams } from './data.js'

/** One message in the toast region, and what it says. */
interface Message {
  readonly id: number
  readonly text: string
}

/**
 * The form.
 *
 * **Every control here is a form-associated custom element**, so a `<form>`
 * collects them, resets them and validates them the way it does an `<input>`.
 * That is what `ElementInternals` buys, and the submit below proves it: it reads
 * the answers with `new FormData(form)` and nothing gathers them by hand.
 *
 * There is no wrapping `Field` component. A label in one shadow root cannot name
 * a control in another, so every control renders its own `label`, `hint` and
 * `feedback` instead.
 */
export function SignupForm() {
  const [handle, setHandle] = useState('')
  const [messages, setMessages] = useState<readonly Message[]>([])

  const join = (event: FormEvent<HTMLFormElement>) => {
    /* The page answers this, so nothing navigates. Remove the line and the form
       posts to the server like any other, with the same names. */
    event.preventDefault()
    const answers = [...new FormData(event.currentTarget).entries()]
      .map(([field, value]) => `${field}=${value}`)
      .join('  ')
    setMessages((sent) => [...sent, { id: Date.now(), text: answers }])
  }

  return (
    <helix-flex direction="column" gap="lg">
      <helix-flex direction="column" gap="2xs">
        <helix-text as="h1" variant="heading">
          Join the roster
        </helix-text>
        <helix-text emphasis="muted">
          Submit it and the toast shows what a server would have read.
        </helix-text>
      </helix-flex>

      <form className="form" onSubmit={join}>
        <helix-input autocomplete="name" label="Name" name="name" required />

        {/* Validation is the platform's: `type` and `required` are set on the
            real input inside, and its own message is what shows once the reader
            has touched the field. Set `feedback` to say it in your own words
            instead, and it shows from the first paint rather than after a
            mistake. */}
        <helix-input
          hint="Where we send the welcome note."
          label="Email"
          name="email"
          required
          type="email"
        />

        {/* **A controlled value, which is the one habit to unlearn.** The handler
            is a prop named for the event, so `onhelix-before-change` hears
            `helix-before-change`. A Helix element is not read-only: writing
            `value` seeds it and the element goes on applying its own changes, so
            taking the decision means refusing the change with `preventDefault()`
            and then setting the value you want. Declining to call `setHandle` is
            not a refusal, and leaves the element holding what you did not
            accept. */}
        <helix-input
          hint="Lowercase and hyphens, whatever you type."
          label="Handle"
          name="handle"
          onhelix-before-change={(event) => {
            event.preventDefault()
            setHandle(event.detail.value.toLowerCase().replaceAll(/[^a-z0-9-]/g, ''))
          }}
          value={handle}
        />

        <helix-select label="Team" name="team" placeholder="Pick one" required>
          {teams.map((team) => (
            <helix-option key={team} value={team}>
              {team}
            </helix-option>
          ))}
        </helix-select>

        {/* A switch is a thing happening now rather than an answer a form asks
            for, which is why it says on and off. It still submits, as `on`. */}
        <helix-switch label="Send me the weekly digest" name="digest" />

        <helix-button emphasis="solid" tone="primary" type="submit">
          Join
        </helix-button>
      </form>

      {/* **The region is rendered whether or not there is anything in it.**
          Assistive technology subscribes to a live region, and one that arrives
          already holding its message is frequently never announced. Nothing
          creates or destroys a message here either: the items are state, and a
          dismissed one asks to go through `helix-dismiss`. */}
      <helix-toast>
        {messages.map((message) => (
          <helix-toast-item
            dismissible
            duration={8000}
            key={message.id}
            onhelix-dismiss={() => {
              setMessages((sent) => sent.filter((one) => one.id !== message.id))
            }}
            tone="success"
          >
            <helix-flex direction="column" gap="2xs">
              <helix-text variant="body-strong">Read by the form</helix-text>
              <helix-text variant="code">{message.text}</helix-text>
            </helix-flex>
          </helix-toast-item>
        ))}
      </helix-toast>
    </helix-flex>
  )
}
