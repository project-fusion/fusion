export function Example() {
  return (
    <helix-flex gap="sm">
      <helix-button
        disabled
        emphasis="solid"
        tone="primary"
      >
        Save changes
      </helix-button>
      <helix-button disabled>Cancel</helix-button>

      {/* The disabled fieldset disables this button. */}
      <fieldset disabled>
        <helix-button emphasis="ghost">Reset</helix-button>
      </fieldset>
    </helix-flex>
  )
}
