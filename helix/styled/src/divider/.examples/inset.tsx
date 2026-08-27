import './inset.css'

export function Example() {
  return (
    <helix-flex direction="column" gap="none">
      <helix-list-item>
        <helix-icon name="cube" slot="start"></helix-icon>
        Item One
      </helix-list-item>
      <helix-divider className="row-rule"></helix-divider>
      <helix-list-item>
        <helix-icon name="cube" slot="start"></helix-icon>
        Item Two
      </helix-list-item>
    </helix-flex>
  )
}
