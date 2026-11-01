import type { HelixPagination } from '@fusion.dev/helix'
import { useRef } from 'react'

/** What a React app writes: attributes, properties, enum values, slots, and typed events. */
export function Good() {
  const pagination = useRef<HelixPagination>(null)
  const switched = (checked: boolean) => checked

  return (
    <>
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
        onhelix-before-check={(event) => {
          if (!switched(event.detail.checked)) {
            event.preventDefault()
          }
        }}
      >
        Alerts
        <span slot="hint">Sent to your email.</span>
      </helix-switch>
      <helix-pagination
        default-page="2"
        onhelix-navigate={(event) => event.detail.page}
        page-size={20}
        ref={pagination}
        total={120}
      />
      <helix-tabs
        active="billing"
        marker="underlined"
        onhelix-before-select={(event) => event.detail.value}
        orientation="vertical"
      >
        <helix-tab value="billing">Billing</helix-tab>
        <helix-tab-panel value="billing">Invoices</helix-tab-panel>
      </helix-tabs>
      <helix-code-block line-numbers onhelix-check={(event) => event.detail.checked} wrap>
        <code>bun add @fusion.dev/helix</code>
      </helix-code-block>
    </>
  )
}

const element = document.createElement('helix-switch')
element.addEventListener('helix-before-check', (event) => event.detail.checked)
