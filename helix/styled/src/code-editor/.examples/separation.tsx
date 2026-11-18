const NOTES = `Ship the invoice export on Friday.
Ask the design team about the empty state.`

const TODO = `Review the pull request for the settings page.
Update the release notes.`

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-code-editor
        label="notes.txt"
        rows={4}
        value={NOTES}
      ></helix-code-editor>

      <helix-code-editor
        label="todo.txt"
        rows={4}
        separation="plain"
        value={TODO}
      ></helix-code-editor>
    </helix-flex>
  )
}
