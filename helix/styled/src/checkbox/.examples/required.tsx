export function Example() {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <helix-flex
        direction="column"
        gap="sm"
      >
        <helix-checkbox
          hint="Hint"
          label="Label"
          name="option"
          required
          value="accepted"
        ></helix-checkbox>
        <helix-button
          emphasis="solid"
          tone="primary"
          type="submit"
        >
          Submit
        </helix-button>
      </helix-flex>
    </form>
  )
}
