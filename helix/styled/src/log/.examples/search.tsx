import { useState } from 'react'

export function Example() {
  const [query, setQuery] = useState('')

  return (
    <helix-log
      label="Server log"
      line-numbers
      query={query}
    >
      <helix-input
        aria-label="Search the log"
        onhelix-before-change={(event) => setQuery(event.detail.value)}
        placeholder="Search the log"
        slot="toolbar"
        type="search"
      />
      <helix-log-line>GET /api/orders 200 in 41ms</helix-log-line>
      <helix-log-line>GET /api/orders/1182 200 in 18ms</helix-log-line>
      <helix-log-line level="warn">POST /api/checkout 429 in 3ms: rate limited</helix-log-line>
      <helix-log-line>GET /api/products?page=2 200 in 77ms</helix-log-line>
      <helix-log-line level="error">
        POST /api/checkout 500 in 812ms: payment provider timed out
      </helix-log-line>
      <helix-log-line>GET /api/orders 200 in 39ms</helix-log-line>
      <helix-log-line>POST /api/checkout 201 in 264ms</helix-log-line>
      <helix-log-line>GET /healthz 200 in 1ms</helix-log-line>
    </helix-log>
  )
}
