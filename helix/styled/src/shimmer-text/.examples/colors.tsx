import './colors.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-text
        as="p"
        scale="title"
      >
        <helix-shimmer-text className="info">Searching the workspace</helix-shimmer-text>
      </helix-text>
      <helix-text
        as="p"
        scale="title"
      >
        <helix-shimmer-text className="success">Syncing your changes</helix-shimmer-text>
      </helix-text>
    </helix-flex>
  )
}
