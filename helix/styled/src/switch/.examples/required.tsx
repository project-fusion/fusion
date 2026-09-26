export function Example() {
  return (
    <>
      {/* The preview cancels the submit, so the page stays in place. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-switch
            hint="Required before the workspace can be created"
            label="I accept the terms"
            name="terms"
            required
          ></helix-switch>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Create workspace
          </helix-button>
        </helix-flex>
      </form>
    </>
  )
}
