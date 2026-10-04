import { createSignal, For, type JSX } from 'solid-js'
import { teams } from './data.ts'
import { DOCS } from './docs.ts'

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
 * nothing gathers them by hand.
 *
 * There is no wrapping `Field` component. A label in one shadow root cannot
 * name a control in another, so every control renders its own `label`, `hint`,
 * and `feedback`.
 */
export function SignupForm() {
  const [handle, setHandle] = createSignal('')
  const [messages, setMessages] = createSignal<readonly Message[]>([])

  const join: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (event) => {
    /* The page takes the submit, so nothing navigates. Remove the line and the
       form posts to the server like any other, with the same names. */
    event.preventDefault()
    const answers = [...new FormData(event.currentTarget).entries()]
      .map(([field, value]) => `${field}=${value}`)
      .join('  ')
    setMessages((sent) => [...sent, { id: Date.now(), text: answers }])
  }

  return (
    <div class="stack">
      <header class="hero">
        <helix-text emphasis="muted" variant="label">
          Form
        </helix-text>
        <helix-text as="h1" variant="heading">
          Join the roster
        </helix-text>
        <helix-text as="p" class="lede" emphasis="muted" variant="body">
          Five controls, and a <helix-code>&lt;form&gt;</helix-code> reads every one of them the way
          it reads an <helix-code>input</helix-code>.
        </helix-text>
      </header>

      {/* The form takes a column of its own and the notes take what is left.
          At 390 the two stack, and the notes read as a postscript. */}
      <div class="split">
      <form class="form" onSubmit={join}>
        <helix-input autocomplete="name" label="Name" name="name" required />

        {/* Validation is the platform's: `type` and `required` are set on the
            real input inside, and its own message shows once the reader has
            touched the field. Set `feedback` to say it in your own words. */}
        <helix-input
          hint="Where we send the welcome note."
          label="Email"
          name="email"
          required
          type="email"
        />

        {/* **A controlled value, which is the one habit to unlearn.** `on:` binds
            the event by its own name. A Helix element is not read-only: writing
            `value` seeds it, and the element goes on applying its own changes.
            So taking the decision means refusing the change with
            `preventDefault()`, then setting the value you want. Leaving
            `handle` as it was does not refuse anything. */}
        <helix-input
          hint="Lowercase and hyphens, whatever you type."
          label="Handle"
          name="handle"
          on:helix-before-change={(event) => {
            event.preventDefault()
            setHandle(event.detail.value.toLowerCase().replaceAll(/[^a-z0-9-]/g, ''))
          }}
          value={handle()}
        />

        <helix-select label="Team" name="team" placeholder="Pick one" required>
          <For each={teams}>{(team) => <helix-option value={team}>{team}</helix-option>}</For>
        </helix-select>

        {/* A switch is a thing happening now, which is why it says on and off.
            It still submits, as `on`. */}
        <helix-switch label="Send me the weekly digest" name="digest" />

        <helix-button emphasis="solid" tone="primary" type="submit">
          Join
        </helix-button>
      </form>

        <aside class="notes">
          {/* The one fact you need before typing your name into a page you have
              had for five minutes, so it is a callout. `tone` is the meaning,
              and the component draws it with a tint and a bar on the inline
              start, so it survives being read in grayscale. */}
          <helix-callout tone="info">
            Nothing is posted anywhere. Submit it and the message shows exactly what a server would
            have been handed.
          </helix-callout>
          <helix-text as="h2" variant="title">
            What this is showing
          </helix-text>
          <helix-text as="p" emphasis="muted" variant="body">
            Every control is a form-associated custom element, so the submit reads them with{' '}
            <helix-code>new FormData(form)</helix-code> and nothing gathers the answers by hand.
            Reset the form and they all go back, the way an <helix-code>input</helix-code> does.
          </helix-text>
          <helix-text as="p" emphasis="muted" variant="body">
            Leave the email wrong and the complaint is the browser's own, in the reader's language.
            Handle is the controlled one: it refuses the change and writes back what it will accept.
          </helix-text>
          <a data-link href={DOCS.forms}>
            Forms
          </a>
        </aside>
      </div>

      {/* **The region is rendered whether or not there is anything in it.**
          Assistive technology subscribes to a live region, and one that
          arrives already holding its message is often never announced. A
          dismissed message asks to go through `helix-dismiss`. */}
      <helix-toast>
        <For each={messages()}>
          {(message) => (
            <helix-toast-item
              dismissible
              duration={8000}
              on:helix-dismiss={() => {
                setMessages((sent) => sent.filter((one) => one.id !== message.id))
              }}
              tone="success"
            >
              <helix-flex direction="column" gap="2xs">
                <helix-text variant="body-strong">Read by the form</helix-text>
                <helix-text variant="code">{message.text}</helix-text>
              </helix-flex>
            </helix-toast-item>
          )}
        </For>
      </helix-toast>
    </div>
  )
}
