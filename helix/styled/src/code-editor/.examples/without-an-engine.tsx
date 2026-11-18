const NOTES = `Connect CodeMirror for highlighting, line numbers and folding.
Without it, Tab types two spaces and Command+F finds.`

export function Example() {
  return (
    <helix-code-editor
      label="notes.txt"
      value={NOTES}
    ></helix-code-editor>
  )
}
