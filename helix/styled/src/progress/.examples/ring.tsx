export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="lg"
    >
      <helix-progress
        label="Uploading"
        shape="ring"
        show-value
        value={68}
      ></helix-progress>
      <helix-progress
        indeterminate
        label="Syncing"
        shape="ring"
      ></helix-progress>
      <helix-progress
        label="Storage"
        shape="ring"
        show-value
        style={{ '--progress-ring-size': '6rem', '--progress-ring-width': '0.75rem' }}
        value={42}
      ></helix-progress>
    </helix-flex>
  )
}
