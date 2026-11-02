export function Example() {
  return (
    <helix-flex gap="xs">
      <helix-tag>
        <helix-text slot="start">Priority</helix-text>
        High
      </helix-tag>
      <helix-tag tone="info">
        <helix-text slot="start">Plan</helix-text>
        Pro
      </helix-tag>
      <helix-tag
        dismissible
        tone="success"
      >
        <helix-text slot="start">Owner</helix-text>
        Alex
      </helix-tag>
    </helix-flex>
  )
}
