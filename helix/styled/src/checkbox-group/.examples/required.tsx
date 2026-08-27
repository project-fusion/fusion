export function Example() {
  return (
    <>
      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex direction="column" gap="sm">
          <helix-checkbox-group
            hint="Pick everything that applies"
            label="Notify me about"
            name="notify"
            required
          >
            <helix-checkbox value="deploys">Deploys</helix-checkbox>
            <helix-checkbox value="incidents">Incidents</helix-checkbox>
          </helix-checkbox-group>
          <helix-button emphasis="solid" tone="primary" type="submit">
            Save
          </helix-button>
        </helix-flex>
      </form>
    </>
  )
}
