const PAYLOAD = `{
  "event": "order.paid",
  "retries": 3,
  "notify": true
}`

export function Example() {
  return (
    <helix-code-input
      hint="Sent as the body of every request."
      label="Webhook payload"
      language="json"
      value={PAYLOAD}
    ></helix-code-input>
  )
}
