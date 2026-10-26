<script lang="ts">
/* What a Svelte app writes: attributes, properties, enum values, slots, and typed events. */
import type { HelixPagination } from '@fusion.dev/helix'

let pagination: HelixPagination | undefined = $state()
const switched = (checked: boolean) => checked
const total = () => pagination?.total
</script>

<helix-button
  emphasis="solid"
  onhelix-press={(event) => event.detail.pointerType}
  tone="danger"
  type="submit"
  width="full"
>
  Delete
</helix-button>
<helix-switch
  checked
  name="alerts"
  onhelix-before-check={(event) => switched(event.detail.checked) || event.preventDefault()}
>
  Alerts
  <span slot="hint">Sent to your email.</span>
</helix-switch>
<helix-pagination
  bind:this={pagination}
  default-page="2"
  onhelix-navigate={(event) => event.detail.page ?? total()}
  page-size={20}
  total={120}
></helix-pagination>
<helix-tabs
  active="billing"
  onhelix-before-select={(event) => event.detail.value}
  orientation="vertical"
  variant="underlined"
>
  <helix-tab value="billing">Billing</helix-tab>
  <helix-tab-panel value="billing">Invoices</helix-tab-panel>
</helix-tabs>
<helix-code-block line-numbers onhelix-check={(event) => event.detail.checked} wrap>
  <code>bun add @fusion.dev/helix</code>
</helix-code-block>
