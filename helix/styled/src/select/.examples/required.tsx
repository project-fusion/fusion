export function Example() {
  return (
    <>
      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-select
            hint="Choose the region closest to your users"
            label="Region"
            name="region"
            required
          >
            <helix-icon
              name="caret-down"
              slot="indicator"
            ></helix-icon>
            <helix-option value="us-east-1">us-east-1</helix-option>
            <helix-option value="eu-west-2">eu-west-2</helix-option>
          </helix-select>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Create project
          </helix-button>
        </helix-flex>
      </form>
    </>
  )
}
