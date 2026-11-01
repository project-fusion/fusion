import type { HelixPagination } from '@fusion.dev/helix'

/**
 * What a Solid app writes: attributes, properties, enum values, slots, and
 * typed events, in the plain form and as `prop:`, `attr:`, and `on:`.
 */
export function Good() {
  let pagination: HelixPagination | undefined
  const switched = (checked: boolean) => checked

  return (
    <>
      <helix-button
        emphasis="solid"
        on:helix-press={(event) => event.detail.pointerType}
        prop:tone="danger"
        type="submit"
        width="full"
      >
        Delete
      </helix-button>
      <helix-switch
        prop:checked
        on:helix-before-check={(event) => {
          if (!switched(event.detail.checked)) {
            event.preventDefault()
          }
        }}
        name="alerts"
      >
        Alerts
        <span slot="hint">Sent to your email.</span>
      </helix-switch>
      <helix-pagination
        attr:default-page="2"
        onhelix-navigate={(event) => event.detail.page}
        page-size={20}
        ref={pagination}
        prop:total={120}
      />
      <helix-tabs
        active="billing"
        on:helix-before-select={(event) => event.detail.value}
        marker="underlined"
        orientation="vertical"
      >
        <helix-tab value="billing">Billing</helix-tab>
        <helix-tab-panel value="billing">Invoices</helix-tab-panel>
      </helix-tabs>
      <helix-code-block on:helix-check={(event) => event.detail.checked} line-numbers wrap>
        <code>bun add @fusion.dev/helix</code>
      </helix-code-block>
    </>
  )
}

const element = document.createElement('helix-switch')
element.addEventListener('helix-before-check', (event) => event.detail.checked)
