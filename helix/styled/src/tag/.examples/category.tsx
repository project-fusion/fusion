export function Example() {
  return (
    <helix-flex gap="xs">
      <helix-tag>
        <span slot="start">Priority</span>
        High
      </helix-tag>
      <helix-tag tone="info">
        <span slot="start">Env</span>
        Staging
      </helix-tag>
      <helix-tag
        dismissible
        tone="success"
      >
        <span slot="start">Owner</span>
        Ada
      </helix-tag>
    </helix-flex>
  )
}
