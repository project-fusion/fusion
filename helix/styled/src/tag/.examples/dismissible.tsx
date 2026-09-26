export function Example() {
  return (
    <>
      <helix-tag
        dismiss-label="Remove the Open filter"
        dismissible
      >
        Open
      </helix-tag>{' '}
      <helix-tag
        dismissible
        tone="primary"
      >
        Assigned to me
      </helix-tag>
    </>
  )
}
