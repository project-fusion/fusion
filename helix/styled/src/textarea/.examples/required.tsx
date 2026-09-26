export function Example() {
  return (
    <>
      {/* The preview cancels the submit, so the page stays in place. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-textarea
            hint="Include the steps that led to the problem"
            label="What happened"
            name="report"
            placeholder="What did you expect to happen?"
            required
          ></helix-textarea>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Send report
          </helix-button>
        </helix-flex>
      </form>
    </>
  )
}
