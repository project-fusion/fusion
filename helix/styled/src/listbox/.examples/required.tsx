export function Example() {
  return (
    <>
      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-listbox
            hint="What they will be able to do"
            label="Role"
            name="role"
            required
          >
            <helix-option value="viewer">Viewer</helix-option>
            <helix-option value="editor">Editor</helix-option>
          </helix-listbox>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Send invitation
          </helix-button>
        </helix-flex>
      </form>
    </>
  )
}
