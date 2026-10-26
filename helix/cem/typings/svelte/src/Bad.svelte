<script lang="ts">
/* What a Svelte app must not be able to write, each line under the guard that says why. */
import type { HelixButton } from '@fusion.dev/helix'

// @ts-expect-error: a removed event class
type Removed = import('@fusion.dev/helix').HelixToggleEvent

// @ts-expect-error: an internal coordination member
const focusable = (button: HelixButton) => button.focusable

const element = document.createElement('helix-switch')
// @ts-expect-error: a misspelled event, which has no typed detail
element.addEventListener('helix-before-chek', (event) => event.detail.checked)
// @ts-expect-error: a removed event name
element.addEventListener('helix-toggle', (event) => event.detail.checked)
</script>

<!-- @expect-error: a value outside the enum -->
<helix-button emphasis="loud"></helix-button>
<!-- @expect-error: a misspelled property -->
<helix-switch chekced></helix-switch>
<!-- @expect-error: a misspelled event -->
<helix-switch onhelix-before-chek={(event: Event) => event}></helix-switch>
<!-- @expect-error: a removed event name -->
<helix-switch onhelix-before-toggle={(event: Event) => event}></helix-switch>
<!-- @expect-error: a detail field the event does not carry -->
<helix-switch onhelix-before-check={(event) => event.detail.value}></helix-switch>
<!-- @expect-error: a word for a numeric attribute -->
<helix-pagination default-page="abc"></helix-pagination>
<!-- @expect-error: an internal coordination member -->
<helix-button focusable></helix-button>
