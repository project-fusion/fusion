export function Example() {
  return (
    <>
      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex direction="column" gap="sm">
          <helix-input
            hint="We only use this to reply"
            label="Email"
            name="email"
            placeholder="name@example.com"
            required
            type="email"
          ></helix-input>
          <helix-button emphasis="solid" tone="primary" type="submit">
            Submit
          </helix-button>
        </helix-flex>
      </form>
    </>
  )
}
