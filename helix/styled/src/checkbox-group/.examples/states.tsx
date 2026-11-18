export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-checkbox-group
        disabled
        hint="Contact an admin to change these."
        label="Email notifications"
        name="a"
        value="one"
      >
        <helix-checkbox value="one">Product updates</helix-checkbox>
        <helix-checkbox value="two">Security alerts</helix-checkbox>
      </helix-checkbox-group>

      {/* The disabled fieldset disables this group. */}
      <fieldset disabled>
        <helix-checkbox-group
          hint="Contact an admin to change these."
          label="SMS notifications"
          name="b"
          value="two"
        >
          <helix-checkbox value="one">Product updates</helix-checkbox>
          <helix-checkbox value="two">Security alerts</helix-checkbox>
        </helix-checkbox-group>
      </fieldset>

      <helix-checkbox-group
        feedback="Choose at least one"
        hint="Pick everything that applies"
        label="Notify me about"
        name="notify"
      >
        <helix-checkbox value="deploys">Deploys</helix-checkbox>
        <helix-checkbox value="incidents">Incidents</helix-checkbox>
        <helix-checkbox value="digest">Weekly digest</helix-checkbox>
      </helix-checkbox-group>

      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-checkbox-group
            hint="Pick at least one"
            label="Alert channels"
            name="channels"
            required
          >
            <helix-checkbox value="email">Email</helix-checkbox>
            <helix-checkbox value="sms">SMS</helix-checkbox>
          </helix-checkbox-group>
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
