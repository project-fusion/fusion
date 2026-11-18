const HEADERS = `{
  "Accept": "application/json"
}`

const RESPONSE = `{
  "id": "evt_1042",
  "status": "delivered"
}`

const PAYLOAD = '{ "event": "order.paid", }'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-code-input
        disabled
        hint="Managed by your admin."
        label="Default headers"
        language="json"
        value={HEADERS}
      ></helix-code-input>

      <helix-code-input
        hint="Generated from your last request."
        label="Response body"
        language="json"
        name="response"
        readonly
        value={RESPONSE}
      ></helix-code-input>

      <helix-code-input
        feedback="Remove the comma after the last entry."
        hint="Sent as the body of every request."
        label="Webhook payload"
        language="json"
        name="payload"
        value={PAYLOAD}
      ></helix-code-input>

      {/* The form does not submit in the preview. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-code-input
            hint="Applied to the banner on every page."
            label="Custom styles"
            language="css"
            name="styles"
            required
          ></helix-code-input>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Save
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
