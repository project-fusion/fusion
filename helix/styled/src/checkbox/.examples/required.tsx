export function Example() {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <helix-flex
        direction="column"
        gap="sm"
      >
        <helix-checkbox
          hint="Read the policy before you continue."
          label="I agree to the privacy policy"
          name="option"
          required
          value="accepted"
        ></helix-checkbox>
        <helix-button
          emphasis="solid"
          tone="primary"
          type="submit"
        >
          Create account
        </helix-button>
      </helix-flex>
    </form>
  )
}
