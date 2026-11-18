export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-switch
        default-checked
        disabled
        hint="Managed by your organization"
        label="Email notifications"
        name="a"
      ></helix-switch>

      {/* The disabled fieldset around it disables this field. */}
      <fieldset disabled>
        <helix-switch
          hint="Managed by your organization"
          label="Text message notifications"
          name="b"
        ></helix-switch>
      </fieldset>

      <helix-switch
        default-checked
        hint="Only owners can turn off two-step sign-in"
        label="Two-step sign-in"
        name="two-step"
        readonly
      ></helix-switch>

      <helix-switch
        feedback="Turn on payment alerts to continue"
        hint="Sends an email when a payment fails"
        label="Payment alerts"
        name="alerts"
      ></helix-switch>

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
    </helix-flex>
  )
}
