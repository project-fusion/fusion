export function Example() {
  return (
    <>
      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-textarea
            hint="We read every one"
            label="What happened"
            name="report"
            placeholder="Start with what you expected"
            required
          ></helix-textarea>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Send
          </helix-button>
        </helix-flex>
      </form>
    </>
  )
}
