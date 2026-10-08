export function Example() {
  return (
    <helix-flex gap="sm">
      <helix-loader label="Saving">
        <helix-button slot="content">Save changes</helix-button>
      </helix-loader>
      <helix-loader
        idle
        label="Saving"
      >
        <helix-button slot="content">Save changes</helix-button>
      </helix-loader>
    </helix-flex>
  )
}
