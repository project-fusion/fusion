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
    </helix-flex>
  )
}
