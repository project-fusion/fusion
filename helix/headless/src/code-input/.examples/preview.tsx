import './preview.css'

const PAYLOAD = `{
  "event": "order.paid",
  "retries": 3
}`

export function Example() {
  return (
    <helix-headless-code-input
      hint="Sent as the body of every request."
      label="Webhook payload"
      language="json"
      value={PAYLOAD}
    ></helix-headless-code-input>
  )
}
