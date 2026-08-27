export function Example() {
  return (
    <helix-flex direction="column" gap="sm">
      <helix-checkbox indeterminate>Select all</helix-checkbox>
      <helix-checkbox default-checked>Drafts</helix-checkbox>
      <helix-checkbox>Published</helix-checkbox>
    </helix-flex>
  )
}
