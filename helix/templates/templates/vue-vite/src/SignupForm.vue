<script setup lang="ts">
import type { HelixInputHelixBeforeChangeElementEvent } from '@fusion.dev/helix/vue'
import { ref } from 'vue'
import { teams } from './data.ts'
import { DOCS } from './docs.ts'

/** One message in the toast region, and what it says. */
interface Message {
  readonly id: number
  readonly text: string
}

const handle = ref('')
const messages = ref<readonly Message[]>([])

/**
 * The page takes the submit, so nothing navigates. Remove `preventDefault()`
 * and the form posts to the server like any other, with the same names.
 */
const join = (event: Event) => {
  event.preventDefault()
  const answers = [...new FormData(event.currentTarget as HTMLFormElement).entries()]
    .map(([field, value]) => `${field}=${value}`)
    .join('  ')
  messages.value = [...messages.value, { id: Date.now(), text: answers }]
}

/**
 * **A controlled value, which is the one habit to unlearn.** A Helix element
 * is not read-only: writing `value` seeds it, and the element goes on applying
 * its own changes. So taking the decision means refusing the change with
 * `preventDefault()`, then setting the value you want. Leaving `handle` as it
 * was does not refuse anything.
 */
const takeHandle = (event: HelixInputHelixBeforeChangeElementEvent) => {
  event.preventDefault()
  handle.value = event.detail.value.toLowerCase().replaceAll(/[^a-z0-9-]/g, '')
}

const dismiss = (id: number) => {
  messages.value = messages.value.filter((one) => one.id !== id)
}
</script>

<!--
  The form.

  **Every control here is a form-associated custom element**, so a `<form>`
  collects them, resets them, and validates them the way it does an `<input>`.
  The submit proves it: it reads the answers with `new FormData(form)`, and
  nothing gathers them by hand.

  There is no wrapping `Field` component. A label in one shadow root cannot
  name a control in another, so every control renders its own `label`, `hint`,
  and `feedback`.
-->
<template>
  <div class="stack">
    <header class="hero">
      <helix-text emphasis="muted" variant="label">Form</helix-text>
      <helix-text as="h1" variant="heading">Join the roster</helix-text>
      <helix-text as="p" class="lede" emphasis="muted" variant="body">
        Five controls, and a <helix-code>&lt;form&gt;</helix-code> reads every one of them the way
        it reads an <helix-code>input</helix-code>.
      </helix-text>
    </header>

    <!-- The form takes a column of its own and the notes take what is left. At
         390 the two stack, and the notes read as a postscript. -->
    <div class="split">
      <form class="form" @submit="join">
        <helix-input autocomplete="name" label="Name" name="name" required />

        <!-- Validation is the platform's: `type` and `required` are set on the
             real input inside, and its own message shows once the field has been
             touched. Set `feedback` to say it in your own words. -->
        <helix-input
          hint="Where we send the welcome note."
          label="Email"
          name="email"
          required
          type="email"
        />

        <!-- `@helix-before-change` binds with `addEventListener`, so it takes
             the event's own name. -->
        <helix-input
          hint="Lowercase and hyphens, whatever you type."
          label="Handle"
          name="handle"
          :value="handle"
          @helix-before-change="takeHandle"
        />

        <helix-select label="Team" name="team" placeholder="Pick one" required>
          <helix-option v-for="team in teams" :key="team" :value="team">{{ team }}</helix-option>
        </helix-select>

        <!-- A switch is a thing happening now, which is why it says on and off.
             It still submits, as `on`. -->
        <helix-switch label="Send me the weekly digest" name="digest" />

        <helix-button emphasis="solid" tone="primary" type="submit">Join</helix-button>
      </form>

      <aside class="notes">
        <!-- The one fact you need before typing your name into a page you have
             had for five minutes, so it is a callout. `neutral` is a note that
             reports no status, drawn in the muted ink with a bar on the inline
             start, so it stays in the palette, ink or brand. -->
        <helix-callout tone="neutral">
          The form posts nothing. Submit it, and a message shows exactly what a server would
          receive.
        </helix-callout>
        <helix-text as="h2" variant="title">What the form shows</helix-text>
        <helix-text as="p" emphasis="muted" variant="body">
          Every control is a form-associated custom element, so the submit reads them all with
          <helix-code>new FormData(form)</helix-code>. Reset the form and they all go back,
          the way an <helix-code>input</helix-code> does.
        </helix-text>
        <helix-text as="p" emphasis="muted" variant="body">
          Leave the email wrong and the browser shows its own message, in your language. Handle is
          the controlled field: the page refuses each change and writes back a cleaned value.
        </helix-text>
        <a data-link :href="DOCS.forms">Forms</a>
      </aside>
    </div>

    <!-- **The region is rendered whether or not there is anything in it.**
         Assistive technology subscribes to a live region, and one that arrives
         already holding its message is often never announced. A dismissed
         message asks to go through `helix-dismiss`. -->
    <helix-toast>
      <helix-toast-item
        v-for="message in messages"
        :key="message.id"
        dismissible
        :duration="8000"
        tone="success"
        @helix-dismiss="dismiss(message.id)"
      >
        <helix-flex direction="column" gap="2xs">
          <helix-text variant="body-strong">Read by the form</helix-text>
          <helix-text variant="code">{{ message.text }}</helix-text>
        </helix-flex>
      </helix-toast-item>
    </helix-toast>
  </div>
</template>
