import './ring.css'

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
        className="storage"
        label="Storage"
        shape="ring"
        show-value
        value={42}
      ></helix-progress>
    </helix-flex>
  )
}
