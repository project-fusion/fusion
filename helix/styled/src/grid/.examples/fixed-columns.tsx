export function Example() {
  return (
    <helix-grid
      columns={3}
      gap="sm"
    >
      <helix-card separation="outlined">Drafts</helix-card>
      <helix-card separation="outlined">In review</helix-card>
      <helix-card separation="outlined">Published</helix-card>
    </helix-grid>
  )
}
