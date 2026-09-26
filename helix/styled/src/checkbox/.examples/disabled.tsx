export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-checkbox
        default-checked
        disabled
        name="a"
      >
        Email notifications
      </helix-checkbox>

      {/* The disabled fieldset disables this checkbox. */}
      <fieldset disabled>
        <helix-checkbox name="b">SMS notifications</helix-checkbox>
      </fieldset>
    </helix-flex>
  )
}
