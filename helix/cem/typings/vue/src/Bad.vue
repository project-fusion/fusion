<script setup lang="ts">
/* What a Vue app must not be able to write, each line under the guard that says why. */
import type { HelixButton } from '@fusion.dev/helix'

// @ts-expect-error: a removed event class
export type Removed = import('@fusion.dev/helix').HelixToggleEvent

// @ts-expect-error: an internal coordination member
export const focusable = (button: HelixButton) => button.focusable

const element = document.createElement('helix-switch')
// @ts-expect-error: a misspelled event, which has no typed detail
element.addEventListener('helix-before-chek', (event) => event.detail.checked)
// @ts-expect-error: a removed event name
element.addEventListener('helix-toggle', (event) => event.detail.checked)
</script>

<template>
  <!-- @vue-expect-error: a value outside the enum -->
  <helix-button emphasis="loud" />
  <!-- @vue-expect-error: a misspelled property -->
  <helix-switch chekced />
  <!-- @vue-expect-error: a misspelled event -->
  <helix-switch @helix-before-chek="(event: Event) => event" />
  <!-- @vue-expect-error: a removed event name -->
  <helix-switch @helix-before-toggle="(event: Event) => event" />
  <!-- @vue-expect-error: a detail field the event does not carry -->
  <helix-switch @helix-before-check="(event) => event.detail.value" />
  <!-- @vue-expect-error: a word for a numeric attribute -->
  <helix-pagination default-page="abc" />
  <!-- @vue-expect-error: an internal coordination member -->
  <helix-button focusable />
</template>
