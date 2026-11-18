export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-textarea
        default-value="Cannot be edited"
        disabled
        hint="Locked after the order ships"
        label="Order notes"
      ></helix-textarea>

      {/* The disabled fieldset around it disables this field. */}
      <fieldset disabled>
        <helix-textarea
          default-value="Also cannot be edited"
          hint="Locked after the order ships"
          label="Gift message"
        ></helix-textarea>
      </fieldset>

      <helix-textarea
        default-value={'helix/styled  built in 1.4s\ncortex/core  built in 0.8s'}
        hint="Generated from the run"
        label="Build log"
        name="log"
        readonly
      ></helix-textarea>

      <helix-textarea
        default-value="broken"
        feedback="Enter at least 20 characters"
        hint="Describe the problem"
        label="Description"
      ></helix-textarea>

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
    </helix-flex>
  )
}
