export function Example() {
  return (
    <helix-dialog default-open label="Unsaved changes" persistent>
      <p>Two edits have not been saved. Closing now discards them.</p>
      <helix-flex gap="sm" slot="footer">
        <helix-button>Discard</helix-button>
        <helix-button emphasis="solid" tone="primary">
          Save
        </helix-button>
      </helix-flex>
    </helix-dialog>
  )
}
